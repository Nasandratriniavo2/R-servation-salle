-- ============================================================================
-- SalleLibre — Jeu de donnees de test (seed MySQL)
-- Fichier : 02_seed_mysql.sql
-- Prealable : executer 01_schema_mysql.sql
-- ============================================================================

SET NAMES utf8mb4;

-- ----------------------------------------------------------------------------
-- 1. Roles
-- ----------------------------------------------------------------------------
INSERT INTO roles (id, code, libelle) VALUES
  (1, 'enseignant',            'Enseignant'),
  (2, 'etudiant_association',  'Etudiant / Association'),
  (3, 'admin_logistique',      'Service Logistique / Administration');

-- ----------------------------------------------------------------------------
-- 2. Utilisateurs de demo (UUID fixes pour le selecteur de profil)
-- ----------------------------------------------------------------------------
INSERT INTO users (id, nom, email, mot_de_passe_hash, role_id, actif) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Claire Fontaine',  'claire.fontaine@etablissement.fr',  '$2b$10$CwTycUXWue0Thq9StjUM0uJ8Q7mB8v3z9j0y0f6Hh8i9K2iuY2WSa', 1, 1),
  ('00000000-0000-0000-0000-000000000002', 'Marc Dubreuil',    'marc.dubreuil@etablissement.fr',    '$2b$10$CwTycUXWue0Thq9StjUM0uJ8Q7mB8v3z9j0y0f6Hh8i9K2iuY2WSa', 1, 1),
  ('00000000-0000-0000-0000-000000000003', 'Leo Girard',       'leo.girard@etu.etablissement.fr',   '$2b$10$CwTycUXWue0Thq9StjUM0uJ8Q7mB8v3z9j0y0f6Hh8i9K2iuY2WSa', 2, 1),
  ('00000000-0000-0000-0000-000000000004', 'Association BDE',  'bde@etu.etablissement.fr',           '$2b$10$CwTycUXWue0Thq9StjUM0uJ8Q7mB8v3z9j0y0f6Hh8i9K2iuY2WSa', 2, 1),
  ('00000000-0000-0000-0000-000000000005', 'Sophie Martin',    'sophie.martin@etablissement.fr',    '$2b$10$CwTycUXWue0Thq9StjUM0uJ8Q7mB8v3z9j0y0f6Hh8i9K2iuY2WSa', 3, 1);

-- ----------------------------------------------------------------------------
-- 3. Equipements
-- ----------------------------------------------------------------------------
INSERT INTO equipements (id, code, libelle) VALUES
  (1, 'videoprojecteur', 'Videoprojecteur'),
  (2, 'visio',           'Visioconference'),
  (3, 'tableau',         'Tableau'),
  (4, 'sono',            'Sonorisation'),
  (5, 'ordinateurs',     'Postes informatiques');

-- ----------------------------------------------------------------------------
-- 4. Salles
-- ----------------------------------------------------------------------------
INSERT INTO salles (id, nom, batiment, etage, capacite, localisation, notes, actif) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'Salle A101',              'Batiment A', 1, 20,  'Aile nord',  'Salle de cours standard',                1),
  ('a0000000-0000-0000-0000-000000000002', 'Salle A102',              'Batiment A', 1, 30,  'Aile nord',  NULL,                                      1),
  ('a0000000-0000-0000-0000-000000000003', 'Salle B201',              'Batiment B', 2, 45,  'Aile sud',   'Equipee pour la visioconference',        1),
  ('a0000000-0000-0000-0000-000000000004', 'Salle B202',              'Batiment B', 2, 15,  'Aile sud',   'Petite salle de travail',                 1),
  ('a0000000-0000-0000-0000-000000000005', 'Amphitheatre C',          'Batiment C', 0, 200, 'Rez-de-chaussee', 'Amphitheatre principal',             1),
  ('a0000000-0000-0000-0000-000000000006', 'Salle C105',              'Batiment C', 1, 60,  'Aile est',   NULL,                                      1),
  ('a0000000-0000-0000-0000-000000000007', 'Salle Informatique D1',   'Batiment D', 1, 25,  'Aile ouest', '25 postes informatiques',                 1),
  ('a0000000-0000-0000-0000-000000000008', 'Salle Reunion D2',        'Batiment D', 2, 10,  'Aile ouest', 'Ideale pour associations',                1),
  ('a0000000-0000-0000-0000-000000000009', 'Salle E301',              'Batiment E', 3, 35,  'Aile nord',  NULL,                                      1),
  ('a0000000-0000-0000-0000-000000000010', 'Amphitheatre F',          'Batiment F', 0, 120, 'Rez-de-chaussee', NULL,                                 1),
  ('a0000000-0000-0000-0000-000000000011', 'Salle Associations G1',   'Batiment G', 1, 12,  'Aile sud',   'Reservee en priorite aux associations',  1);

-- ----------------------------------------------------------------------------
-- 5. Association salles <-> equipements
-- ----------------------------------------------------------------------------
INSERT INTO salle_equipements (salle_id, equipement_id) VALUES
  ('a0000000-0000-0000-0000-000000000001', 1),
  ('a0000000-0000-0000-0000-000000000001', 3),
  ('a0000000-0000-0000-0000-000000000002', 1),
  ('a0000000-0000-0000-0000-000000000003', 1),
  ('a0000000-0000-0000-0000-000000000003', 2),
  ('a0000000-0000-0000-0000-000000000003', 3),
  ('a0000000-0000-0000-0000-000000000004', 3),
  ('a0000000-0000-0000-0000-000000000005', 1),
  ('a0000000-0000-0000-0000-000000000005', 2),
  ('a0000000-0000-0000-0000-000000000005', 4),
  ('a0000000-0000-0000-0000-000000000006', 1),
  ('a0000000-0000-0000-0000-000000000006', 4),
  ('a0000000-0000-0000-0000-000000000007', 1),
  ('a0000000-0000-0000-0000-000000000007', 5),
  ('a0000000-0000-0000-0000-000000000008', 2),
  ('a0000000-0000-0000-0000-000000000008', 3),
  ('a0000000-0000-0000-0000-000000000009', 1),
  ('a0000000-0000-0000-0000-000000000009', 3),
  ('a0000000-0000-0000-0000-000000000010', 1),
  ('a0000000-0000-0000-0000-000000000010', 2),
  ('a0000000-0000-0000-0000-000000000010', 4),
  ('a0000000-0000-0000-0000-000000000011', 3);

-- ----------------------------------------------------------------------------
-- 6. Reservations de demonstration
-- ----------------------------------------------------------------------------
INSERT INTO reservations (id, salle_id, user_id, titre, date_reservation, heure_debut, heure_fin, statut) VALUES
  ('b0000000-0000-0000-0000-000000000001',
   'a0000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000001',
   'Cours de mathematiques', CURDATE(), '09:00:00', '11:00:00', 'confirmee'),
  ('b0000000-0000-0000-0000-000000000002',
   'a0000000-0000-0000-0000-000000000003',
   '00000000-0000-0000-0000-000000000002',
   'Reunion pedagogique', CURDATE(), '14:00:00', '15:30:00', 'confirmee'),
  ('b0000000-0000-0000-0000-000000000003',
   'a0000000-0000-0000-0000-000000000008',
   '00000000-0000-0000-0000-000000000004',
   'Reunion de preparation du gala', DATE_ADD(CURDATE(), INTERVAL 1 DAY), '17:00:00', '19:00:00', 'en_attente'),
  ('b0000000-0000-0000-0000-000000000004',
   'a0000000-0000-0000-0000-000000000005',
   '00000000-0000-0000-0000-000000000003',
   'Repetition assemblee generale', DATE_ADD(CURDATE(), INTERVAL 2 DAY), '10:00:00', '12:00:00', 'en_attente'),
  ('b0000000-0000-0000-0000-000000000005',
   'a0000000-0000-0000-0000-000000000006',
   '00000000-0000-0000-0000-000000000001',
   'TD Statistiques', DATE_SUB(CURDATE(), INTERVAL 1 DAY), '08:30:00', '10:00:00', 'confirmee');

INSERT INTO reservations (id, salle_id, user_id, titre, date_reservation, heure_debut, heure_fin, statut, motif_refus) VALUES
  ('b0000000-0000-0000-0000-000000000006',
   'a0000000-0000-0000-0000-000000000002',
   '00000000-0000-0000-0000-000000000003',
   'Session de revision', DATE_SUB(CURDATE(), INTERVAL 2 DAY), '13:00:00', '14:00:00', 'refusee',
   'Salle deja mobilisee pour un examen');

INSERT INTO reservations (id, salle_id, user_id, titre, date_reservation, heure_debut, heure_fin, statut) VALUES
  ('b0000000-0000-0000-0000-000000000007',
   'a0000000-0000-0000-0000-000000000009',
   '00000000-0000-0000-0000-000000000002',
   'Conference invitee', DATE_ADD(CURDATE(), INTERVAL 3 DAY), '10:00:00', '12:00:00', 'annulee');

-- ----------------------------------------------------------------------------
-- 7. Historique
-- ----------------------------------------------------------------------------
INSERT INTO reservation_historique (id, reservation_id, statut, effectue_par, commentaire) VALUES
  (UUID(), 'b0000000-0000-0000-0000-000000000001', 'confirmee',  '00000000-0000-0000-0000-000000000001', 'Reservation directe Enseignant'),
  (UUID(), 'b0000000-0000-0000-0000-000000000002', 'confirmee',  '00000000-0000-0000-0000-000000000002', 'Reservation directe Enseignant'),
  (UUID(), 'b0000000-0000-0000-0000-000000000003', 'en_attente', '00000000-0000-0000-0000-000000000004', 'Demande soumise'),
  (UUID(), 'b0000000-0000-0000-0000-000000000004', 'en_attente', '00000000-0000-0000-0000-000000000003', 'Demande soumise'),
  (UUID(), 'b0000000-0000-0000-0000-000000000005', 'confirmee',  '00000000-0000-0000-0000-000000000001', 'Reservation directe Enseignant'),
  (UUID(), 'b0000000-0000-0000-0000-000000000006', 'en_attente', '00000000-0000-0000-0000-000000000003', 'Demande soumise'),
  (UUID(), 'b0000000-0000-0000-0000-000000000006', 'refusee',    '00000000-0000-0000-0000-000000000005', 'Salle deja mobilisee pour un examen'),
  (UUID(), 'b0000000-0000-0000-0000-000000000007', 'confirmee',  '00000000-0000-0000-0000-000000000002', 'Reservation directe Enseignant'),
  (UUID(), 'b0000000-0000-0000-0000-000000000007', 'annulee',    '00000000-0000-0000-0000-000000000002', 'Conference reportee');

-- ----------------------------------------------------------------------------
-- 8. Journal emails
-- ----------------------------------------------------------------------------
INSERT INTO logs_emails (id, reservation_id, destinataire_email, type_notification, sujet, corps) VALUES
  (UUID(), 'b0000000-0000-0000-0000-000000000001', 'claire.fontaine@etablissement.fr', 'confirmation',
   'Reservation confirmee — Salle A101',
   'Bonjour Claire Fontaine, votre reservation de la salle A101 est confirmee.'),
  (UUID(), 'b0000000-0000-0000-0000-000000000003', 'bde@etu.etablissement.fr', 'confirmation',
   'Demande de reservation recue — Salle Reunion D2',
   'Bonjour Association BDE, votre demande a bien ete transmise au service Logistique.'),
  (UUID(), 'b0000000-0000-0000-0000-000000000006', 'leo.girard@etu.etablissement.fr', 'refus',
   'Reservation refusee — Salle A102',
   'Bonjour Leo Girard, votre demande a ete refusee. Motif : salle deja mobilisee pour un examen.'),
  (UUID(), 'b0000000-0000-0000-0000-000000000007', 'marc.dubreuil@etablissement.fr', 'annulation',
   'Reservation annulee — Salle E301',
   'Bonjour Marc Dubreuil, votre reservation a ete annulee. Le creneau est de nouveau disponible.');

-- ============================================================================
-- Verification : SELECT * FROM v_reservations_detail ORDER BY date_reservation;
-- ============================================================================
