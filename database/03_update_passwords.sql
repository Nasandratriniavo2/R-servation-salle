-- Met a jour les mots de passe des comptes demo vers "demo123"
-- A executer si vous aviez deja charge l'ancien seed.
UPDATE users SET mot_de_passe_hash = '$2b$10$4yydnm/ezPP9FB./DfL4keWTE2XeM8HRUHdXzggre1hiWeI3KXt.W'
WHERE id IN (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000004',
  '00000000-0000-0000-0000-000000000005'
);
