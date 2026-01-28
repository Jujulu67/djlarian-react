# ✅ Checklist Migration SQLite → PostgreSQL Local

## 📋 Commandes d'Exécution (Ordre Obligatoire)

### Phase A - Audit (✅ COMPLÉTÉ)

- [x] Schema.prisma: `provider = "postgresql"` (pas de `url`)
- [x] prisma.config.ts: Gère `datasource.url` avec switch DB
- [x] Migrations: Présentes dans `prisma/migrations/`
- [x] Switch DB: Protection `ALLOW_PROD_DB` active

### Phase B - Setup PostgreSQL Local

```bash
# 1. Démarrer PostgreSQL
docker compose up -d
docker compose ps  # Vérifier: Up (healthy)

# 2. Configurer .env.local
# Voir docs/ENV_LOCAL_SETUP.md
DATABASE_URL="postgresql://djlarian:djlarian_dev_password@localhost:5432/djlarian_dev?sslmode=disable"

# 3. Vérifier connexion
psql "$DATABASE_URL" -c "\dt"
```

**Vérifications:**

- [ ] Docker PostgreSQL démarré et healthy
- [ ] `.env.local` configuré avec `DATABASE_URL`
- [ ] Connexion PostgreSQL testée

### Phase C - Bootstrap Schéma Postgres

```bash
# 1. Générer Prisma Client
pnpm run prisma:generate

# 2. Valider schema
pnpm prisma validate

# 3. Appliquer migrations
pnpm prisma migrate deploy

# 4. Vérifier statut
pnpm prisma migrate status

# 5. Vérifier tables clés
psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM \"AssistantConfirmation\";"
psql "$DATABASE_URL" -c "\dt" | grep -E "(User|Project|AssistantConfirmation)"
```

**Vérifications:**

- [ ] `pnpm prisma validate` passe
- [ ] `pnpm prisma migrate deploy` réussit
- [ ] `pnpm prisma migrate status` = "Database schema is up to date"
- [ ] Table `AssistantConfirmation` existe
- [ ] Autres tables clés existent

### Phase D - Backup SQLite (OBLIGATOIRE)

```bash
# Créer backup binaire + dump SQL
node scripts/backup-sqlite.mjs

# Vérifier backup créé
ls -lh prisma/dev.db.backup.*
ls -lh dumps/dev.db.*.sql
```

**Vérifications:**

- [ ] Backup binaire créé: `prisma/dev.db.backup.<timestamp>`
- [ ] Dump SQL créé: `dumps/dev.db.<timestamp>.sql`
- [ ] Preuve de backup affichée dans console

### Phase E - Migration Données

```bash
# 1. Dry-run (simulation - OBLIGATOIRE)
node scripts/migrate-sqlite-to-postgres.mjs --dry-run

# 2. Vérifier le résumé du dry-run
# - Counts par table (SQLite vs Postgres attendu)
# - Éventuels conflits/contraintes

# 3. Migration réelle
node scripts/migrate-sqlite-to-postgres.mjs

# 4. Vérifications post-migration
psql "$DATABASE_URL" -c 'SELECT COUNT(*) FROM "Project";'
psql "$DATABASE_URL" -c 'SELECT COUNT(*) FROM "AssistantConfirmation";'
psql "$DATABASE_URL" -c 'SELECT COUNT(*) FROM "User";'

# Comparer avec SQLite
sqlite3 prisma/dev.db "SELECT COUNT(*) FROM Project;"
sqlite3 prisma/dev.db "SELECT COUNT(*) FROM AssistantConfirmation;"
sqlite3 prisma/dev.db "SELECT COUNT(*) FROM User;"
```

**Vérifications:**

- [ ] Dry-run exécuté sans erreurs
- [ ] Counts SQLite = Counts PostgreSQL (tables principales)
- [ ] Migration réelle réussie
- [ ] Vérifications ciblées: projets avec collab/style/deadline/notes
- [ ] Vérifications ciblées: confirmations assistant

### Phase F - Vérification Switch DB

```bash
# 1. Vérifier protection prod
# Tester sans ALLOW_PROD_DB=1 (doit bloquer)
# (via interface admin ou curl)

# 2. Vérifier logs sanitizés
# Les logs ne doivent pas contenir de credentials
```

**Vérifications:**

- [ ] Switch DB ne modifie pas `schema.prisma`
- [ ] Switch DB ne modifie pas `migration_lock.toml`
- [ ] Protection prod active (`ALLOW_PROD_DB` requis)
- [ ] Logs sanitizés (pas de credentials)

### Phase G - Vérification Scripts Vercel/CI

```bash
# Vérifier ensure-postgresql-schema.sh
grep -n "migrate deploy\|db push" scripts/ensure-postgresql-schema.sh

# Devrait utiliser "migrate deploy" (pas "db push")
```

**Vérifications:**

- [ ] Scripts Vercel utilisent `prisma migrate deploy` (pas `db push`)
- [ ] `package.json` build script utilise `ensure-postgresql-schema.sh`
- [ ] CI workflows cohérents

### Phase H - Critères d'Acceptation

```bash
# 1. App démarre
pnpm run dev
# Vérifier: Pas d'erreurs Prisma, connexion PostgreSQL OK

# 2. Tests critiques
pnpm run test:assistant-router
pnpm run test:assistant-identity
pnpm run test:no-skips

# 3. Smoke test API
# Tester /api/projects/batch-update (idempotency + concurrency)
```

**Vérifications:**

- [ ] `pnpm run dev` fonctionne avec Postgres local
- [ ] Aucune perte de données (counts + vérifs ciblées)
- [ ] Plus aucune erreur P2021 sur `AssistantConfirmation`
- [ ] Switch DB safe (prod protégé)
- [ ] Tous les tests critiques passent
- [ ] Smoke test API réussi

## 📚 Documentation

- [x] `docs/ENV_LOCAL_SETUP.md` - Configuration .env.local
- [x] `docs/RESTORE_SQLITE_BACKUP.md` - Restauration depuis backup
- [x] `docs/RUNBOOK_POSTGRES_LOCAL.md` - Runbook opérationnel
- [x] `docs/MIGRATION_SQLITE_TO_POSTGRES.md` - Guide complet migration

## 🔄 Commandes de Reset (si besoin)

```bash
# Reset PostgreSQL local (DESTRUCTIF)
pnpm run db:reset:local

# Restaurer SQLite depuis backup
node scripts/restore-sqlite-from-backup.mjs <backup_path>
```

## ✅ Livrables PR

- [x] `docker-compose.yml` commité + docs
- [x] Scripts migration (`migrate-sqlite-to-postgres.mjs`)
- [x] Scripts backup/restore (`backup-sqlite.mjs`, `restore-sqlite-from-backup.mjs`)
- [x] Script bootstrap (`migrate-to-postgres-local.sh`)
- [x] Garde-fous switch DB (`ALLOW_PROD_DB`)
- [x] Backups/dumps gitignored
- [x] Checklist finale (`CHECKLIST_MIGRATION_FINALE.md`)
- [x] Documentation complète (runbook, setup, restore)

---

**Migration prête à être exécutée! 🚀**
