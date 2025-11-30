# 🔧 Résolution des Conflits de Migrations Prisma

## 📋 Problème

Lors du build sur Vercel, vous pouvez rencontrer des erreurs de conflit d'historique des migrations Prisma :

```
Your local migration history and the migrations table from your database are different:

The migrations from the database are not found locally in prisma/migrations:
  20250424125117_init
  20250426202133_add_publish_at_to_event
  20250426205234_add_publish_at_to_track
```

Cela signifie que certaines migrations existent dans la base de données mais ne sont pas présentes dans votre dépôt Git local.

## ✅ Solution Automatique

Le script `ensure-postgresql-schema.sh` a été amélioré pour :

1. **Désactiver le verrouillage consultatif** : Utilise `PRISMA_SCHEMA_DISABLE_ADVISORY_LOCK=true` pour éviter les timeouts de verrou sur Vercel
2. **Détecter les conflits d'historique** : Identifie automatiquement les migrations manquantes
3. **Ne pas faire échouer le build** : En cas de conflit d'historique uniquement, le build continue avec un avertissement

## 🔧 Résolution Manuelle (si nécessaire)

Si vous devez résoudre le conflit manuellement, voici les étapes :

### Option 1 : Marquer les migrations manquantes comme appliquées (recommandé)

Si les migrations dans la DB sont déjà appliquées et fonctionnent correctement :

```bash
# Se connecter à la base de données de production
export DATABASE_URL="votre-connection-string-postgresql"

# Marquer chaque migration manquante comme appliquée
npx prisma migrate resolve --applied 20250424125117_init
npx prisma migrate resolve --applied 20250426202133_add_publish_at_to_event
npx prisma migrate resolve --applied 20250426205234_add_publish_at_to_track
```

### Option 2 : Créer des migrations baseline

Si vous voulez garder l'historique complet, créez des migrations baseline :

```bash
# 1. Créer une migration baseline vide pour chaque migration manquante
mkdir -p prisma/migrations/20250424125117_init
echo "-- Baseline migration (already applied in production)" > prisma/migrations/20250424125117_init/migration.sql

mkdir -p prisma/migrations/20250426202133_add_publish_at_to_event
echo "-- Baseline migration (already applied in production)" > prisma/migrations/20250426202133_add_publish_at_to_event/migration.sql

mkdir -p prisma/migrations/20250426205234_add_publish_at_to_track
echo "-- Baseline migration (already applied in production)" > prisma/migrations/20250426205234_add_publish_at_to_track/migration.sql

# 2. Marquer ces migrations comme appliquées
npx prisma migrate resolve --applied 20250424125117_init
npx prisma migrate resolve --applied 20250426202133_add_publish_at_to_event
npx prisma migrate resolve --applied 20250426205234_add_publish_at_to_track
```

### Option 3 : Vérifier l'état actuel

Pour voir l'état actuel des migrations :

```bash
npx prisma migrate status
```

## 🚨 Migrations Échouées

Si une migration a échoué, vous pouvez la résoudre avec :

```bash
# Si la migration doit être réappliquée
npx prisma migrate resolve --rolled-back <migration_name>

# Si la migration est déjà appliquée (partiellement)
npx prisma migrate resolve --applied <migration_name>
```

## 📝 Notes Importantes

- **Ne supprimez jamais** les migrations de la base de données directement
- **Toujours utiliser** `prisma migrate resolve` pour gérer les migrations échouées
- Le script de build **ne fait plus échouer** le build en cas de conflit d'historique uniquement
- Les **timeouts de verrou** sont évités grâce à `PRISMA_SCHEMA_DISABLE_ADVISORY_LOCK=true`

## 🔍 Vérification Post-Résolution

Après avoir résolu le conflit, vérifiez que tout fonctionne :

```bash
# Vérifier l'état des migrations
npx prisma migrate status

# Devrait afficher : "Database schema is up to date"
```

## 📚 Références

- [Documentation Prisma Migrate](https://www.prisma.io/docs/orm/prisma-migrate/workflows/patching-and-hotfixing)
- [Prisma Migrate Resolve](https://www.prisma.io/docs/orm/reference/prisma-cli-reference#prisma-migrate-resolve)
