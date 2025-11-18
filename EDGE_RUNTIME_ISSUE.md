# ⚠️ Problème Edge Runtime avec Next-Auth et Prisma

## 🔴 Problème Identifié

1. **Next-Auth** utilise `crypto` (Node.js) qui n'est pas disponible dans Edge Runtime
2. **Prisma** ne fonctionne pas avec Edge Runtime (nécessite Node.js)
3. **@cloudflare/next-on-pages** demande que toutes les routes non-statiques utilisent Edge Runtime

## ✅ Solution Temporaire

J'ai retiré `export const runtime = 'edge';` des routes qui utilisent :
- `next-auth` (authentification)
- `prisma` (base de données)

Ces routes resteront en Node.js runtime.

## 🔧 Prochaines Étapes

Si le build échoue encore, il faudra :
1. Utiliser **Prisma Data Proxy** pour Prisma (compatible Edge)
2. Remplacer **Next-Auth** par une solution compatible Edge (ex: Cloudflare Workers Auth)

---

## 📝 Routes Affectées

- `/api/auth/*` - Next-Auth
- `/api/users/*` - Prisma
- `/api/events/*` - Prisma
- `/api/music/*` - Prisma
- `/api/admin/*` - Prisma

Ces routes ne peuvent pas utiliser Edge Runtime actuellement.

