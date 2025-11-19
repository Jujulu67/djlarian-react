# Solution Pérenne pour fs.readdir dans Cloudflare Workers

## Problème

Prisma Client essaie d'utiliser `fs.readdir` pour détecter les binaires natifs, même avec l'adaptateur Neon. Dans Cloudflare Workers, `unenv` (le système de polyfills) retourne une erreur `createNotImplementedError` pour `fs.readdir`, ce qui bloque Prisma.

## Solution Implémentée

### 1. Script de Test Local (`npm run pages:test`)

Un script de test local avec Miniflare permet de tester sans rebuild :

```bash
npm run pages:test
```

Cela lance Miniflare qui simule l'environnement Cloudflare Workers localement.

### 2. Polyfills Multi-Niveaux (`src/lib/polyfills.ts`)

Plusieurs couches de polyfills sont appliquées :

- **Polyfill `globalThis.fs.readdir`** : Retourne un tableau vide
- **Patch `unenv.fs.readdir`** : Patche directement le système unenv
- **Proxy pour `fs`** : Intercepte tous les accès à `fs.readdir`
- **Patch `Module._load`** : Intercepte les `require('node:fs')` avant qu'unenv ne les transforme
- **Patch `Object.defineProperty`** : Intercepte les définitions de `fs.readdir`

### 3. Patch du Code Bundlé (`scripts/setup-cloudflare-output.sh`)

Le script de build patche directement le code bundlé minifié pour :

- Remplacer `Object.fn[as readdir] = createNotImplementedError(...)`
- Remplacer `fn[as readdir] = createNotImplementedError(...)`
- Patcher la fonction `createNotImplementedError` elle-même pour intercepter `fs.readdir`
- Remplacer les appels directs à `createNotImplementedError("readdir")`

### 4. Patch Prisma (`src/lib/prisma.ts`)

- Patch de `getCurrentBinaryTarget` pour retourner `'unknown'` et éviter la détection des binaires
- Import des polyfills AVANT Prisma pour qu'ils soient disponibles au chargement

## Utilisation

### Test Local (Sans Rebuild)

```bash
npm run pages:test
```

Cela lance Miniflare sur `http://127.0.0.1:8787` avec les mêmes variables d'environnement que Cloudflare.

### Build et Déploiement

```bash
npm run pages:build
```

Le script applique automatiquement tous les patches nécessaires.

## Fichiers Modifiés

1. **`src/lib/polyfills.ts`** : Polyfills multi-niveaux
2. **`src/lib/prisma.ts`** : Import des polyfills et patch de `getCurrentBinaryTarget`
3. **`scripts/setup-cloudflare-output.sh`** : Patch du code bundlé avec Node.js
4. **`scripts/test-cloudflare-local.sh`** : Script de test local avec Miniflare
5. **`package.json`** : Ajout de la commande `pages:test`

## Avantages

✅ **Test local sans rebuild** : Utilisez `npm run pages:test` pour tester rapidement
✅ **Solution multi-niveaux** : Plusieurs couches de protection pour intercepter `fs.readdir`
✅ **Patch automatique** : Le build applique automatiquement les patches nécessaires
✅ **Compatible avec le code minifié** : Le patch Node.js gère le code bundlé minifié

## Notes

- Les polyfills sont importés **AVANT** Prisma dans `src/lib/prisma.ts`
- Le patch du code bundlé utilise Node.js pour gérer les patterns minifiés
- Miniflare simule l'environnement Cloudflare Workers pour les tests locaux

