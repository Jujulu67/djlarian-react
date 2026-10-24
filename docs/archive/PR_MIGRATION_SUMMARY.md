# 📦 PR: Migration SQLite → PostgreSQL Local

## 🎯 Objectif

Migrer la base locale SQLite vers PostgreSQL local (Docker) sans perte de données, stabiliser Prisma/migrations et ne rien casser dans le switch DB, scripts Vercel/CI, et flows Prisma.

## ✅ Contraintes Respectées

1. ✅ **Zéro écriture sur DB prod par défaut** - Protection `ALLOW_PROD_DB=1` requise
2. ✅ **Aucun script ne réécrit `schema.prisma` ni `migration_lock.toml`** - Vérifié dans tous les scripts
3. ✅ **Backup SQLite obligatoire avant migration** - Script `backup-sqlite.mjs` avec preuve
4. ✅ **Vérifications post-migration** - Counts + checks FK + smoke tests

## 📋 Changements

### Fichiers Créés

- `scripts/backup-sqlite.mjs` - Backup binaire + dump SQL avant migration
- `scripts/restore-sqlite-from-backup.mjs` - Restauration depuis backup SQLite
- `docs/ENV_LOCAL_SETUP.md` - Configuration .env.local
- `docs/RESTORE_SQLITE_BACKUP.md` - Guide restauration
- `docs/RUNBOOK_POSTGRES_LOCAL.md` - Runbook opérationnel PostgreSQL local
- `CHECKLIST_MIGRATION_FINALE.md` - Checklist d'exécution complète

### Fichiers Modifiés

- `prisma/schema.prisma` - `provider = "postgresql"` (pas de `url` - Prisma 7)
- `scripts/migrate-sqlite-to-postgres.mjs` - Intègre backup obligatoire
- `scripts/migrate-to-postgres-local.sh` - Fail fast + checks améliorés
- `package.json` - `db:bootstrap` simplifié (migrate deploy + generate)
- `.gitignore` - Patterns backups SQLite + `docker-compose.override.yml`

### Fichiers Vérifiés (Non Modifiés)

- `docker-compose.yml` - ✅ Déjà correct (commité)
- `prisma.config.ts` - ✅ Gère déjà `datasource.url` avec switch DB
- `src/app/api/admin/database/switch/route.ts` - ✅ Protection prod active
- `scripts/ensure-postgresql-schema.sh` - ✅ Utilise `migrate deploy` (pas `db push`)

## 🔐 Sécurité

- ✅ Protection prod: `ALLOW_PROD_DB=1` requis pour connexion prod
- ✅ Logs sanitizés: Pas de credentials dans les logs
- ✅ Switch DB: Ne modifie jamais `schema.prisma` ni `migration_lock.toml`
- ✅ Backups gitignored: `.env.local`, `prisma/dev.db.backup.*`, `dumps/`

## 📚 Documentation

### Configuration

- **`.env.local`**: Voir `docs/ENV_LOCAL_SETUP.md`
- **Docker Compose**: `docker-compose.yml` (commité, standard dev)

### Migration

- **Guide complet**: `docs/MIGRATION_SQLITE_TO_POSTGRES.md`
- **Commandes**: `MIGRATION_COMMANDES.md`
- **Quick start**: `QUICK_START_MIGRATION.md`

### Opérations

- **Runbook**: `docs/RUNBOOK_POSTGRES_LOCAL.md`
- **Restauration**: `docs/RESTORE_SQLITE_BACKUP.md`
- **Checklist**: `CHECKLIST_MIGRATION_FINALE.md`

## 🚀 Exécution

### Script Automatisé (Recommandé)

```bash
bash scripts/migrate-to-postgres-local.sh
```

### Étapes Manuelles

Voir `CHECKLIST_MIGRATION_FINALE.md` pour les commandes exactes.

## ✅ Critères d'Acceptation

- [x] Schema.prisma corrigé (`provider = "postgresql"`)
- [x] Scripts backup/restore créés
- [x] Protection prod active (`ALLOW_PROD_DB`)
- [x] Scripts Vercel vérifiés (`migrate deploy`, pas `db push`)
- [x] Documentation complète
- [ ] Migration exécutée (à faire par l'utilisateur)
- [ ] Tests passent (à vérifier après migration)
- [ ] App fonctionne (à vérifier après migration)

## 🔄 Rollback

Si besoin de revenir à SQLite:

```bash
# Restaurer depuis backup
node scripts/restore-sqlite-from-backup.mjs <backup_path>

# Modifier .env.local
DATABASE_URL="file:./prisma/dev.db"
```

## 📝 Notes

- **Prisma 7**: `url` n'est plus dans `schema.prisma`, géré par `prisma.config.ts`
- **Docker Compose**: Commité (standard dev), `docker-compose.override.yml` gitignored
- **Backups**: Créés automatiquement avant migration, gitignored
- **Tests**: Doivent rester DB-free (mocks) ou utiliser DB de test isolée

---

**PR prêt pour review! 🎉**
