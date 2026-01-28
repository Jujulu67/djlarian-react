# 🔄 Commandes Exactes pour Restauration

## 📋 Diagnostic Initial

```bash
# 1. Vérifier que la base est vide
psql "postgresql://djlarian:djlarian_dev_password@127.0.0.1:5433/djlarian_dev?sslmode=disable" \
  -c "SELECT 'User' as table_name, COUNT(*) as count FROM \"User\" \
      UNION ALL SELECT 'Project', COUNT(*) FROM \"Project\" \
      UNION ALL SELECT 'Track', COUNT(*) FROM \"Track\" \
      UNION ALL SELECT 'Event', COUNT(*) FROM \"Event\" \
      UNION ALL SELECT 'Notification', COUNT(*) FROM \"Notification\";"

# 2. Vérifier DATABASE_URL
grep DATABASE_URL .env.local | head -1
```

## 🔍 Identifier le Backup

```bash
# Lister les backups disponibles (plus récent en premier)
ls -lth prisma/dev.db.backup.* | head -5

# Afficher le backup le plus récent
LATEST_BACKUP=$(ls -t prisma/dev.db.backup.* | head -1)
echo "Backup le plus récent: $LATEST_BACKUP"
```

## 🔄 Restauration (Option 1: Automatique - Recommandé)

```bash
# 1. Lister les backups disponibles
node scripts/restore-sqlite-backup-to-postgres.mjs

# 2. Restaurer depuis le backup le plus récent
LATEST_BACKUP=$(ls -t prisma/dev.db.backup.* | head -1)
node scripts/restore-sqlite-backup-to-postgres.mjs "$LATEST_BACKUP"
```

**Exemple avec backup spécifique**:

```bash
node scripts/restore-sqlite-backup-to-postgres.mjs prisma/dev.db.backup.2025-12-14T14-01-57
```

## ✅ Vérification Post-Restauration

```bash
# Vérifier les compteurs après restauration
psql "postgresql://djlarian:djlarian_dev_password@127.0.0.1:5433/djlarian_dev?sslmode=disable" \
  -c "SELECT 'User' as table_name, COUNT(*) as count FROM \"User\" \
      UNION ALL SELECT 'Project', COUNT(*) FROM \"Project\" \
      UNION ALL SELECT 'Track', COUNT(*) FROM \"Track\" \
      UNION ALL SELECT 'Event', COUNT(*) FROM \"Event\" \
      UNION ALL SELECT 'Notification', COUNT(*) FROM \"Notification\";"

# Vérifier quelques projets
psql "postgresql://djlarian:djlarian_dev_password@127.0.0.1:5433/djlarian_dev?sslmode=disable" \
  -c "SELECT id, name, status FROM \"Project\" LIMIT 5;"

# Vérifier quelques utilisateurs
psql "postgresql://djlarian:djlarian_dev_password@127.0.0.1:5433/djlarian_dev?sslmode=disable" \
  -c "SELECT id, email, name FROM \"User\" LIMIT 5;"
```

## 🛡️ Test des Garde-fous

```bash
# Tester que les garde-fous fonctionnent
pnpm run test:db-safety

# Ou directement
node scripts/test-db-safety-guards.mjs
```

## ⚠️ Protection: Reset Sécurisé

```bash
# ❌ SANS protection (refusé automatiquement)
pnpm run db:reset:local

# ✅ AVEC protection (requis)
ALLOW_DB_WIPE_LOCAL=1 DB_WIPE_CONFIRM=$(date +%s) pnpm run db:reset:local
```

Le script demandera aussi une confirmation finale (taper "WIPE").

## 📊 Commandes Utiles

```bash
# Vérifier l'état de PostgreSQL
docker compose ps

# Vérifier les logs PostgreSQL
docker compose logs postgres | tail -20

# Vérifier le statut des migrations
pnpm prisma migrate status

# Tester la connexion
psql "postgresql://djlarian:djlarian_dev_password@127.0.0.1:5433/djlarian_dev?sslmode=disable" -c "SELECT 1;"
```

## 🚨 En Cas d'Erreur

```bash
# Vérifier les logs de restauration
# (les erreurs s'affichent dans la console)

# Vérifier que PostgreSQL est démarré
docker compose ps | grep postgres

# Redémarrer PostgreSQL si nécessaire
docker compose restart postgres

# Vérifier les migrations
pnpm prisma migrate status
```
