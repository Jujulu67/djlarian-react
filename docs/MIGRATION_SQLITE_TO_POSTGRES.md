# Migration SQLite → PostgreSQL Local

Guide complet pour migrer la base de données locale de SQLite vers PostgreSQL sans perte de données.

## 📋 Phase A - Audit rapide (COMPLÉTÉ)

### État actuel vérifié:

- ✅ `schema.prisma`: `provider = "sqlite"` (⚠️ À CORRIGER en `postgresql`)
- ✅ `migration_lock.toml`: `provider = "postgresql"` (correct)
- ✅ SQLite DB existe: `prisma/dev.db` avec 26 tables
- ✅ Prisma version: 7.1.0
- ✅ Node version: v22.12.0
- ⚠️ `DATABASE_URL` pointe vers SQLite: `file:./prisma/dev.db`

### Commandes d'audit:

```bash
# Vérifier le provider dans schema.prisma
cat prisma/schema.prisma | sed -n '1,15p'

# Vérifier migration_lock.toml
cat prisma/migrations/migration_lock.toml

# Vérifier versions
pnpm prisma -v
node -v

# Vérifier DATABASE_URL
echo $DATABASE_URL
grep "^DATABASE_URL" .env.local

# Lister tables SQLite
sqlite3 prisma/dev.db ".tables"

# État des migrations
pnpm prisma migrate status
```

---

## 🐳 Phase B - Mise en place PostgreSQL local (Docker)

### 1. Vérifier docker-compose.yml

Le fichier `docker-compose.yml` est déjà configuré avec:

- User: `djlarian`
- Password: `<DEV_DB_PASSWORD>`
- Database: `djlarian_dev`
- Port: `5432`
- Volume persistant: `postgres_data`

### 2. Démarrer PostgreSQL

```bash
# Démarrer Docker Desktop si nécessaire, puis:
docker compose up -d

# Vérifier que le conteneur tourne
docker compose ps

# Vérifier les logs
docker compose logs postgres
```

**Output attendu:**

```
NAME                    IMAGE               STATUS
djlarian-postgres-local postgres:16-alpine  Up (healthy)
```

### 3. Configurer .env.local

**⚠️ IMPORTANT:** Ne pas dupliquer `DATABASE_URL`. Ajouter/mettre à jour:

```bash
# Ajouter dans .env.local (ou remplacer si existe déjà)
DATABASE_URL_LOCAL="postgresql://djlarian:<DEV_DB_PASSWORD>@127.0.0.1:5433/djlarian_dev?sslmode=disable"

# Si DATABASE_URL pointe encore vers SQLite, la garder pour l'instant
# On la changera après la migration
```

**Commande pour ajouter automatiquement:**

```bash
# Si DATABASE_URL_LOCAL n'existe pas, l'ajouter
if ! grep -q "^DATABASE_URL_LOCAL" .env.local 2>/dev/null; then
  echo 'DATABASE_URL_LOCAL="postgresql://djlarian:<DEV_DB_PASSWORD>@127.0.0.1:5433/djlarian_dev?sslmode=disable"' >> .env.local
  echo "✅ DATABASE_URL_LOCAL ajouté dans .env.local"
else
  echo "ℹ️  DATABASE_URL_LOCAL existe déjà"
fi
```

### 4. Tester la connexion PostgreSQL

```bash
# Tester avec psql (si installé)
psql "postgresql://djlarian:<DEV_DB_PASSWORD>@127.0.0.1:5433/djlarian_dev?sslmode=disable" -c "\dt"

# Ou avec Node.js
node -e "const {Pool}=require('pg');const p=new Pool({connectionString:'postgresql://djlarian:<DEV_DB_PASSWORD>@127.0.0.1:5433/djlarian_dev?sslmode=disable'});p.query('SELECT 1').then(()=>{console.log('✅ Connexion OK');p.end()}).catch(e=>{console.error('❌',e.message);p.end()})"
```

---

## 🔧 Phase C - Corriger schema.prisma (MANUEL)

**⚠️ CRITIQUE:** Ne jamais modifier `schema.prisma` automatiquement selon les règles.

### Instructions manuelles:

1. Ouvrir `prisma/schema.prisma`
2. Ligne 8, changer:
   ```prisma
   datasource db {
     provider = "sqlite"  // ❌ AVANT
   ```
   En:
   ```prisma
   datasource db {
     provider = "postgresql"  // ✅ APRÈS
   ```
3. **Supprimer la ligne 13** `url = env("DATABASE_URL")` (Prisma 7 n'accepte plus `url` dans schema.prisma)
4. Sauvegarder

**Vérification:**

```bash
# Vérifier que le provider est postgresql
grep "provider = " prisma/schema.prisma

# Valider le schema
pnpm prisma validate
```

---

## 🚀 Phase D - Appliquer les migrations Prisma sur Postgres vierge

### 1. S'assurer que DATABASE_URL pointe vers PostgreSQL

```bash
# Temporairement, utiliser DATABASE_URL_LOCAL
export DATABASE_URL="postgresql://djlarian:<DEV_DB_PASSWORD>@127.0.0.1:5433/djlarian_dev?sslmode=disable"

# Ou modifier .env.local temporairement (on la remettra après)
```

### 2. Appliquer les migrations

```bash
# Option 1: migrate deploy (recommandé pour appliquer migrations existantes)
pnpm prisma migrate deploy

# Si deploy ne marche pas, utiliser migrate dev (mais attention, ne pas créer de nouvelles migrations)
# pnpm prisma migrate dev --name temp_apply_existing
```

**Output attendu:**

```
Applying migration `20250424125117_init`
Applying migration `20250426202133_add_publish_at_to_event`
...
X migrations applied successfully.
```

### 3. Vérifier l'état

```bash
# Vérifier le statut des migrations
pnpm prisma migrate status

# Lister les tables créées
psql "$DATABASE_URL" -c "\dt" | head -30
```

---

## 📦 Phase E - Migration des données SQLite → Postgres

### 1. Backup SQLite (automatique dans le script)

Le script crée automatiquement un backup avant migration:

```bash
# Backup sera créé: prisma/dev.db.backup.YYYY-MM-DDTHH-MM-SS
```

### 2. Dry-run (simulation)

```bash
# Tester la migration sans modifier les données
node scripts/migrate-sqlite-to-postgres.mjs --dry-run
```

### 3. Migration réelle

```bash
# Exécuter la migration
node scripts/migrate-sqlite-to-postgres.mjs
```

**Le script:**

- ✅ Se connecte à SQLite (readonly)
- ✅ Se connecte à PostgreSQL
- ✅ Migre les tables dans l'ordre des dépendances
- ✅ Gère les IDs, timestamps, booléens, JSON
- ✅ Utilise `ON CONFLICT DO NOTHING` pour éviter les doublons
- ✅ Affiche la progression et les erreurs
- ✅ Vérifie les counts à la fin

### 4. Vérification post-migration

```bash
# Vérifier les counts manuellement
psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM \"Project\";"
psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM \"AssistantConfirmation\";"
psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM \"User\";"
psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM \"Notification\";"

# Comparer avec SQLite
sqlite3 prisma/dev.db "SELECT COUNT(*) FROM Project;"
sqlite3 prisma/dev.db "SELECT COUNT(*) FROM AssistantConfirmation;"
sqlite3 prisma/dev.db "SELECT COUNT(*) FROM User;"
sqlite3 prisma/dev.db "SELECT COUNT(*) FROM Notification;"
```

---

## 🔒 Phase F - Sécuriser le switch DB

Le fichier `src/app/api/admin/database/switch/route.ts` est déjà bien configuré:

- ✅ Ne modifie pas `schema.prisma`
- ✅ Ne modifie pas `migration_lock.toml`
- ✅ Protection prod avec `ALLOW_PROD_DB`
- ✅ Logs sanitizés

### Vérifications supplémentaires:

```bash
# Vérifier que le switch ne touche pas aux fichiers critiques
grep -n "schema.prisma\|migration_lock" src/app/api/admin/database/switch/route.ts

# Devrait retourner des commentaires uniquement, pas de modifications
```

### Protection prod renforcée:

Le code vérifie déjà:

- `ALLOW_PROD_DB !== "1"` bloque les URLs prod
- Détection des URLs prod (neon.tech, vercel, production, prod)
- Logs sanitizés (pas de credentials)

---

## ✅ Phase G - Validation finale

### 1. Générer Prisma Client

```bash
pnpm run prisma:generate
```

### 2. Valider le schema

```bash
pnpm prisma validate
```

### 3. Mettre à jour .env.local

```bash
# Changer DATABASE_URL pour pointer vers PostgreSQL local
# Remplacer dans .env.local:
# DATABASE_URL=file:./prisma/dev.db
# Par:
DATABASE_URL="postgresql://djlarian:<DEV_DB_PASSWORD>@127.0.0.1:5433/djlarian_dev?sslmode=disable"

# Ou utiliser DATABASE_URL_LOCAL et laisser le switch DB gérer
```

### 4. Démarrer l'app

```bash
pnpm run dev
```

**Vérifier:**

- ✅ Pas d'erreurs Prisma au démarrage
- ✅ L'app se connecte à PostgreSQL
- ✅ Les données sont accessibles

### 5. Lancer les tests

```bash
# Tests assistant router
pnpm run test:assistant-router

# Tests assistant identity
pnpm run test:assistant-identity

# Vérifier qu'il n'y a pas de .skip
pnpm run test:no-skips
```

### 6. Vérifier que l'erreur P2021 est impossible

L'erreur P2021 (table does not exist) ne devrait plus apparaître car:

- ✅ Schema.prisma pointe vers PostgreSQL
- ✅ Migrations appliquées sur PostgreSQL
- ✅ Données migrées

---

## 🔄 Commandes de reset (si besoin)

### Reset PostgreSQL local (DESTRUCTIF)

```bash
# Arrêter et supprimer le volume
docker compose down -v

# Redémarrer
docker compose up -d

# Réappliquer les migrations
pnpm prisma migrate deploy

# Re-migrer les données depuis SQLite
node scripts/migrate-sqlite-to-postgres.mjs
```

### Restaurer depuis SQLite backup

```bash
# Si besoin de restaurer SQLite
cp prisma/dev.db.backup.YYYY-MM-DDTHH-MM-SS prisma/dev.db
```

---

## 📝 Checklist finale

- [ ] Docker PostgreSQL démarré et healthy
- [ ] `schema.prisma` avec `provider = "postgresql"` (ligne 8)
- [ ] Ligne `url = env("DATABASE_URL")` supprimée de `schema.prisma`
- [ ] `DATABASE_URL_LOCAL` configuré dans `.env.local`
- [ ] Migrations appliquées sur PostgreSQL (`pnpm prisma migrate deploy`)
- [ ] Données SQLite migrées vers PostgreSQL
- [ ] Counts vérifiés (SQLite = PostgreSQL)
- [ ] `DATABASE_URL` dans `.env.local` pointe vers PostgreSQL local
- [ ] `pnpm run prisma:generate` exécuté
- [ ] `pnpm prisma validate` passe
- [ ] `pnpm run dev` démarre sans erreurs
- [ ] Tests passent
- [ ] Switch DB fonctionne et est sécurisé

---

## 🆘 Troubleshooting

### Erreur: "Cannot connect to Docker daemon"

```bash
# Démarrer Docker Desktop
open -a Docker

# Attendre que Docker soit prêt, puis:
docker compose up -d
```

### Erreur: "relation does not exist"

```bash
# Les migrations ne sont pas appliquées
pnpm prisma migrate deploy
```

### Erreur: "P1012: url is no longer supported"

```bash
# Supprimer la ligne `url = env("DATABASE_URL")` de schema.prisma
# Prisma 7 utilise prisma.config.ts pour l'URL
```

### Erreur: "duplicate key value"

```bash
# La migration a déjà été partiellement exécutée
# Vérifier les données et nettoyer si nécessaire
psql "$DATABASE_URL" -c "SELECT * FROM \"_prisma_migrations\";"
```

---

## 📚 Références

- [Prisma 7 Migration Guide](https://www.prisma.io/docs/guides/upgrade-guides/upgrading-versions/upgrading-to-prisma-7)
- [Docker Compose PostgreSQL](https://hub.docker.com/_/postgres)
- [SQLite to PostgreSQL Migration](https://www.postgresql.org/docs/current/sql-copy.html)
