-- ============================================================================
-- SalleLibre — Jeu de données de test (seed)
-- Fichier : 02_seed.sql
-- Prérequis : exécuter 01_schema.sql au préalable.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Rôles (3 profils imposés par la note de cadrage)
-- ----------------------------------------------------------------------------
INSERT INTO roles (id, code, libelle) VALUES
  (1, 'enseignant',            'Enseignant'),
  (2, 'etudiant_association',  'Étudiant / Association'),
  (3, 'admin_logistique',      'Service Logistique / Administration');

-- ----------------------------------------------------------------------------
-- 2. Utilisateurs de test (un compte par profil, au minimum)
-- ----------------------------------------------------------------------------
-- Remarque importante : la valeur ci-dessous n'est PAS un vrai hash du mot de
-- passe "MotDePasse123!" — c'est un exemple au format bcrypt (60 caractères)
-- fourni uniquement pour respecter le type de la colonne et permettre les
-- tests. En développement réel, générez le hash avec bcrypt/argon2 côté
-- back-end lors de l'inscription, jamais en clair, jamais codé en dur.
INSERT INTO users (id, nom, email, mot_de_passe_hash, role_id, actif) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Claire Fontaine',  'claire.fontaine@etablissement.fr',  '$2b$10$CwTycUXWue0Thq9StjUM0uJ8Q7mB8v3z9j0y0f6Hh8i9K2iuY2WSa', 1, true),
  ('00000000-0000-0000-0000-000000000002', 'Marc Dubreuil',    'marc.dubreuil@etablissement.fr',    '$2b$10$CwTycUXWue0Thq9StjUM0uJ8Q7mB8v3z9j0y0f6Hh8i9K2iuY2WSa', 1, true),
  ('00000000-0000-0000-0000-000000000003', 'Léo Girard',       'leo.girard@etu.etablissement.fr',   '$2b$10$CwTycUXWue0Thq9StjUM0uJ8Q7mB8v3z9j0y0f6Hh8i9K2iuY2WSa', 2, true),
  ('00000000-0000-0000-0000-000000000004', 'Association BDE',  'bde@etu.etablissement.fr',           '$2b$10$CwTycUXWue0Thq9StjUM0uJ8Q7mB8v3z9j0y0f6Hh8i9K2iuY2WSa', 2, true),
  ('00000000-0000-0000-0000-000000000005', 'Sophie Martin',    'sophie.martin@etablissement.fr',    '$2b$10$CwTycUXWue0Thq9StjUM0uJ8Q7mB8v3z9j0y0f6Hh8i9K2iuY2WSa', 3, true);

-- ----------------------------------------------------------------------------
-- 3. Équipements
-- ----------------------------------------------------------------------------
INSERT INTO equipements (id, code, libelle) VALUES
  (1, 'videoprojecteur', 'Vidéoprojecteur'),
  (2, 'visio',           'Visioconférence'),
  (3, 'tableau',         'Tableau'),
  (4, 'sono',            'Sonorisation'),
  (5, 'ordinateurs',     'Postes informatiques');

-- ----------------------------------------------------------------------------
-- 4. Salles (11 salles, capacités et équipements variés)
-- ----------------------------------------------------------------------------
INSERT INTO salles (id, nom, batiment, etage, capacite, localisation, notes, actif) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'Salle A101',              'Bâtiment A', 1, 20,  'Aile nord',  'Salle de cours standard',                true),
  ('a0000000-0000-0000-0000-000000000002', 'Salle A102',              'Bâtiment A', 1, 30,  'Aile nord',  NULL,                                      true),
  ('a0000000-0000-0000-0000-000000000003', 'Salle B201',              'Bâtiment B', 2, 45,  'Aile sud',   'Équipée pour la visioconférence',        true),
  ('a0000000-0000-0000-0000-000000000004', 'Salle B202',              'Bâtiment B', 2, 15,  'Aile sud',   'Petite salle de travail',                 true),
  ('a0000000-0000-0000-0000-000000000005', 'Amphithéâtre C',          'Bâtiment C', 0, 200, 'Rez-de-chaussée', 'Amphithéâtre principal',             true),
  ('a0000000-0000-0000-0000-000000000006', 'Salle C105',              'Bâtiment C', 1, 60,  'Aile est',   NULL,                                      true),
  ('a0000000-0000-0000-0000-000000000007', 'Salle Informatique D1',   'Bâtiment D', 1, 25,  'Aile ouest', '25 postes informatiques',                 true),
  ('a0000000-0000-0000-0000-000000000008', 'Salle Réunion D2',        'Bâtiment D', 2, 10,  'Aile ouest', 'Idéale pour associations',                true),
  ('a0000000-0000-0000-0000-000000000009', 'Salle E301',              'Bâtiment E', 3, 35,  'Aile nord',  NULL,                                      true),
  ('a0000000-0000-0000-0000-000000000010', 'Amphithéâtre F',          'Bâtiment F', 0, 120, 'Rez-de-chaussée', NULL,                                 true),
  ('a0000000-0000-0000-0000-000000000011', 'Salle Associations G1',   'Bâtiment G', 1, 12,  'Aile sud',   'Réservée en priorité aux associations',  true);

-- ----------------------------------------------------------------------------
-- 5. Association salles <-> équipements
-- ----------------------------------------------------------------------------
INSERT INTO salle_equipements (salle_id, equipement_id) VALUES
  ('a0000000-0000-0000-0000-000000000001', 1), -- A101 : vidéoprojecteur
  ('a0000000-0000-0000-0000-000000000001', 3), -- A101 : tableau
  ('a0000000-0000-0000-0000-000000000002', 1), -- A102 : vidéoprojecteur
  ('a0000000-0000-0000-0000-000000000003', 1), -- B201 : vidéoprojecteur
  ('a0000000-0000-0000-0000-000000000003', 2), -- B201 : visio
  ('a0000000-0000-0000-0000-000000000003', 3), -- B201 : tableau
  ('a0000000-0000-0000-0000-000000000004', 3), -- B202 : tableau
  ('a0000000-0000-0000-0000-000000000005', 1), -- Amphi C : vidéoprojecteur
  ('a0000000-0000-0000-0000-000000000005', 2), -- Amphi C : visio
  ('a0000000-0000-0000-0000-000000000005', 4), -- Amphi C : sono
  ('a0000000-0000-0000-0000-000000000006', 1), -- C105 : vidéoprojecteur
  ('a0000000-0000-0000-0000-000000000006', 4), -- C105 : sono
  ('a0000000-0000-0000-0000-000000000007', 1), -- D1 : vidéoprojecteur
  ('a0000000-0000-0000-0000-000000000007', 5), -- D1 : ordinateurs
  ('a0000000-0000-0000-0000-000000000008', 2), -- D2 : visio
  ('a0000000-0000-0000-0000-000000000008', 3), -- D2 : tableau
  ('a0000000-0000-0000-0000-000000000009', 1), -- E301 : vidéoprojecteur
  ('a0000000-0000-0000-0000-000000000009', 3), -- E301 : tableau
  ('a0000000-0000-0000-0000-000000000010', 1), -- Amphi F : vidéoprojecteur
  ('a0000000-0000-0000-0000-000000000010', 2), -- Amphi F : visio
  ('a0000000-0000-0000-0000-000000000010', 4), -- Amphi F : sono
  ('a0000000-0000-0000-0000-000000000011', 3); -- G1 : tableau

-- ----------------------------------------------------------------------------
-- 6. Réservations de démonstration (tous statuts représentés)
-- ----------------------------------------------------------------------------
-- Les dates sont calculées par rapport à CURRENT_DATE afin que le jeu de
-- données reste pertinent quelle que soit la date d'exécution du script.

-- 6.1 Réservation confirmée — Enseignant, aujourd'hui
INSERT INTO reservations (id, salle_id, user_id, titre, date_reservation, heure_debut, heure_fin, statut)
VALUES (
  'b0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  'Cours de mathématiques',
  CURRENT_DATE, '09:00', '11:00', 'confirmee'
);

-- 6.2 Réservation confirmée — Enseignant, aujourd'hui
INSERT INTO reservations (id, salle_id, user_id, titre, date_reservation, heure_debut, heure_fin, statut)
VALUES (
  'b0000000-0000-0000-0000-000000000002',
  'a0000000-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000002',
  'Réunion pédagogique',
  CURRENT_DATE, '14:00', '15:30', 'confirmee'
);

-- 6.3 Demande en attente — Association, demain
INSERT INTO reservations (id, salle_id, user_id, titre, date_reservation, heure_debut, heure_fin, statut)
VALUES (
  'b0000000-0000-0000-0000-000000000003',
  'a0000000-0000-0000-0000-000000000008',
  '00000000-0000-0000-0000-000000000004',
  'Réunion de préparation du gala',
  CURRENT_DATE + 1, '17:00', '19:00', 'en_attente'
);

-- 6.4 Demande en attente — Étudiant, dans 2 jours
INSERT INTO reservations (id, salle_id, user_id, titre, date_reservation, heure_debut, heure_fin, statut)
VALUES (
  'b0000000-0000-0000-0000-000000000004',
  'a0000000-0000-0000-0000-000000000005',
  '00000000-0000-0000-0000-000000000003',
  'Répétition assemblée générale',
  CURRENT_DATE + 2, '10:00', '12:00', 'en_attente'
);

-- 6.5 Réservation confirmée passée — Enseignant, hier
INSERT INTO reservations (id, salle_id, user_id, titre, date_reservation, heure_debut, heure_fin, statut)
VALUES (
  'b0000000-0000-0000-0000-000000000005',
  'a0000000-0000-0000-0000-000000000006',
  '00000000-0000-0000-0000-000000000001',
  'TD Statistiques',
  CURRENT_DATE - 1, '08:30', '10:00', 'confirmee'
);

-- 6.6 Réservation refusée — Étudiant, il y a 2 jours, avec motif
INSERT INTO reservations (id, salle_id, user_id, titre, date_reservation, heure_debut, heure_fin, statut, motif_refus)
VALUES (
  'b0000000-0000-0000-0000-000000000006',
  'a0000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000003',
  'Session de révision',
  CURRENT_DATE - 2, '13:00', '14:00', 'refusee', 'Salle déjà mobilisée pour un examen'
);

-- 6.7 Réservation annulée — Enseignant, dans 3 jours (créneau à nouveau libre)
INSERT INTO reservations (id, salle_id, user_id, titre, date_reservation, heure_debut, heure_fin, statut)
VALUES (
  'b0000000-0000-0000-0000-000000000007',
  'a0000000-0000-0000-0000-000000000009',
  '00000000-0000-0000-0000-000000000002',
  'Conférence invitée',
  CURRENT_DATE + 3, '10:00', '12:00', 'annulee'
);

-- ----------------------------------------------------------------------------
-- 7. Historique des changements de statut (US-03)
-- ----------------------------------------------------------------------------
INSERT INTO reservation_historique (reservation_id, statut, effectue_par, commentaire) VALUES
  ('b0000000-0000-0000-0000-000000000001', 'confirmee',  '00000000-0000-0000-0000-000000000001', 'Réservation directe Enseignant'),
  ('b0000000-0000-0000-0000-000000000002', 'confirmee',  '00000000-0000-0000-0000-000000000002', 'Réservation directe Enseignant'),
  ('b0000000-0000-0000-0000-000000000003', 'en_attente', '00000000-0000-0000-0000-000000000004', 'Demande soumise'),
  ('b0000000-0000-0000-0000-000000000004', 'en_attente', '00000000-0000-0000-0000-000000000003', 'Demande soumise'),
  ('b0000000-0000-0000-0000-000000000005', 'confirmee',  '00000000-0000-0000-0000-000000000001', 'Réservation directe Enseignant'),
  ('b0000000-0000-0000-0000-000000000006', 'en_attente', '00000000-0000-0000-0000-000000000003', 'Demande soumise'),
  ('b0000000-0000-0000-0000-000000000006', 'refusee',    '00000000-0000-0000-0000-000000000005', 'Salle déjà mobilisée pour un examen'),
  ('b0000000-0000-0000-0000-000000000007', 'confirmee',  '00000000-0000-0000-0000-000000000002', 'Réservation directe Enseignant'),
  ('b0000000-0000-0000-0000-000000000007', 'annulee',    '00000000-0000-0000-0000-000000000002', 'Conférence reportée');

-- ----------------------------------------------------------------------------
-- 8. Journal des emails envoyés (TECH-04, US-06)
-- ----------------------------------------------------------------------------
INSERT INTO logs_emails (reservation_id, destinataire_email, type_notification, sujet, corps) VALUES
  ('b0000000-0000-0000-0000-000000000001', 'claire.fontaine@etablissement.fr', 'confirmation',
   'Réservation confirmée — Salle A101',
   'Bonjour Claire Fontaine, votre réservation de la salle A101 est confirmée.'),
  ('b0000000-0000-0000-0000-000000000003', 'bde@etu.etablissement.fr', 'confirmation',
   'Demande de réservation reçue — Salle Réunion D2',
   'Bonjour Association BDE, votre demande a bien été transmise au service Logistique.'),
  ('b0000000-0000-0000-0000-000000000006', 'leo.girard@etu.etablissement.fr', 'refus',
   'Réservation refusée — Salle A102',
   'Bonjour Léo Girard, votre demande a été refusée. Motif : salle déjà mobilisée pour un examen.'),
  ('b0000000-0000-0000-0000-000000000007', 'marc.dubreuil@etablissement.fr', 'annulation',
   'Réservation annulée — Salle E301',
   'Bonjour Marc Dubreuil, votre réservation a été annulée. Le créneau est de nouveau disponible.');

-- ============================================================================
-- Fin du seed. Vérification rapide :
--   SELECT * FROM v_reservations_detail ORDER BY date_reservation;
-- ============================================================================
