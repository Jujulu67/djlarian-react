# 🔒 Vérification : Protection contre `list()` en local avec switch production

## ✅ Vérification Complète

### 1. **Protection dans `/api/images/[imageId]`**

**Code vérifié :** `src/app/api/images/[imageId]/route.ts`

```typescript
// Ligne 47 : Utilise shouldUseBlobStorage() qui vérifie le switch
const useBlobStorage = shouldUseBlobStorage();

// Ligne 64 : Ne fait list() QUE si useBlobStorage ET blobConfigured
if (useBlobStorage && blobConfigured) {
  // Ligne 81 : Cherche D'ABORD dans la DB
  const imageRecord = await prisma.image.findUnique({...});

  // Ligne 111 : FALLBACK vers list() seulement si pas trouvé dans DB
  // (et stocke ensuite dans DB pour éviter les futurs list())
}
```

**✅ Protection :**

- En local avec switch OFF : `useBlobStorage = false` → Pas de `list()`
- En local avec switch ON : `useBlobStorage = true` → Cherche d'abord dans DB → 0 `list()` pour les images migrées

### 2. **Protection dans `shouldUseBlobStorage()`**

**Code vérifié :** `src/lib/utils/getStorageConfig.ts`

```typescript
// Ligne 18-56 : Vérifie le switch de base de données
export function shouldUseBlobStorage(): boolean {
  const isProduction = process.env.NODE_ENV === 'production';

  // En production réelle, toujours utiliser Blob si configuré
  if (isProduction) {
    return checkBlobConfigured();
  }

  // En développement, vérifier le switch
  const switchPath = path.join(process.cwd(), '.db-switch.json');
  if (fs.existsSync(switchPath)) {
    const switchConfig = JSON.parse(fs.readFileSync(switchPath, 'utf-8'));
    // Si on utilise la base de production, on utilise aussi Blob pour les images
    if (switchConfig.useProduction === true) {
      return checkBlobConfigured(); // Vérifie BLOB_READ_WRITE_TOKEN
    }
  }

  // Par défaut en développement, utiliser le stockage local
  return false;
}
```

**✅ Protection :**

- Switch OFF : `shouldUseBlobStorage() = false` → Pas de `list()`
- Switch ON + `BLOB_READ_WRITE_TOKEN` configuré : `shouldUseBlobStorage() = true` → Utilise DB en premier

### 3. **Protection dans `/api/images` (liste complète)**

**Code vérifié :** `src/app/api/images/route.ts`

```typescript
// Ligne 65 : Utilise shouldUseBlobStorage()
const useBlobStorage = shouldUseBlobStorage();

// Ligne 79 : Ne fait list() QUE si useBlobStorage ET blobConfigured
if (useBlobStorage && blobConfigured) {
  blobImages = await listBlobFiles(); // Utilise list() mais avec cache de 1h
}
```

**✅ Protection :**

- Switch OFF : Pas de `list()`
- Switch ON : 1 `list()` par heure max (cache)

### 4. **Protection dans `listBlobFiles()`**

**Code vérifié :** `src/lib/blob.ts`

```typescript
// Ligne 102-106 : Cache de 1h pour éviter les appels répétés
if (listBlobCache && Date.now() - listBlobCache.timestamp < LIST_BLOB_CACHE_TTL) {
  return listBlobCache.data; // Pas de list()
}

// Ligne 120 : list() seulement si pas en cache
const { blobs } = await list({ prefix });
```

**✅ Protection :**

- Cache de 1h : Réduit drastiquement les appels `list()`

## 🧪 Tests à Effectuer en Local avec Switch Production

### Test 1 : Vérifier que le switch est bien détecté

```bash
# Activer le switch dans /admin/configuration
# Puis vérifier dans les logs du serveur :
# Devrait voir : "[STORAGE CONFIG] Switch production activé..."
```

### Test 2 : Vérifier que la DB est utilisée

```bash
# 1. Activer le switch production
# 2. Vérifier que DATABASE_URL pointe vers PostgreSQL
echo $DATABASE_URL
# Devrait être : postgresql://...

# 3. Vérifier que BLOB_READ_WRITE_TOKEN est configuré
echo $BLOB_READ_WRITE_TOKEN
# Devrait avoir une valeur (venant de BLOB_READ_WRITE_TOKEN_PRODUCTION)
```

### Test 3 : Tester l'affichage d'une image

```bash
# 1. Activer le switch production
# 2. Récupérer un imageId depuis la DB de production
# 3. Tester l'affichage
curl http://localhost:3000/api/images/[imageId]

# Vérifier dans les logs :
# Devrait voir : "[API IMAGES] URL trouvée dans la DB: ..."
# NE devrait PAS voir : "[API IMAGES] Recherche blob avec préfixe (fallback)"
```

### Test 4 : Vérifier que la table Image est accessible

```bash
# Avec le switch activé, vérifier que la table Image existe
npx prisma studio
# Ou via SQL :
psql $DATABASE_URL -c "SELECT COUNT(*) FROM \"Image\";"
```

## 🔒 Résumé des Protections

| Situation                      | `shouldUseBlobStorage()` | Utilise `list()` ?          | Protection                 |
| ------------------------------ | ------------------------ | --------------------------- | -------------------------- |
| Local, switch OFF              | `false`                  | ❌ Non                      | ✅ Pas de `list()`         |
| Local, switch ON, pas de token | `false`                  | ❌ Non                      | ✅ Pas de `list()`         |
| Local, switch ON, avec token   | `true`                   | ✅ Oui (mais DB en premier) | ✅ DB utilisée en priorité |
| Production Vercel              | `true`                   | ✅ Oui (mais DB en premier) | ✅ DB utilisée en priorité |

## ✅ Conclusion

**Toutes les protections sont en place :**

1. ✅ `shouldUseBlobStorage()` vérifie le switch avant d'utiliser Blob
2. ✅ `/api/images/[imageId]` cherche d'abord dans la DB avant `list()`
3. ✅ `/api/images` utilise un cache de 1h pour réduire les `list()`
4. ✅ En local avec switch OFF : Aucun `list()` n'est appelé
5. ✅ En local avec switch ON : DB utilisée en priorité, `list()` seulement en fallback

**En local avec switch production, vous êtes bien protégé contre les appels `list()` inutiles !** 🎉
