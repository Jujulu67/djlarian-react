# 🚀 Migration en Production - Guide Complet

## 📋 Vue d'ensemble

Ce guide explique comment migrer la base de données et les images blob en production **sans drift et sans perte de données**.

## ✅ Prérequis

- ✅ Base de données PostgreSQL/Neon configurée
- ✅ `DATABASE_URL` pointant vers PostgreSQL
- ✅ `BLOB_READ_WRITE_TOKEN` configuré
- ✅ Accès SSH ou console Vercel pour exécuter les scripts

## 🔄 Processus de Migration

### Étape 1 : Migration de la Base de Données

Cette étape crée la table `Image` dans la base de données.

```bash
pnpm run db:migrate:production
```

**Ce que fait ce script :**

1. ✅ Vérifie le drift de migration (évite les conflits)
2. ✅ Applique les migrations avec `prisma migrate deploy`
3. ✅ Vérifie que la table `Image` existe
4. ✅ Affiche les statistiques

**En cas d'erreur de drift :**

```bash
# Résoudre un drift spécifique
pnpm prisma migrate resolve --applied <migration_name>

# Puis réessayer
pnpm run db:migrate:production
```

### Étape 2 : Migration des Images Blob

Cette étape importe toutes les images blob existantes dans la table `Image`.

```bash
pnpm run db:migrate:blob-images
```

**Ce que fait ce script :**

1. ✅ Liste toutes les images blob (une dernière fois avec `list()`)
2. ✅ Extrait les `imageId` depuis les pathnames
3. ✅ Groupe par `imageId` (gère les images normales et `-ori`)
4. ✅ Stocke dans la table `Image` avec `upsert()` (idempotent)
5. ✅ Continue même en cas d'erreur (pas de régression)

### Étape 3 : Migration Complète (Optionnel)

Pour exécuter les deux étapes en une seule commande :

```bash
pnpm run db:migrate:all
```

## 🔒 Sécurité et Régressions

### ✅ Garanties

- **Idempotent** : Les scripts peuvent être exécutés plusieurs fois sans problème
- **Non-bloquant** : Continuent même si certaines opérations échouent
- **Pas de perte de données** : Utilisent `upsert()` pour éviter les doublons
- **Fallback** : Si la migration échoue, le code continue d'utiliser `list()` comme fallback

### ⚠️ Vérifications

Avant la migration, vérifiez :

1. **Backup de la base de données** (recommandé)

   ```sql
   -- Créer un backup avant la migration
   pg_dump $DATABASE_URL > backup_before_migration.sql
   ```

2. **Vérifier le drift**

   ```bash
   pnpm prisma migrate status
   ```

3. **Tester en local d'abord** (si possible)
   ```bash
   # Activer le switch de production en local
   # Puis tester les scripts
   pnpm run db:migrate:production
   pnpm run db:migrate:blob-images
   ```

## 📊 Résultats Attendus

Après la migration :

- ✅ Table `Image` créée dans la base de données
- ✅ Toutes les images blob existantes sont dans la table `Image`
- ✅ Les nouvelles images sont automatiquement stockées lors de l'upload
- ✅ Plus besoin d'utiliser `list()` pour récupérer les URLs blob
- ✅ Réduction drastique des Blob Advanced Operations

## 🔍 Vérification Post-Migration

### Vérifier la table Image

```sql
-- Compter les images migrées
SELECT COUNT(*) FROM "Image";

-- Voir quelques exemples
SELECT "imageId", "blobUrl", "blobUrlOriginal", "size"
FROM "Image"
LIMIT 10;

-- Statistiques
SELECT
  COUNT(*) as total_images,
  COUNT("blobUrl") as with_main_url,
  COUNT("blobUrlOriginal") as with_original_url,
  SUM("size") / 1024 / 1024 as total_size_mb
FROM "Image";
```

### Vérifier que les images fonctionnent

1. Tester l'affichage d'une image existante
2. Tester l'upload d'une nouvelle image
3. Vérifier que l'image est bien stockée dans la table `Image`

## 🗑️ Après la Migration

### Option 1 : Garder les scripts (Recommandé)

**Avantages :**

- ✅ Peut être réutilisé si de nouvelles images sont ajoutées manuellement
- ✅ Utile pour la maintenance
- ✅ Peut être exécuté périodiquement pour synchroniser

**Recommandation :** Garder les scripts dans `scripts/` pour référence future.

### Option 2 : Retirer les scripts

Si vous êtes sûr que toutes les images sont migrées et que vous ne voulez plus utiliser `list()` :

1. Supprimer les scripts :

   ```bash
   rm scripts/migrate-db-production.mjs
   rm scripts/migrate-blob-images-production.mjs
   ```

2. Retirer les commandes pnpm :
   ```json
   // Dans package.json, retirer :
   "db:migrate:production": "...",
   "db:migrate:blob-images": "...",
   "db:migrate:all": "..."
   ```

**⚠️ Attention :** Une fois les scripts retirés, vous ne pourrez plus migrer facilement de nouvelles images ajoutées manuellement.

## 🆘 Dépannage

### Erreur : "Table Image n'existe pas"

```bash
# Réexécuter la migration DB
pnpm run db:migrate:production
```

### Erreur : "Drift détecté"

```bash
# Vérifier les migrations
pnpm prisma migrate status

# Résoudre le drift
pnpm prisma migrate resolve --applied <migration_name>
```

### Erreur : "BLOB_READ_WRITE_TOKEN n'est pas configuré"

Vérifiez que `BLOB_READ_WRITE_TOKEN` est bien défini dans les variables d'environnement Vercel.

### Images non migrées

Si certaines images ne sont pas migrées, réexécutez :

```bash
pnpm run db:migrate:blob-images
```

Le script est idempotent et ne créera pas de doublons.

## 📝 Notes

- Les scripts utilisent `list()` **une seule fois** pour migrer toutes les images
- Après la migration, plus aucun appel `list()` ne sera nécessaire
- Le fallback vers `list()` reste disponible pour les images non migrées (sécurité)
- Les nouvelles images uploadées sont automatiquement stockées dans la DB
