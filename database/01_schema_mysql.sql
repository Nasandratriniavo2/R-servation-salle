-- ============================================================================
-- SalleLibre — Schema MySQL
-- Fichier : 01_schema_mysql.sql
-- Compatible MySQL 8.0+ / MariaDB 10.5+
-- ============================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

DROP VIEW  IF EXISTS v_reservations_detail;
DROP TABLE IF EXISTS logs_emails;
DROP TABLE IF EXISTS reservation_historique;
DROP TABLE IF EXISTS reservations;
DROP TABLE IF EXISTS salle_equipements;
DROP TABLE IF EXISTS equipements;
DROP TABLE IF EXISTS salles;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS roles;

SET FOREIGN_KEY_CHECKS = 1;

-- ----------------------------------------------------------------------------
-- 1. Table roles
-- ----------------------------------------------------------------------------
CREATE TABLE roles (
  id       SMALLINT     NOT NULL PRIMARY KEY,
  code     VARCHAR(30)  NOT NULL UNIQUE,
  libelle  VARCHAR(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 2. Table users
-- ----------------------------------------------------------------------------
CREATE TABLE users (
  id                  CHAR(36)     NOT NULL PRIMARY KEY,
  nom                 VARCHAR(150) NOT NULL,
  email               VARCHAR(255) NOT NULL UNIQUE,
  mot_de_passe_hash   VARCHAR(255) NOT NULL,
  role_id             SMALLINT     NOT NULL,
  actif               TINYINT(1)   NOT NULL DEFAULT 1,
  created_at          DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at          DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_users_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_users_role  ON users(role_id);
CREATE INDEX idx_users_email ON users(email);

-- ----------------------------------------------------------------------------
-- 3. Table salles
-- ----------------------------------------------------------------------------
CREATE TABLE salles (
  id            CHAR(36)     NOT NULL PRIMARY KEY,
  nom           VARCHAR(150) NOT NULL,
  batiment      VARCHAR(100) NULL,
  etage         SMALLINT     NULL,
  capacite      INT          NOT NULL,
  localisation  TEXT         NULL,
  notes         TEXT         NULL,
  actif         TINYINT(1)   NOT NULL DEFAULT 1,
  created_at    DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at    DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT chk_salles_capacite CHECK (capacite > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_salles_capacite ON salles(capacite);
CREATE INDEX idx_salles_actif    ON salles(actif);

-- ----------------------------------------------------------------------------
-- 4. Table equipements
-- ----------------------------------------------------------------------------
CREATE TABLE equipements (
  id       SMALLINT     NOT NULL AUTO_INCREMENT PRIMARY KEY,
  code     VARCHAR(50)  NOT NULL UNIQUE,
  libelle  VARCHAR(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 5. Table salle_equipements (N,N)
-- ----------------------------------------------------------------------------
CREATE TABLE salle_equipements (
  salle_id       CHAR(36)  NOT NULL,
  equipement_id  SMALLINT  NOT NULL,
  PRIMARY KEY (salle_id, equipement_id),
  CONSTRAINT fk_se_salle FOREIGN KEY (salle_id) REFERENCES salles(id) ON DELETE CASCADE,
  CONSTRAINT fk_se_equip FOREIGN KEY (equipement_id) REFERENCES equipements(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_salle_equipements_equipement ON salle_equipements(equipement_id);

-- ----------------------------------------------------------------------------
-- 6. Table reservations
-- ----------------------------------------------------------------------------
-- Anti-conflit : verifie cote application + trigger BEFORE INSERT/UPDATE
-- (MySQL n'a pas d'equivalent direct a EXCLUDE USING gist de PostgreSQL).
CREATE TABLE reservations (
  id                 CHAR(36)     NOT NULL PRIMARY KEY,
  salle_id           CHAR(36)     NOT NULL,
  user_id            CHAR(36)     NOT NULL,
  titre              VARCHAR(255) NOT NULL DEFAULT 'Reservation de salle',
  date_reservation   DATE         NOT NULL,
  heure_debut        TIME         NOT NULL,
  heure_fin          TIME         NOT NULL,
  statut             ENUM('confirmee', 'en_attente', 'refusee', 'annulee') NOT NULL DEFAULT 'en_attente',
  motif_refus        TEXT         NULL,
  created_at         DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at         DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT chk_reservations_heures CHECK (heure_fin > heure_debut),
  CONSTRAINT fk_res_salle FOREIGN KEY (salle_id) REFERENCES salles(id) ON DELETE RESTRICT,
  CONSTRAINT fk_res_user  FOREIGN KEY (user_id)  REFERENCES users(id)  ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_reservations_salle_date ON reservations(salle_id, date_reservation);
CREATE INDEX idx_reservations_statut     ON reservations(statut);
CREATE INDEX idx_reservations_user       ON reservations(user_id);
CREATE INDEX idx_reservations_date       ON reservations(date_reservation);

-- ----------------------------------------------------------------------------
-- Trigger anti-conflit (US-05)
-- Interdit tout chevauchement sur une meme salle pour les statuts actifs.
-- ----------------------------------------------------------------------------
DELIMITER $$

CREATE TRIGGER trg_reservations_no_overlap_insert
BEFORE INSERT ON reservations
FOR EACH ROW
BEGIN
  IF NEW.statut IN ('confirmee', 'en_attente') THEN
    IF EXISTS (
      SELECT 1 FROM reservations r
      WHERE r.salle_id = NEW.salle_id
        AND r.date_reservation = NEW.date_reservation
        AND r.statut IN ('confirmee', 'en_attente')
        AND r.heure_debut < NEW.heure_fin
        AND NEW.heure_debut < r.heure_fin
    ) THEN
      SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'CONFLIT_CRENEAU: chevauchement detecte sur cette salle';
    END IF;
  END IF;
END$$

CREATE TRIGGER trg_reservations_no_overlap_update
BEFORE UPDATE ON reservations
FOR EACH ROW
BEGIN
  IF NEW.statut IN ('confirmee', 'en_attente') THEN
    IF EXISTS (
      SELECT 1 FROM reservations r
      WHERE r.salle_id = NEW.salle_id
        AND r.date_reservation = NEW.date_reservation
        AND r.statut IN ('confirmee', 'en_attente')
        AND r.id <> NEW.id
        AND r.heure_debut < NEW.heure_fin
        AND NEW.heure_debut < r.heure_fin
    ) THEN
      SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'CONFLIT_CRENEAU: chevauchement detecte sur cette salle';
    END IF;
  END IF;
END$$

DELIMITER ;

-- ----------------------------------------------------------------------------
-- 7. Table reservation_historique
-- ----------------------------------------------------------------------------
CREATE TABLE reservation_historique (
  id               CHAR(36)     NOT NULL PRIMARY KEY,
  reservation_id   CHAR(36)     NOT NULL,
  statut           ENUM('confirmee', 'en_attente', 'refusee', 'annulee') NOT NULL,
  effectue_par     CHAR(36)     NULL,
  commentaire      TEXT         NULL,
  created_at       DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_hist_res  FOREIGN KEY (reservation_id) REFERENCES reservations(id) ON DELETE CASCADE,
  CONSTRAINT fk_hist_user FOREIGN KEY (effectue_par)   REFERENCES users(id)        ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_historique_reservation ON reservation_historique(reservation_id);

-- ----------------------------------------------------------------------------
-- 8. Table logs_emails
-- ----------------------------------------------------------------------------
CREATE TABLE logs_emails (
  id                   CHAR(36)     NOT NULL PRIMARY KEY,
  reservation_id       CHAR(36)     NULL,
  destinataire_email   VARCHAR(255) NOT NULL,
  type_notification    ENUM('confirmation', 'validation', 'refus', 'annulation', 'rappel') NOT NULL,
  sujet                VARCHAR(255) NOT NULL,
  corps                TEXT         NOT NULL,
  statut_envoi         VARCHAR(20)  NOT NULL DEFAULT 'envoye',
  erreur               TEXT         NULL,
  envoye_at            DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_logs_res FOREIGN KEY (reservation_id) REFERENCES reservations(id) ON DELETE CASCADE,
  CONSTRAINT chk_logs_statut CHECK (statut_envoi IN ('envoye', 'echec'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_logs_emails_reservation  ON logs_emails(reservation_id);
CREATE INDEX idx_logs_emails_destinataire ON logs_emails(destinataire_email);
CREATE INDEX idx_logs_emails_type         ON logs_emails(type_notification);

-- ----------------------------------------------------------------------------
-- 9. Vue de confort
-- ----------------------------------------------------------------------------
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
JOIN salles s  ON s.id  = r.salle_id
JOIN users  u  ON u.id  = r.user_id
JOIN roles  ro ON ro.id = u.role_id;

-- ============================================================================
-- Fin du schema MySQL.
-- ============================================================================
