# 🧪 Test des Blob Advanced Operations

## 📋 Actions qui provoquaient des appels à `list()`

Avant la migration, ces actions utilisaient `list()` (Blob Advanced Operation) :

### 1. **Affichage d'une image** (`/api/images/[imageId]`)

**Action :** Accéder à une image via son URL

- **Avant :** Utilisait `list()` pour trouver l'image blob
- **Après :** Utilise directement la DB (0 `list()`)

**Comment tester :**

```bash
# Tester l'affichage d'une image existante
curl https://votre-site.vercel.app/api/images/[imageId]

# Tester l'affichage d'une image originale
curl https://votre-site.vercel.app/api/images/[imageId]?original=true
```

**Où trouver des imageId :**

- Dans la base de données : `SELECT "imageId" FROM "Image" LIMIT 5;`
- Dans les tracks : `SELECT "imageId" FROM "Track" WHERE "imageId" IS NOT NULL LIMIT 5;`
- Dans les events : `SELECT "imageId" FROM "Event" WHERE "imageId" IS NOT NULL LIMIT 5;`

### 2. **Liste de toutes les images** (`/api/images`)

**Action :** Accéder à la liste de toutes les images

- **Avant :** Utilisait `list()` via `listBlobFiles()`
- **Après :** Utilise le cache (1 `list()` toutes les heures max)

**Comment tester :**

```bash
# Tester la liste des images (nécessite auth admin)
curl -H "Cookie: ..." https://votre-site.vercel.app/api/images
```

**Note :** Cette route utilise un cache de 1h, donc `list()` ne sera appelé qu'une fois par heure maximum.

### 3. **Upload d'une nouvelle image** (`/api/upload`)

**Action :** Uploader une nouvelle image

- **Avant :** N'utilisait PAS `list()` (utilisait `put()`)
- **Après :** N'utilise toujours PAS `list()` (stocke directement dans la DB)

**Comment tester :**

- Uploader une image via l'interface admin
- Vérifier qu'elle est stockée dans la DB : `SELECT * FROM "Image" ORDER BY "createdAt" DESC LIMIT 1;`

## ✅ Actions qui NE provoquent PLUS d'appels à `list()`

### ✅ Affichage d'images existantes (migrées)

Toutes les 22 images migrées sont maintenant dans la DB. L'affichage de ces images :

- ✅ Utilise directement la DB (0 `list()`)
- ✅ Met en cache l'URL (24h)
- ✅ Ne fait plus jamais appel à `list()`

### ✅ Upload de nouvelles images

Les nouvelles images uploadées :

- ✅ Sont automatiquement stockées dans la DB lors de l'upload
- ✅ N'utilisent jamais `list()` pour être récupérées
- ✅ Utilisent uniquement `put()` (Advanced Operation, mais nécessaire)

## 🔍 Comment vérifier que le compteur n'augmente plus

### 1. **Vérifier dans Vercel Dashboard**

1. Aller dans **Vercel Dashboard** → Votre projet → **Usage**
2. Regarder **Blob Advanced Operations**
3. Noter le compteur actuel

### 2. **Tester les actions qui provoquaient `list()`**

#### Test 1 : Affichage d'images existantes

```bash
# Récupérer quelques imageId depuis la DB
# Puis tester l'affichage de chaque image

# Image normale
curl https://votre-site.vercel.app/api/images/[imageId]

# Image originale
curl https://votre-site.vercel.app/api/images/[imageId]?original=true
```

**Résultat attendu :** Le compteur **ne doit PAS augmenter** car les images sont dans la DB.

#### Test 2 : Liste des images (avec cache)

```bash
# Tester la liste (nécessite auth)
curl -H "Cookie: ..." https://votre-site.vercel.app/api/images
```

**Résultat attendu :**

- Première fois : +1 `list()` (cache de 1h)
- Suivantes (dans l'heure) : 0 `list()` (utilise le cache)

#### Test 3 : Navigation sur le site

- Visiter des pages qui affichent des images (tracks, events, gallery)
- Vérifier que les images s'affichent correctement
- Vérifier que le compteur n'augmente pas

### 3. **Surveiller pendant 24h**

Surveiller le compteur pendant 24h pour vérifier :

- ✅ Pas d'augmentation lors de l'affichage d'images
- ✅ Pas d'augmentation lors de l'upload d'images
- ✅ Seule augmentation possible : 1 `list()` par heure max pour la liste complète (cache)

## 📊 Compteur de référence

**Avant la migration :**

- Chaque affichage d'image = 1 `list()` (si pas en cache)
- Liste des images = 1 `list()` (si pas en cache)
- **Total estimé :** Plusieurs dizaines par jour

**Après la migration :**

- Affichage d'images = 0 `list()` (utilise la DB)
- Liste des images = 1 `list()` par heure max (cache)
- **Total estimé :** ~24 `list()` par jour maximum (si la liste est appelée toutes les heures)

## 🎯 Objectif

Le compteur **Blob Advanced Operations** devrait maintenant :

- ✅ Rester stable lors de l'affichage d'images
- ✅ Augmenter seulement de 1 par heure maximum (pour la liste complète)
- ✅ Ne plus augmenter lors de l'upload d'images

## 🔧 Si le compteur augmente encore

Si le compteur augmente de manière inattendue :

1. **Vérifier les logs** pour voir d'où vient l'appel `list()`
2. **Vérifier que toutes les images sont dans la DB** :

   ```sql
   SELECT COUNT(*) FROM "Image";
   -- Devrait être >= 22 (les images migrées)
   ```

3. **Vérifier qu'une image spécifique est dans la DB** :

   ```sql
   SELECT * FROM "Image" WHERE "imageId" = '[imageId_testé]';
   ```

4. **Si une image n'est pas dans la DB**, réexécuter la migration :
   ```bash
   pnpm run db:migrate:blob-images
   ```

## 📝 Notes

- Le cache en mémoire dure 24h pour les URLs d'images
- Le cache pour `listBlobFiles()` dure 1h
- Les nouvelles images sont automatiquement stockées dans la DB lors de l'upload
- Le fallback vers `list()` existe toujours pour les images non migrées (sécurité)
