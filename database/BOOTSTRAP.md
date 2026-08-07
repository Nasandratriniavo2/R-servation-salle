# Premier demarrage (production)

1. Executer le schema : `01_schema_mysql.sql`
2. Option A — seed de dev (5 comptes, mot de passe `demo123`) : `02_seed_mysql.sql`
3. Option B — production minimale : creer uniquement un admin

```sql
-- Mot de passe = demo123 (a changer apres premiere connexion)
-- Hash bcrypt de "demo123" :
INSERT INTO roles (id, code, libelle) VALUES
  (1, 'enseignant', 'Enseignant'),
  (2, 'etudiant_association', 'Etudiant / Association'),
  (3, 'admin_logistique', 'Service Logistique / Administration')
ON DUPLICATE KEY UPDATE libelle = VALUES(libelle);

INSERT INTO users (id, nom, email, mot_de_passe_hash, role_id, actif) VALUES
  (UUID(), 'Administrateur', 'admin@etablissement.fr',
   '$2b$10$4yydnm/ezPP9FB./DfL4keWTE2XeM8HRUHdXzggre1hiWeI3KXt.W', 3, 1);
```

4. Se connecter avec cet admin → page Utilisateurs → creer les enseignants et etudiants reels.
5. Changer le mot de passe admin des la premiere connexion (Modifier dans Utilisateurs).
