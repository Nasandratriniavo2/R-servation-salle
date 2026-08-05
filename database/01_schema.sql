-- ============================================================================
-- SalleLibre — Schéma de base de données PostgreSQL / Supabase
-- Fichier : 01_schema.sql
-- Objet   : création de l'intégralité des tables, types, contraintes,
--           index et triggers nécessaires à l'application (Sprints 1 et 2).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 0. Extensions requises
-- ----------------------------------------------------------------------------
-- uuid-ossp  : génération des identifiants UUID.
-- btree_gist : nécessaire pour créer une contrainte EXCLUDE combinant une
--              égalité (salle_id) et un chevauchement de plage temporelle
--              (periode), utilisée pour le moteur anti-conflit.
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "btree_gist";

-- ----------------------------------------------------------------------------
-- 1. Types énumérés
-- ----------------------------------------------------------------------------

-- Statuts possibles d'une réservation (US-01, US-02, US-03, US-05, US-12).
CREATE TYPE statut_reservation AS ENUM (
  'confirmee',
  'en_attente',
  'refusee',
  'annulee'
);

-- Types de notification envoyée (US-06, TECH-04).
CREATE TYPE type_notification AS ENUM (
  'confirmation',
  'validation',
  'refus',
  'annulation',
  'rappel'
);

-- ----------------------------------------------------------------------------
-- 2. Fonction utilitaire : mise à jour automatique de updated_at
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------------------------
-- 3. Table roles
-- ----------------------------------------------------------------------------
-- Table de référence des 3 profils prévus par la note de cadrage (US-03,
-- US-14). Normalisée plutôt qu'un simple champ texte sur users, afin de
-- pouvoir faire évoluer les rôles (libellé, permissions futures) sans
-- migration de données.
CREATE TABLE roles (
  id       SMALLINT PRIMARY KEY,
  code     VARCHAR(30)  NOT NULL UNIQUE,
  libelle  VARCHAR(100) NOT NULL
);

COMMENT ON TABLE roles IS 'Référentiel des rôles applicatifs : enseignant, etudiant_association, admin_logistique.';

-- ----------------------------------------------------------------------------
-- 4. Table users
-- ----------------------------------------------------------------------------
CREATE TABLE users (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nom                 VARCHAR(150) NOT NULL,
  email               VARCHAR(255) NOT NULL UNIQUE,
  mot_de_passe_hash   VARCHAR(255) NOT NULL,
  role_id             SMALLINT NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
  actif               BOOLEAN NOT NULL DEFAULT true,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_users_email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

COMMENT ON TABLE users IS 'Comptes utilisateurs (enseignants, étudiants/associations, service logistique). Mot de passe stocké haché (bcrypt/argon2), jamais en clair.';
COMMENT ON COLUMN users.mot_de_passe_hash IS 'Hash du mot de passe (bcrypt ou argon2). Généré et vérifié côté back-end, jamais en clair en base.';

CREATE INDEX idx_users_role  ON users(role_id);
CREATE INDEX idx_users_email ON users(email);

CREATE TRIGGER set_updated_at_users
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ----------------------------------------------------------------------------
-- 5. Table salles
-- ----------------------------------------------------------------------------
CREATE TABLE salles (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nom           VARCHAR(150) NOT NULL,
  batiment      VARCHAR(100),
  etage         SMALLINT,
  capacite      INTEGER NOT NULL CHECK (capacite > 0),
  localisation  TEXT,
  notes         TEXT,
  actif         BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE salles IS 'Référentiel des salles réservables (US-10). Le champ actif permet une suppression logique (soft delete) pour préserver l''historique des réservations passées.';
COMMENT ON COLUMN salles.actif IS 'Une salle désactivée (actif = false) n''apparaît plus dans la recherche mais reste liée à ses réservations passées.';

-- Empêche deux salles actives de porter le même nom, sans bloquer la
-- réutilisation d'un nom après désactivation d'une ancienne salle.
CREATE UNIQUE INDEX idx_salles_nom_actif ON salles(nom) WHERE actif = true;
CREATE INDEX idx_salles_capacite ON salles(capacite);

CREATE TRIGGER set_updated_at_salles
  BEFORE UPDATE ON salles
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ----------------------------------------------------------------------------
-- 6. Table equipements
-- ----------------------------------------------------------------------------
CREATE TABLE equipements (
  id       SMALLSERIAL PRIMARY KEY,
  code     VARCHAR(50)  NOT NULL UNIQUE,
  libelle  VARCHAR(100) NOT NULL
);

COMMENT ON TABLE equipements IS 'Référentiel des équipements disponibles (vidéoprojecteur, visioconférence, tableau, etc.) utilisé pour le filtrage dynamique (US-04).';

-- ----------------------------------------------------------------------------
-- 7. Table de liaison salle_equipements (association N,N)
-- ----------------------------------------------------------------------------
CREATE TABLE salle_equipements (
  salle_id       UUID     NOT NULL REFERENCES salles(id)      ON DELETE CASCADE,
  equipement_id  SMALLINT NOT NULL REFERENCES equipements(id) ON DELETE CASCADE,
  PRIMARY KEY (salle_id, equipement_id)
);

COMMENT ON TABLE salle_equipements IS 'Association N,N entre salles et équipements, permettant un filtrage combiné (ex : capacité >= 30 ET vidéoprojecteur ET visio).';

CREATE INDEX idx_salle_equipements_equipement ON salle_equipements(equipement_id);

-- ----------------------------------------------------------------------------
-- 8. Table reservations
-- ----------------------------------------------------------------------------
CREATE TABLE reservations (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  salle_id           UUID NOT NULL REFERENCES salles(id) ON DELETE RESTRICT,
  user_id            UUID NOT NULL REFERENCES users(id)  ON DELETE RESTRICT,
  titre              VARCHAR(255) NOT NULL DEFAULT 'Réservation de salle',
  date_reservation   DATE NOT NULL,
  heure_debut        TIME NOT NULL,
  heure_fin          TIME NOT NULL,
  statut             statut_reservation NOT NULL DEFAULT 'en_attente',
  motif_refus        TEXT,

  -- Colonne calculée combinant date + heures en une plage temporelle,
  -- utilisée uniquement pour la contrainte anti-chevauchement ci-dessous.
  periode TSRANGE GENERATED ALWAYS AS (
    tsrange(
      (date_reservation + heure_debut)::timestamp,
      (date_reservation + heure_fin)::timestamp,
      '[)'
    )
  ) STORED,

  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT chk_reservations_heures CHECK (heure_fin > heure_debut),

  -- ------------------------------------------------------------------------
  -- Moteur anti-conflit strict (US-05) au niveau base de données.
  -- Interdit tout chevauchement, partiel ou total, de créneau sur une même
  -- salle, pour les réservations actives (confirmées ou en attente). Les
  -- réservations refusées ou annulées ne bloquent plus le créneau.
  -- Toute tentative d'INSERT/UPDATE en violation lève l'erreur PostgreSQL
  -- 23P01 (exclusion_violation), à intercepter côté back-end pour renvoyer
  -- un message explicite à l'utilisateur.
  -- ------------------------------------------------------------------------
  CONSTRAINT excl_reservations_no_overlap EXCLUDE USING gist (
    salle_id WITH =,
    periode  WITH &&
  ) WHERE (statut IN ('confirmee', 'en_attente'))
);

COMMENT ON TABLE reservations IS 'Réservations de salles, tous profils confondus. La contrainte excl_reservations_no_overlap garantit l''absence de double réservation directement au niveau base de données (US-05).';
COMMENT ON COLUMN reservations.statut IS 'confirmee = validée (Enseignant direct ou après validation Logistique) ; en_attente = demande Étudiant/Association non traitée ; refusee = rejetée par la Logistique ; annulee = annulée par le demandeur.';
COMMENT ON COLUMN reservations.periode IS 'Colonne générée (date + heures) utilisée exclusivement par la contrainte d''exclusion anti-chevauchement.';

CREATE INDEX idx_reservations_salle_date ON reservations(salle_id, date_reservation);
CREATE INDEX idx_reservations_statut     ON reservations(statut);
CREATE INDEX idx_reservations_user       ON reservations(user_id);
CREATE INDEX idx_reservations_date       ON reservations(date_reservation);

CREATE TRIGGER set_updated_at_reservations
  BEFORE UPDATE ON reservations
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ----------------------------------------------------------------------------
-- 9. Table reservation_historique
-- ----------------------------------------------------------------------------
-- Trace chaque changement de statut d'une réservation (création, validation,
-- refus, annulation), avec l'auteur de l'action. Alimentée par le back-end
-- à chaque appel des endpoints correspondants (US-03, US-06, US-12).
CREATE TABLE reservation_historique (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reservation_id   UUID NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  statut           statut_reservation NOT NULL,
  effectue_par     UUID REFERENCES users(id) ON DELETE SET NULL,
  commentaire      TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE reservation_historique IS 'Journal d''audit des changements de statut d''une réservation, utilisé pour la traçabilité du workflow de validation (US-03).';

CREATE INDEX idx_historique_reservation ON reservation_historique(reservation_id);

-- ----------------------------------------------------------------------------
-- 10. Table logs_emails (notifications)
-- ----------------------------------------------------------------------------
-- Journalise chaque email envoyé via le service SMTP (TECH-04), pour
-- traçabilité et diagnostic en cas de non-réception (US-06).
CREATE TABLE logs_emails (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reservation_id       UUID REFERENCES reservations(id) ON DELETE CASCADE,
  destinataire_email   VARCHAR(255) NOT NULL,
  type_notification    type_notification NOT NULL,
  sujet                VARCHAR(255) NOT NULL,
  corps                TEXT NOT NULL,
  statut_envoi         VARCHAR(20) NOT NULL DEFAULT 'envoye' CHECK (statut_envoi IN ('envoye', 'echec')),
  erreur               TEXT,
  envoye_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE logs_emails IS 'Journal des notifications email (confirmation, validation, refus, annulation, rappel) envoyées via Nodemailer/Gmail (TECH-04).';

CREATE INDEX idx_logs_emails_reservation   ON logs_emails(reservation_id);
CREATE INDEX idx_logs_emails_destinataire  ON logs_emails(destinataire_email);
CREATE INDEX idx_logs_emails_type          ON logs_emails(type_notification);

-- ----------------------------------------------------------------------------
-- 11. Vue de confort : détail des réservations avec salle et demandeur
-- ----------------------------------------------------------------------------
-- Évite de répéter les jointures salles/users dans chaque requête applicative
-- (recherche, planning, tableau de bord, export CSV).
CREATE OR REPLACE VIEW v_reservations_detail AS
SELECT
  r.id,
  r.titre,
  r.date_reservation,
  r.heure_debut,
  r.heure_fin,
  r.statut,
  r.motif_refus,
  r.created_at,
  s.id   AS salle_id,
  s.nom  AS salle_nom,
  s.batiment,
  s.capacite,
  u.id    AS user_id,
  u.nom   AS user_nom,
  u.email AS user_email,
  ro.code AS user_role
FROM reservations r
JOIN salles s ON s.id = r.salle_id
JOIN users  u ON u.id = r.user_id
JOIN roles  ro ON ro.id = u.role_id;

COMMENT ON VIEW v_reservations_detail IS 'Vue dénormalisée pour les écrans Planning, Mes réservations, File d''attente et Tableau de bord.';

-- ============================================================================
-- Fin du schéma.
-- ============================================================================
