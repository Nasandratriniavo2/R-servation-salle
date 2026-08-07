-- ============================================================================
-- SalleLibre — Seed production / demarrage
-- Un seul compte admin. Les autres users sont crees via l'interface Admin.
-- Mot de passe initial admin : demo123  (a changer apres premiere connexion)
-- ============================================================================

SET NAMES utf8mb4;

-- Roles
INSERT INTO roles (id, code, libelle) VALUES
  (1, 'enseignant',            'Enseignant'),
  (2, 'etudiant_association',  'Etudiant / Association'),
  (3, 'admin_logistique',      'Service Logistique / Administration')
ON DUPLICATE KEY UPDATE libelle = VALUES(libelle);

-- Admin unique (mot de passe = demo123)
INSERT INTO users (id, nom, email, mot_de_passe_hash, role_id, actif) VALUES
  ('00000000-0000-0000-0000-000000000005', 'Sophie Martin', 'sophie.martin@etablissement.fr',
   '$2b$10$4yydnm/ezPP9FB./DfL4keWTE2XeM8HRUHdXzggre1hiWeI3KXt.W', 3, 1)
ON DUPLICATE KEY UPDATE
  nom = VALUES(nom),
  mot_de_passe_hash = VALUES(mot_de_passe_hash),
  role_id = VALUES(role_id),
  actif = 1;

-- Equipements
INSERT INTO equipements (id, code, libelle) VALUES
  (1, 'videoprojecteur', 'Videoprojecteur'),
  (2, 'visio',           'Visioconference'),
  (3, 'tableau',         'Tableau'),
  (4, 'sono',            'Sonorisation'),
  (5, 'ordinateurs',     'Postes informatiques')
ON DUPLICATE KEY UPDATE libelle = VALUES(libelle);

-- Salles
INSERT INTO salles (id, nom, batiment, etage, capacite, localisation, notes, actif) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'Salle A101',            'Batiment A', 1, 20,  'Aile nord', 'Salle de cours standard', 1),
  ('a0000000-0000-0000-0000-000000000002', 'Salle A102',            'Batiment A', 1, 30,  'Aile nord', NULL, 1),
  ('a0000000-0000-0000-0000-000000000003', 'Salle B201',            'Batiment B', 2, 45,  'Aile sud',  'Equipee pour la visioconference', 1),
  ('a0000000-0000-0000-0000-000000000004', 'Salle B202',            'Batiment B', 2, 15,  'Aile sud',  'Petite salle de travail', 1),
  ('a0000000-0000-0000-0000-000000000005', 'Amphitheatre C',        'Batiment C', 0, 200, 'Rez-de-chaussee', 'Amphitheatre principal', 1),
  ('a0000000-0000-0000-0000-000000000006', 'Salle C105',            'Batiment C', 1, 60,  'Aile est', NULL, 1),
  ('a0000000-0000-0000-0000-000000000007', 'Salle Informatique D1', 'Batiment D', 1, 25,  'Aile ouest', '25 postes informatiques', 1),
  ('a0000000-0000-0000-0000-000000000008', 'Salle Reunion D2',      'Batiment D', 2, 10,  'Aile ouest', 'Ideale pour associations', 1),
  ('a0000000-0000-0000-0000-000000000009', 'Salle E301',            'Batiment E', 3, 35,  'Aile nord', NULL, 1),
  ('a0000000-0000-0000-0000-000000000010', 'Amphitheatre F',        'Batiment F', 0, 120, 'Rez-de-chaussee', NULL, 1),
  ('a0000000-0000-0000-0000-000000000011', 'Salle Associations G1', 'Batiment G', 1, 12,  'Aile sud', 'Reservee en priorite aux associations', 1)
ON DUPLICATE KEY UPDATE nom = VALUES(nom);

-- Equipements par salle
INSERT IGNORE INTO salle_equipements (salle_id, equipement_id) VALUES
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
