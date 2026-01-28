# Migration des images blob vers la table Image

## 📋 Objectif

Migrer toutes les images blob existantes vers la table `Image` pour **éliminer complètement l'utilisation de `list()`** et réduire les Blob Advanced Operations.

## ✅ Solution

Le script `scripts/migrate-blob-images-to-db.mjs` :

1. **Liste toutes les images blob** (une dernière fois avec `list()`)
2. **Extrait les imageId** depuis les pathnames
3. **Groupe par imageId** (gère les images normales et -ori)
4. **Stocke dans la table Image** avec `upsert()` (idempotent)
5. **Continue même en cas d'erreur** (pas de régression)

## 🚀 Utilisation

### En production (recommandé)

```bash
# Le script détecte automatiquement PostgreSQL/Neon en production
node scripts/migrate-blob-images-to-db.mjs
```

### En développement local

Si vous utilisez SQLite local, vous devrez peut-être recompiler better-sqlite3 :

```bash
pnpm rebuild better-sqlite3
node scripts/migrate-blob-images-to-db.mjs
```

Ou utilisez le switch de production pour pointer vers PostgreSQL :

```bash
# Activer le switch de production dans l'admin panel
# Puis exécuter le script
node scripts/migrate-blob-images-to-db.mjs
```

## 🔒 Sécurité et régressions

- ✅ **Idempotent** : Peut être exécuté plusieurs fois sans problème
- ✅ **Non-bloquant** : Continue même si certaines images échouent
- ✅ **Pas de perte de données** : Utilise `upsert()` pour éviter les doublons
- ✅ **Fallback** : Si la migration échoue, le code continue d'utiliser `list()` comme fallback

## 📊 Résultats attendus

Après la migration :

- ✅ Toutes les images existantes sont dans la table `Image`
- ✅ Les nouvelles images sont automatiquement stockées lors de l'upload
- ✅ Plus besoin d'utiliser `list()` pour récupérer les URLs blob
- ✅ Réduction drastique des Blob Advanced Operations

## 🔍 Vérification

Après la migration, vérifiez :

```sql
-- Compter les images migrées
SELECT COUNT(*) FROM "Image";

-- Voir quelques exemples
SELECT "imageId", "blobUrl", "blobUrlOriginal" FROM "Image" LIMIT 10;
```

## ⚠️ Notes

- Le script utilise `list()` **une seule fois** pour migrer toutes les images
- Après la migration, plus aucun appel `list()` ne sera nécessaire
- Les nouvelles images uploadées sont automatiquement stockées dans la DB
- Le fallback vers `list()` reste disponible pour les images non migrées (sécurité)
