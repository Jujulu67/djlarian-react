# 🔧 Patch: Protection contre Wipe Accidentel + Restauration

## 📋 Résumé

Ce patch résout le problème de perte de données locale après un `db:reset:local` et ajoute des garde-fous pour empêcher les wipes accidentels.

## ✅ Diagnostic

**État actuel**: Base PostgreSQL locale vide (tous compteurs à 0)

- ✅ DATABASE_URL pointe vers `localhost:5433` (correct)
- ✅ Wipe confirmé (volume Docker supprimé)
- ✅ Backups SQLite disponibles: 8 backups trouvés

## 🔧 Corrections Appliquées

### 1. Script de Restauration (`restore-sqlite-backup-to-postgres.mjs`)

**Fichier**: `scripts/restore-sqlite-backup-to-postgres.mjs`

**Fonctionnalités**:

- ✅ Liste les backups disponibles
- ✅ Restaure depuis backup SQLite vers PostgreSQL
- ✅ Vérifie que DATABASE_URL pointe vers localhost
- ✅ Refuse si domaines de production détectés
- ✅ Affiche compteurs avant/après restauration
- ✅ Nettoie le fichier SQLite temporaire

**Usage**:

```bash
# Lister les backups
node scripts/restore-sqlite-backup-to-postgres.mjs

# Restaurer depuis backup
node scripts/restore-sqlite-backup-to-postgres.mjs prisma/dev.db.backup.2025-12-14T14-01-57
```

### 2. Script de Reset Sécurisé (`reset-db-local-safe.sh`)

**Fichier**: `scripts/reset-db-local-safe.sh`

**Protections**:

- ✅ Vérifie `ALLOW_DB_WIPE_LOCAL=1` (obligatoire)
- ✅ Vérifie `DB_WIPE_CONFIRM` (timestamp récent < 5 min)
- ✅ Vérifie que DATABASE_URL pointe vers `localhost:5433`
- ✅ Refuse si domaines de production détectés (`neon.tech`, `vercel`, etc.)
- ✅ Demande confirmation finale (taper "WIPE")

**Usage**:

```bash
# ❌ Sans protection (refusé)
pnpm run db:reset:local

# ✅ Avec protection (requis)
ALLOW_DB_WIPE_LOCAL=1 DB_WIPE_CONFIRM=$(date +%s) pnpm run db:reset:local
```

### 3. Script de Test des Garde-fous (`test-db-safety-guards.mjs`)

**Fichier**: `scripts/test-db-safety-guards.mjs`

**Tests**:

- ✅ `db:reset:local` refuse sans `ALLOW_DB_WIPE_LOCAL`
- ✅ `db:reset:local` refuse sans `DB_WIPE_CONFIRM`
- ✅ `db:reset:local` refuse si DATABASE_URL pointe vers prod
- ✅ `dev:auto` ne contient pas `docker compose down -v`
- ✅ `package.json` pointe vers le script sécurisé
- ✅ Aucune écriture manuelle de migrations (sauf baselines)

**Usage**:

```bash
pnpm run test:db-safety
# ou
node scripts/test-db-safety-guards.mjs
```

### 4. Documentation

**Fichiers créés**:

- `docs/RECOVERY_RUNBOOK.md`: Guide complet de restauration
- `RESTORATION_COMMANDES.md`: Commandes exactes pour restauration

## 🔄 Commandes de Restauration

### Restauration Rapide

```bash
# 1. Identifier le backup le plus récent
LATEST_BACKUP=$(ls -t prisma/dev.db.backup.* | head -1)
echo "Backup: $LATEST_BACKUP"

# 2. Restaurer
node scripts/restore-sqlite-backup-to-postgres.mjs "$LATEST_BACKUP"

# 3. Vérifier
psql "postgresql://djlarian:djlarian_dev_password@127.0.0.1:5433/djlarian_dev?sslmode=disable" \
  -c "SELECT 'User' as table_name, COUNT(*) as count FROM \"User\" \
      UNION ALL SELECT 'Project', COUNT(*) FROM \"Project\" \
      UNION ALL SELECT 'Track', COUNT(*) FROM \"Track\";"
```

### Restauration avec Backup Spécifique

```bash
node scripts/restore-sqlite-backup-to-postgres.mjs prisma/dev.db.backup.2025-12-14T14-01-57
```

## 🛡️ Garde-fous Actifs

### db:reset:local

**Avant** (dangereux):

```bash
pnpm run db:reset:local  # Wipe immédiat sans protection
```

**Après** (sécurisé):

```bash
pnpm run db:reset:local  # ❌ Refusé automatiquement

ALLOW_DB_WIPE_LOCAL=1 DB_WIPE_CONFIRM=$(date +%s) pnpm run db:reset:local
# ✅ Accepté avec protections + confirmation finale
```

### dev:auto

**Vérifié**: `dev:auto` ne contient **aucun** `docker compose down -v`

- ✅ Aucun risque de wipe accidentel
- ✅ Démarre seulement PostgreSQL si nécessaire

## 📊 Fichiers Modifiés/Créés

### Nouveaux Fichiers

1. `scripts/restore-sqlite-backup-to-postgres.mjs` (9.3K)
2. `scripts/reset-db-local-safe.sh` (7.6K)
3. `scripts/test-db-safety-guards.mjs` (7.5K)
4. `docs/RECOVERY_RUNBOOK.md` (6.3K)
5. `RESTORATION_COMMANDES.md` (2.1K)

### Fichiers Modifiés

1. `package.json`:
   - `db:reset:local` pointe maintenant vers `reset-db-local-safe.sh`
   - Ajout de `test:db-safety`

## ✅ Vérifications

### Tests des Garde-fous

```bash
pnpm run test:db-safety
```

**Résultats attendus**: 7 tests passés

### Vérification Absence Écriture Manuelle Migrations

✅ Aucune écriture manuelle trouvée (sauf baselines légitimes)

### Vérification dev:auto

✅ Aucun `docker compose down -v` dans `start-dev-with-auto-restart.sh`

## 🚨 Points d'Attention

1. **Toujours vérifier DATABASE_URL** avant restauration
2. **Ne jamais restaurer vers production** sans vérification explicite
3. **Créer un backup** avant toute opération risquée
4. **Utiliser les garde-fous** pour `db:reset:local`

## 📝 Prochaines Étapes

1. **Restauration immédiate** (si nécessaire):

   ```bash
   node scripts/restore-sqlite-backup-to-postgres.mjs prisma/dev.db.backup.2025-12-14T14-01-57
   ```

2. **Tester les garde-fous**:

   ```bash
   pnpm run test:db-safety
   ```

3. **Documenter** les procédures dans l'équipe

## 🔗 Références

- **Recovery Runbook**: `docs/RECOVERY_RUNBOOK.md`
- **Commandes Exactes**: `RESTORATION_COMMANDES.md`
- **Scripts**: `scripts/restore-sqlite-backup-to-postgres.mjs`, `scripts/reset-db-local-safe.sh`
