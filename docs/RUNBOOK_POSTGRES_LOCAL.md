# Runbook PostgreSQL Local

Guide opérationnel pour PostgreSQL local (Docker).

## 🚀 Démarrage Rapide

### 1. Démarrer PostgreSQL

```bash
docker compose up -d
docker compose ps  # Vérifier: Up (healthy)
```

### 2. Configurer .env.local

Voir `docs/ENV_LOCAL_SETUP.md` pour la configuration complète.

```bash
DATABASE_URL="postgresql://djlarian:djlarian_dev_password@127.0.0.1:5433/djlarian_dev?sslmode=disable"
```

### 3. Bootstrap Schéma

```bash
pnpm run prisma:generate
pnpm prisma migrate deploy
pnpm prisma migrate status
```

## 📋 Commandes Utiles

### Base de Données

```bash
# Générer Prisma Client
pnpm run prisma:generate

# Appliquer migrations
pnpm prisma migrate deploy

# Vérifier statut migrations
pnpm prisma migrate status

# Valider schema
pnpm prisma validate

# Prisma Studio (GUI)
pnpm run db:studio
```

### Reset Local

```bash
# Reset complet (wipe volume Docker + réappliquer migrations)
pnpm run db:reset:local

# Équivalent manuel
docker compose down -v
docker compose up -d
sleep 3
export DATABASE_URL="postgresql://djlarian:djlarian_dev_password@127.0.0.1:5433/djlarian_dev?sslmode=disable"
pnpm prisma migrate deploy
```

### Backup & Restore

```bash
# Backup SQLite (avant migration)
node scripts/backup-sqlite.mjs

# Restaurer depuis backup SQLite
node scripts/restore-sqlite-from-backup.mjs <backup_path>
```

### Migration Données

```bash
# Dry-run (simulation)
node scripts/migrate-sqlite-to-postgres.mjs --dry-run

# Migration réelle
node scripts/migrate-sqlite-to-postgres.mjs

# Script complet (recommandé)
bash scripts/migrate-to-postgres-local.sh
```

## 🔍 Vérifications

### Connexion PostgreSQL

```bash
# Test rapide
psql "$DATABASE_URL" -c "\dt"

# Ou avec Node.js
node -e "const {Pool}=require('pg');const p=new Pool({connectionString:'$DATABASE_URL'});p.query('SELECT 1').then(()=>{console.log('✅ OK');p.end()}).catch(e=>{console.error('❌',e.message);p.end()})"
```

### Tables Créées

```bash
# Lister toutes les tables
psql "$DATABASE_URL" -c "\dt"

# Compter les tables
psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';"

# Vérifier table spécifique
psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM \"AssistantConfirmation\";"
psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM \"Project\";"
```

### Migrations

```bash
# Statut des migrations
pnpm prisma migrate status

# Historique des migrations appliquées
psql "$DATABASE_URL" -c "SELECT * FROM \"_prisma_migrations\" ORDER BY finished_at DESC LIMIT 10;"
```

## 🐛 Troubleshooting

### PostgreSQL ne démarre pas

```bash
# Vérifier les logs
docker compose logs postgres

# Vérifier que le port 5432 est libre
lsof -i :5432

# Redémarrer
docker compose restart postgres
```

### Erreur "relation does not exist"

```bash
# Les migrations ne sont pas appliquées
pnpm prisma migrate deploy

# Vérifier que les tables existent
psql "$DATABASE_URL" -c "\dt"
```

### Erreur de connexion

```bash
# Vérifier que PostgreSQL tourne
docker compose ps

# Vérifier DATABASE_URL
echo $DATABASE_URL

# Tester la connexion
psql "$DATABASE_URL" -c "SELECT 1;"
```

### Reset Complet

```bash
# Supprimer volume Docker (DESTRUCTIF - supprime toutes les données)
docker compose down -v

# Redémarrer
docker compose up -d

# Réappliquer migrations
pnpm run db:bootstrap
```

## 📊 Monitoring

### Taille de la Base

```bash
psql "$DATABASE_URL" -c "SELECT pg_size_pretty(pg_database_size('djlarian_dev'));"
```

### Connexions Actives

```bash
psql "$DATABASE_URL" -c "SELECT count(*) FROM pg_stat_activity WHERE datname = 'djlarian_dev';"
```

### Tables les Plus Grosses

```bash
psql "$DATABASE_URL" -c "SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size FROM pg_tables WHERE schemaname = 'public' ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC LIMIT 10;"
```

## 🔐 Sécurité

- ✅ Credentials dans `.env.local` (gitignored)
- ✅ Protection prod avec `ALLOW_PROD_DB`
- ✅ Logs sanitizés (pas de credentials)
- ✅ Switch DB ne modifie jamais `schema.prisma` ni `migration_lock.toml`

## 📚 Documentation Associée

- Configuration: `docs/ENV_LOCAL_SETUP.md`
- Restauration SQLite: `docs/RESTORE_SQLITE_BACKUP.md`
- Migration complète: `docs/MIGRATION_SQLITE_TO_POSTGRES.md`
