# Résumé Migration Prisma — PostgreSQL Local

**Date**: 2025-01-XX  
**Statut**: ✅ Implémentation terminée

---

## Fichiers Modifiés

### 1. `prisma/schema.prisma`

**Avant**:

```prisma
datasource db {
  provider = "sqlite"
  // ...
}
```

**Après**:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  // ...
}
```

**Impact**: Schema.prisma est maintenant toujours PostgreSQL (source de vérité unique)

---

### 2. `src/app/api/admin/database/switch/route.ts`

**Changements**:

- ❌ **Supprimé**: Modification de `schema.prisma` (lignes 35-48)
- ❌ **Supprimé**: Modification de `migration_lock.toml` (lignes 50-82)
- ✅ **Ajouté**: Protection anti-prod avec `ALLOW_PROD_DB=1` (lignes 131-145)
- ✅ **Modifié**: Switch local utilise `DATABASE_URL_LOCAL` ou URL par défaut (lignes 173-200)

**Impact**: Le switch ne modifie plus jamais `schema.prisma` ni `migration_lock.toml`, seulement `.env.local`

---

### 3. `src/lib/prisma.ts`

**Changements**:

- ❌ **Supprimé**: Synchronisation automatique de `schema.prisma` (lignes 67-181)
- ✅ **Simplifié**: Vérification simple du switch et utilisation de `DATABASE_URL_PRODUCTION` si nécessaire

**Impact**: Plus de modification automatique de `schema.prisma`, logique simplifiée

---

### 4. `package.json`

**Scripts modifiés**:

- `dev`: Supprimé `ensure-sqlite-schema.sh` (plus nécessaire)
- `db:setup:local`: Pointe maintenant vers `bootstrap-postgres-local.sh`
- `db:local`: Pointe maintenant vers `bootstrap-postgres-local.sh`
- `db:bootstrap`: Nouveau script pour bootstrap PostgreSQL
- `db:use:local`, `db:use:test`, `db:use:prod`: Nouveaux scripts (informatifs)
- `db:reset:local`: Mis à jour pour PostgreSQL
- ❌ **Supprimé**: `prisma:fix:schema` et `prisma:fix:migration-lock` (plus nécessaires)

---

## Fichiers Créés

### 1. `docs/PRISMA_AUDIT_LOCAL_POSTGRES.md`

Audit complet du pipeline Prisma avec risques identifiés et décisions techniques.

### 2. `docs/PRISMA_LOCAL_POSTGRES_RUNBOOK.md`

Guide complet pour setup PostgreSQL local (Docker + natif) avec toutes les commandes.

### 3. `docker-compose.yml`

Configuration Docker Compose pour PostgreSQL local.

### 4. `scripts/bootstrap-postgres-local.sh`

Script idempotent pour bootstrap PostgreSQL local (création DB, migrations, génération client).

---

## Commandes à Exécuter

### Setup Initial (Première fois)

#### Option 1: Docker Compose (Recommandé)

```bash
# 1. Démarrer PostgreSQL
docker-compose up -d

# 2. Configurer .env.local
echo 'DATABASE_URL="postgresql://djlarian:djlarian_dev_password@127.0.0.1:5433/djlarian_dev?sslmode=disable"' >> .env.local

# 3. Bootstrap la base de données
pnpm run db:bootstrap
```

#### Option 2: PostgreSQL Natif (macOS)

```bash
# 1. Installer PostgreSQL
brew install postgresql@16
brew services start postgresql@16

# 2. Créer la base de données
psql postgres -c "CREATE USER djlarian WITH PASSWORD 'djlarian_dev_password';"
psql postgres -c "CREATE DATABASE djlarian_dev OWNER djlarian;"

# 3. Configurer .env.local
echo 'DATABASE_URL="postgresql://djlarian:djlarian_dev_password@127.0.0.1:5433/djlarian_dev?sslmode=disable"' >> .env.local

# 4. Bootstrap la base de données
pnpm run db:bootstrap
```

---

### Commandes Quotidiennes

```bash
# Démarrer l'application
pnpm run dev

# Vérifier l'état des migrations
pnpm prisma migrate status

# Créer une nouvelle migration
pnpm run prisma:migrate:dev -- --name nom_migration

# Appliquer les migrations
pnpm run prisma:migrate:deploy

# Ouvrir Prisma Studio
pnpm run db:studio
```

---

### Switch DB (Admin Panel)

1. Aller dans l'admin panel → Database Switch
2. Activer/désactiver le switch PostgreSQL
3. Le serveur redémarre automatiquement

**Protection anti-prod**:

- Pour pointer vers prod, définir `ALLOW_PROD_DB=1` dans `.env.local`
- Sinon, le switch refuse de pointer vers une URL de production

---

## Vérification

### Vérifier que tout fonctionne

```bash
# 1. Vérifier le provider dans schema.prisma
grep 'provider =' prisma/schema.prisma
# Devrait afficher: provider = "postgresql"

# 2. Vérifier la connexion
pnpm prisma db execute --stdin <<< "SELECT 1;"

# 3. Vérifier les migrations
pnpm prisma migrate status
# Devrait afficher: "Database schema is up to date"

# 4. Lancer l'app
pnpm run dev
```

---

## Migration des Données SQLite → PostgreSQL (Optionnel)

Si vous avez des données dans `prisma/dev.db`:

```bash
# 1. Backup SQLite
cp prisma/dev.db prisma/dev.db.backup.$(date +%Y%m%d_%H%M%S)

# 2. Exporter les données (exemple pour Project)
sqlite3 prisma/dev.db ".mode insert Project" ".output projects.sql" "SELECT * FROM Project;"

# 3. Adapter le format SQL si nécessaire, puis importer
psql "$DATABASE_URL" < projects.sql
```

**Note**: Migration manuelle et optionnelle. Pour un démarrage propre, repartir avec une base vide est recommandé.

---

## Problèmes Connus et Solutions

### Erreur: "relation does not exist"

```bash
# Vérifier que les migrations sont appliquées
pnpm prisma migrate status

# Si des migrations sont en attente:
pnpm run prisma:migrate:deploy
```

### Erreur: "database does not exist"

```bash
# Docker
docker-compose exec postgres createdb -U djlarian djlarian_dev

# Natif
createdb -U djlarian djlarian_dev
```

### Erreur: "password authentication failed"

Vérifier `DATABASE_URL` dans `.env.local` et que l'utilisateur/mot de passe sont corrects.

---

## Scripts Legacy (À Éviter)

Les scripts suivants modifient encore `schema.prisma` et doivent être évités:

- ❌ `scripts/setup-local-db.sh` (modifie schema.prisma)
- ❌ `scripts/setup-production-db.sh` (modifie schema.prisma)

**Utiliser à la place**:

- ✅ `pnpm run db:bootstrap` (nouveau script, ne modifie pas schema.prisma)

---

## Vercel/CI

### Build Vercel

Le script `ensure-postgresql-schema.sh` est toujours utilisé dans le build:

- ✅ Vérifie que `schema.prisma` est en PostgreSQL
- ✅ Applique les migrations avec `migrate deploy`
- ⚠️ **Note**: Utilise encore `db push` en fallback (à supprimer dans une future version)

### CI GitHub Actions

- ✅ Tests passent sans modification
- ✅ Aucune action Prisma dans les workflows de test

---

## Critères d'Acceptation

- [x] Local runtime utilise PostgreSQL (plus SQLite)
- [x] Aucune réécriture automatique de `schema.prisma` / `migration_lock.toml`
- [x] Migrations s'appliquent sur une DB Postgres vierge sans erreur
- [x] Switch prod/test/dev fonctionne et est safe (prod protégé)
- [x] Vercel continue d'appliquer `migrate deploy` + generate
- [x] Tests + CI passent

---

**Fin du résumé**
