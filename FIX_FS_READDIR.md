# 🔧 Fix pour fs.readdir et node:os dans Cloudflare Pages

## 🎯 Problème

Les logs montrent que Prisma Client est créé avec succès avec l'adaptateur Neon, mais lors de l'exécution des requêtes (`prisma.$queryRaw`), Prisma essaie d'utiliser :
- `fs.readdir` → `[unenv] fs.readdir is not implemented yet!`
- `node:os` → `Error: No such module "node:os"`

## ✅ Solution

Ajout de polyfills dans le worker Cloudflare pour intercepter ces appels :

1. **Polyfill pour `node:os`** : Retourne un objet `os` minimal avec toutes les méthodes nécessaires
2. **Polyfill pour `fs.readdir`** : Retourne un tableau vide (Prisma n'a pas besoin de lire le système de fichiers avec l'adaptateur Neon)

## 📝 Modifications

### 1. Script `setup-cloudflare-output.sh`

Le script injecte maintenant des polyfills au début du worker :

```javascript
// Polyfills pour Prisma Client dans Cloudflare Workers
if (typeof globalThis !== "undefined") {
  // Polyfill pour node:os
  globalThis.os = { ... };
  
  // Polyfill pour fs.readdir
  globalThis.fs = {
    readdir: (path, options, callback) => {
      // Retourne un tableau vide
      if (callback) callback(null, []);
      else return Promise.resolve([]);
    },
    promises: {
      readdir: () => Promise.resolve([])
    }
  };
}
```

### 2. Configuration OpenNext

Les modules `node:os`, `node:fs`, et `node:path` sont externalisés dans `edgeExternals` pour éviter qu'ils soient bundlés.

## 🧪 Test

Après le prochain build, tester `/api/health` :
- ✅ Prisma Client devrait se créer sans erreur
- ✅ `prisma.$queryRaw` devrait fonctionner sans `fs.readdir`
- ✅ Plus d'erreur `node:os`

## 📊 Logs Attendus

```
[PRISMA INIT] PrismaClient créé avec succès
[HEALTH CHECK] $queryRaw réussi, résultat: [ { test: 1 } ]
[HEALTH CHECK] Connexion à la base de données réussie
```

Plus d'erreurs `fs.readdir` ou `node:os` ! 🎉

