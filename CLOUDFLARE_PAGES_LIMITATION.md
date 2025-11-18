# ⚠️ Limitation Cloudflare Pages avec @cloudflare/next-on-pages

## 🔴 Problème

`@cloudflare/next-on-pages` **exige** que toutes les routes non-statiques utilisent Edge Runtime (`export const runtime = 'edge';`), mais notre stack utilise des modules Node.js qui ne sont **pas compatibles** avec Edge Runtime :

1. **Prisma + @auth/prisma-adapter** - Nécessite Node.js (même avec adaptateur Neon)
2. **bcrypt** - Nécessite Node.js (hachage de mots de passe)
3. **sharp** - Nécessite Node.js (traitement d'images)

## ❌ Conséquence

Le build échoue avec :
```
ERROR: Failed to produce a Cloudflare Pages build from the project.
The following routes were not configured to run with the Edge Runtime
```

## ✅ Solutions Possibles

### Option 1 : Ne pas utiliser @cloudflare/next-on-pages
- Utiliser Cloudflare Pages avec Next.js standard (si supporté)
- Ou utiliser une autre plateforme (Vercel, Netlify)

### Option 2 : Remplacer les modules Node.js
- Remplacer `bcrypt` par `@noble/hashes` (compatible Edge)
- Remplacer `sharp` par `@squoosh/lib` (compatible Edge)
- Vérifier que Prisma fonctionne avec adaptateur Neon en Edge Runtime

### Option 3 : Utiliser Cloudflare Workers au lieu de Pages
- Cloudflare Workers supporte mieux les environnements Edge
- Mais nécessite une refactorisation importante

## 📋 État Actuel

- ✅ Build Next.js réussi
- ✅ Migration Auth.js v5 terminée
- ✅ Images migrées vers R2
- ❌ Build Cloudflare Pages échoue (exige Edge Runtime partout)

## 🔧 Prochaines Étapes

1. **Tester sans @cloudflare/next-on-pages** - Voir si Cloudflare Pages supporte Next.js standard
2. **Ou remplacer bcrypt/sharp** - Par des alternatives compatibles Edge
3. **Ou utiliser Vercel/Netlify** - Qui supportent mieux Node.js runtime

