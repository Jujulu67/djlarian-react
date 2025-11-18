# ⚠️ Problème Edge Runtime avec Prisma

## 🔴 Problème

`@cloudflare/next-on-pages` demande que toutes les routes non-statiques exportent `export const runtime = 'edge';`, mais **Prisma ne fonctionne pas avec Edge Runtime**.

## ✅ Solution : Utiliser Prisma Data Proxy ou Neon Serverless

Pour que Prisma fonctionne sur Cloudflare Pages (Edge Runtime), il faut utiliser :

1. **Prisma Data Proxy** (recommandé pour Cloudflare)
2. **Neon Serverless** avec connection pooling

## 📋 Actions Requises

### Option 1 : Prisma Data Proxy (Recommandé)

1. Configurer Prisma Data Proxy dans Neon
2. Utiliser l'URL du proxy au lieu de la connexion directe
3. Toutes les routes peuvent alors utiliser `export const runtime = 'edge';`

### Option 2 : Garder Node.js Runtime (si possible)

Si Cloudflare Pages supporte Node.js runtime pour certaines routes, garder les routes Prisma en Node.js et les autres en Edge.

---

## 🔧 Prochaines Étapes

Je vais vérifier si on peut utiliser Prisma Data Proxy ou si on doit adapter les routes.

