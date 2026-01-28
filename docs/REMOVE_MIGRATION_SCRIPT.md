# 🗑️ Retirer le Script de Migration du Build

## 📋 Quand retirer le script ?

Une fois que la migration a été exécutée avec succès en production, vous pouvez retirer le script du build pour éviter qu'il ne s'exécute à chaque build.

## ✅ Vérification avant de retirer

Assurez-vous que :

1. ✅ La table `Image` existe dans la base de données
2. ✅ Toutes les images blob ont été migrées
3. ✅ Les nouvelles images sont automatiquement stockées lors de l'upload

### Vérifier la migration

```sql
-- Compter les images migrées
SELECT COUNT(*) FROM "Image";

-- Vérifier qu'il y a des images
SELECT COUNT(*) FROM "Image" WHERE "blobUrl" IS NOT NULL;
```

## 🔧 Étapes pour retirer le script

### 1. Modifier `package.json`

Retirer `&& bash scripts/migrate-after-build.sh` du script `build` :

```json
// AVANT
"build": "bash scripts/ensure-postgresql-schema.sh && node scripts/fix-prisma-types.mjs && NODE_OPTIONS='--import tsx' next build && bash scripts/migrate-after-build.sh",

// APRÈS
"build": "bash scripts/ensure-postgresql-schema.sh && node scripts/fix-prisma-types.mjs && NODE_OPTIONS='--import tsx' next build",
```

### 2. (Optionnel) Supprimer le script

Si vous ne voulez plus garder le script :

```bash
rm scripts/migrate-after-build.sh
```

**Note :** Il est recommandé de garder le script pour référence future, même s'il n'est plus utilisé dans le build.

## 🔄 Si vous devez réexécuter la migration

Si vous avez besoin de réexécuter la migration plus tard :

```bash
# Migration manuelle
pnpm run db:migrate:all

# Ou étape par étape
pnpm run db:migrate:production
pnpm run db:migrate:blob-images
```

Les scripts de migration restent disponibles dans `package.json` même après avoir retiré le script du build.

## 📝 Notes

- Les scripts de migration sont **idempotents** : ils peuvent être exécutés plusieurs fois sans problème
- Les scripts ne créent pas de doublons grâce à `upsert()`
- Les scripts sont **non-bloquants** : ils ne font pas échouer le build en cas d'erreur
