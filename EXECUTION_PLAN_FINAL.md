# 🎯 Plan d'Exécution Final - Migration SQLite → PostgreSQL Local

## ✅ État Actuel (Audit Complété)

### Fichiers Vérifiés

- ✅ `prisma/schema.prisma`: `provider = "postgresql"` (pas de `url` - Prisma 7)
- ✅ `prisma.config.ts`: Gère `datasource.url` avec switch DB
- ✅ `docker-compose.yml`: Configuré pour PostgreSQL local (commité)
- ✅ `src/app/api/admin/database/switch/route.ts`: Protection `ALLOW_PROD_DB` active
- ✅ `scripts/ensure-postgresql-schema.sh`: Utilise `migrate deploy` (priorité) + `db push` (fallback)

### Scripts Créés

- ✅ `scripts/backup-sqlite.mjs` - Backup binaire + dump SQL
- ✅ `scripts/restore-sqlite-from-backup.mjs` - Restauration depuis backup
- ✅ `scripts/migrate-sqlite-to-postgres.mjs` - Migration données (amélioré avec backup obligatoire)
- ✅ `scripts/migrate-to-postgres-local.sh` - Script automatisé complet

### Documentation Créée

- ✅ `docs/ENV_LOCAL_SETUP.md` - Configuration .env.local
- ✅ `docs/RESTORE_SQLITE_BACKUP.md` - Guide restauration
- ✅ `docs/RUNBOOK_POSTGRES_LOCAL.md` - Runbook opérationnel
- ✅ `CHECKLIST_MIGRATION_FINALE.md` - Checklist d'exécution
- ✅ `PR_MIGRATION_SUMMARY.md` - Résumé pour PR

## 🚀 Exécution (Ordre Obligatoire)

### 1. Démarrer PostgreSQL Local

```bash
docker compose up -d
docker compose ps  # Vérifier: Up (healthy)
```

### 2. Configurer .env.local

```bash
# Créer .env.local avec:
DATABASE_URL="postgresql://djlarian:djlarian_dev_password@localhost:5432/djlarian_dev?sslmode=disable"
```

Voir `docs/ENV_LOCAL_SETUP.md` pour la configuration complète.

### 3. Bootstrap Schéma Postgres

```bash
pnpm run prisma:generate
pnpm prisma validate
pnpm prisma migrate deploy
pnpm prisma migrate status  # Devrait afficher: "Database schema is up to date"
```

### 4. Backup SQLite (OBLIGATOIRE)

```bash
node scripts/backup-sqlite.mjs

# Vérifier backup créé
ls -lh prisma/dev.db.backup.*
ls -lh dumps/dev.db.*.sql
```

### 5. Migration Données

```bash
# Dry-run d'abord (OBLIGATOIRE)
node scripts/migrate-sqlite-to-postgres.mjs --dry-run

# Vérifier le résumé du dry-run
# - Counts par table (SQLite vs Postgres attendu)
# - Éventuels conflits/contraintes

# Migration réelle
node scripts/migrate-sqlite-to-postgres.mjs

# Vérifications post-migration
psql "$DATABASE_URL" -c 'SELECT COUNT(*) FROM "Project";'
psql "$DATABASE_URL" -c 'SELECT COUNT(*) FROM "AssistantConfirmation";'
sqlite3 prisma/dev.db "SELECT COUNT(*) FROM Project;"  # Comparer
```

### 6. Validation Finale

```bash
# App démarre
pnpm run dev
# Vérifier: Pas d'erreurs Prisma, connexion PostgreSQL OK

# Tests critiques
pnpm run test:assistant-router
pnpm run test:assistant-identity
pnpm run test:no-skips

# Smoke test API (optionnel)
# Tester /api/projects/batch-update (idempotency + concurrency)
```

## ✅ Critères d'Acceptation

- [ ] `pnpm run dev` fonctionne avec Postgres local
- [ ] Aucune perte de données (counts SQLite = PostgreSQL)
- [ ] Plus aucune erreur P2021 sur `AssistantConfirmation`
- [ ] Switch DB safe (prod protégé, `ALLOW_PROD_DB` requis)
- [ ] Tous les tests critiques passent
- [ ] Documentation à jour

## 🔄 Rollback (si besoin)

```bash
# Restaurer SQLite depuis backup
node scripts/restore-sqlite-from-backup.mjs <backup_path>

# Modifier .env.local
DATABASE_URL="file:./prisma/dev.db"
```

## 📚 Documentation

- **Configuration**: `docs/ENV_LOCAL_SETUP.md`
- **Restauration**: `docs/RESTORE_SQLITE_BACKUP.md`
- **Runbook**: `docs/RUNBOOK_POSTGRES_LOCAL.md`
- **Checklist**: `CHECKLIST_MIGRATION_FINALE.md`
- **PR Summary**: `PR_MIGRATION_SUMMARY.md`

---

**Tout est prêt pour l'exécution! 🚀**
