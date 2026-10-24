# 🔄 Recovery Runbook - Restauration Base de Données Locale

## 📋 Vue d'ensemble

Ce runbook décrit comment restaurer les données de la base PostgreSQL locale après un wipe accidentel ou une perte de données.

## 🚨 Diagnostic Rapide

### Vérifier si la base est vide

```bash
# Compter les enregistrements dans les tables clés
psql "postgresql://djlarian:<DEV_DB_PASSWORD>@127.0.0.1:5433/djlarian_dev?sslmode=disable" \
  -c "SELECT 'User' as table_name, COUNT(*) as count FROM \"User\" \
      UNION ALL SELECT 'Project', COUNT(*) FROM \"Project\" \
      UNION ALL SELECT 'Track', COUNT(*) FROM \"Track\" \
      UNION ALL SELECT 'Event', COUNT(*) FROM \"Event\" \
      UNION ALL SELECT 'Notification', COUNT(*) FROM \"Notification\";"
```

**Si tous les compteurs sont à 0** → Base vide, restauration nécessaire.

### Vérifier DATABASE_URL

```bash
# Vérifier que DATABASE_URL pointe vers localhost:5433
grep DATABASE_URL .env.local | head -1
```

**Doit contenir**: `localhost:5433` ou `127.0.0.1:5433`

**Si contient**: `neon.tech`, `vercel`, `production` → ⚠️ **PROTECTION**: Ne pas restaurer vers prod!

## 🔍 Identifier le Backup

### Lister les backups disponibles

```bash
# Lister tous les backups SQLite
ls -lth prisma/dev.db.backup.* | head -5
```

### Choisir le backup le plus récent

Le backup le plus récent est généralement le meilleur choix:

```bash
# Afficher le backup le plus récent
ls -t prisma/dev.db.backup.* | head -1
```

**Format**: `prisma/dev.db.backup.2025-12-14T14-01-57`

## 🔄 Restauration

### Option 1: Script Automatique (Recommandé)

```bash
# 1. Lister les backups disponibles
node scripts/restore-sqlite-backup-to-postgres.mjs

# 2. Restaurer depuis le backup le plus récent
node scripts/restore-sqlite-backup-to-postgres.mjs prisma/dev.db.backup.2025-12-14T14-01-57
```

Le script va:

1. ✅ Vérifier que DATABASE_URL pointe vers localhost
2. ✅ Afficher les compteurs avant/après
3. ✅ Restaurer le backup SQLite temporairement
4. ✅ Migrer les données vers PostgreSQL
5. ✅ Nettoyer le fichier SQLite temporaire

### Option 2: Restauration Manuelle

Si le script automatique échoue:

```bash
# 1. Restaurer le backup SQLite
cp prisma/dev.db.backup.2025-12-14T14-01-57 prisma/dev.db

# 2. Migrer vers PostgreSQL
node scripts/migrate-sqlite-to-postgres.mjs
```

## ✅ Vérification Post-Restauration

### Vérifier les compteurs

```bash
psql "postgresql://djlarian:<DEV_DB_PASSWORD>@127.0.0.1:5433/djlarian_dev?sslmode=disable" \
  -c "SELECT 'User' as table_name, COUNT(*) as count FROM \"User\" \
      UNION ALL SELECT 'Project', COUNT(*) FROM \"Project\" \
      UNION ALL SELECT 'Track', COUNT(*) FROM \"Track\" \
      UNION ALL SELECT 'Event', COUNT(*) FROM \"Event\" \
      UNION ALL SELECT 'Notification', COUNT(*) FROM \"Notification\";"
```

**Attendu**: Compteurs > 0 (selon vos données)

### Vérifier les données critiques

```bash
# Vérifier quelques projets
psql "postgresql://djlarian:<DEV_DB_PASSWORD>@127.0.0.1:5433/djlarian_dev?sslmode=disable" \
  -c "SELECT id, name, status FROM \"Project\" LIMIT 5;"

# Vérifier quelques utilisateurs
psql "postgresql://djlarian:<DEV_DB_PASSWORD>@127.0.0.1:5433/djlarian_dev?sslmode=disable" \
  -c "SELECT id, email, name FROM \"User\" LIMIT 5;"
```

## 🛡️ Prévention: Garde-fous Actifs

### db:reset:local est maintenant sécurisé

Le script `db:reset:local` nécessite maintenant:

```bash
# ❌ SANS protection (refusé)
pnpm run db:reset:local

# ✅ AVEC protection (requis)
ALLOW_DB_WIPE_LOCAL=1 DB_WIPE_CONFIRM=$(date +%s) pnpm run db:reset:local
```

**Protections**:

- ✅ Vérifie `ALLOW_DB_WIPE_LOCAL=1`
- ✅ Vérifie `DB_WIPE_CONFIRM` (timestamp récent < 5 min)
- ✅ Vérifie que DATABASE_URL pointe vers localhost:5433
- ✅ Refuse si domaines de production détectés
- ✅ Demande confirmation finale (taper "WIPE")

### dev:auto ne fait jamais de wipe

Le script `dev:auto` ne contient **aucun** `docker compose down -v`.

Vérification:

```bash
# Vérifier que dev:auto ne contient pas de wipe
grep -n "docker compose down -v" scripts/start-dev-with-auto-restart.sh
# (ne devrait rien retourner)
```

## 📊 Commandes Utiles

### Créer un nouveau backup

```bash
# Si vous avez encore accès à SQLite
node scripts/backup-sqlite.mjs
```

### Vérifier l'état de PostgreSQL

```bash
# Vérifier que PostgreSQL est démarré
docker compose ps

# Vérifier les logs
docker compose logs postgres | tail -20
```

### Tester les garde-fous

```bash
# Lancer les tests de sécurité
node scripts/test-db-safety-guards.mjs
```

## 🚨 Cas d'Urgence

### Si aucun backup n'est disponible

1. **Vérifier les dumps SQL** (si disponibles):

   ```bash
   ls -lth dumps/*.sql | head -5
   ```

2. **Vérifier les backups Docker volumes**:

   ```bash
   docker volume ls | grep postgres
   ```

3. **Vérifier les snapshots Vercel** (si applicable):
   - Aller sur Vercel Dashboard
   - Vérifier les backups de base de données

### Si la restauration échoue

1. **Vérifier les logs**:

   ```bash
   docker compose logs postgres | tail -50
   ```

2. **Vérifier les migrations**:

   ```bash
   pnpm prisma migrate status
   ```

3. **Vérifier la connexion**:
   ```bash
   psql "postgresql://djlarian:<DEV_DB_PASSWORD>@127.0.0.1:5433/djlarian_dev?sslmode=disable" -c "SELECT 1;"
   ```

## 📝 Checklist de Restauration

- [ ] Diagnostic: Base vide confirmée
- [ ] DATABASE_URL vérifié (localhost:5433)
- [ ] Backup identifié (le plus récent)
- [ ] Restauration exécutée
- [ ] Compteurs vérifiés (avant/après)
- [ ] Données critiques vérifiées
- [ ] Tests applicatifs passent
- [ ] Backup créé après restauration (si données modifiées)

## 🔗 Scripts Disponibles

| Script                                  | Usage                                          |
| --------------------------------------- | ---------------------------------------------- |
| `restore-sqlite-backup-to-postgres.mjs` | Restaurer depuis backup SQLite vers PostgreSQL |
| `migrate-sqlite-to-postgres.mjs`        | Migrer SQLite → PostgreSQL (si SQLite existe)  |
| `backup-sqlite.mjs`                     | Créer un backup SQLite                         |
| `reset-db-local-safe.sh`                | Reset sécurisé (avec garde-fous)               |
| `test-db-safety-guards.mjs`             | Tester les garde-fous                          |

## ⚠️ Notes Importantes

1. **Ne jamais restaurer vers la production** sans vérification explicite
2. **Toujours vérifier DATABASE_URL** avant restauration
3. **Créer un backup** avant toute opération risquée
4. **Tester les garde-fous** régulièrement avec `test-db-safety-guards.mjs`
