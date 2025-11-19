# 🔍 Debug des Erreurs 500 sur les Routes API

## 📊 Routes Affectées

Les routes suivantes retournent des erreurs 500 :
- `/api/events` → 500
- `/api/admin/config` → 500
- `/api/auth/session` → 500

## 🔍 Diagnostic

### Route `/api/health` (Nouvelle)

Une route de diagnostic a été créée pour tester les connexions :
- **URL** : `https://djlarian-react.pages.dev/api/health`
- **Tests** :
  - ✅ Connexion à la base de données (Prisma + Neon)
  - ✅ Configuration R2
  - ✅ Variables d'environnement

### Causes Probables

1. **Prisma + Neon** : L'adaptateur Neon peut ne pas fonctionner correctement sur Cloudflare Pages
2. **Auth.js v5** : Peut avoir des problèmes avec Prisma en Edge Runtime
3. **Variables d'environnement** : `DATABASE_URL` ou autres secrets peuvent être mal configurés

## 🧪 Tests à Effectuer

1. **Tester `/api/health`** :
   ```bash
   curl https://djlarian-react.pages.dev/api/health
   ```
   
   Cela devrait retourner :
   ```json
   {
     "status": "ok" | "degraded",
     "timestamp": "...",
     "checks": {
       "database": { "status": "connected" | "error", "message": "..." },
       "r2": { "status": "configured" | "not_configured", "message": "..." },
       "environment": { ... }
     }
   }
   ```

2. **Vérifier les logs Cloudflare Pages** :
   - Aller dans Cloudflare Dashboard → Pages → djlarian-react → Logs
   - Chercher les erreurs liées à Prisma, Auth.js, ou DATABASE_URL

3. **Vérifier les variables d'environnement** :
   - `DATABASE_URL` est-elle correctement configurée ?
   - `NEXTAUTH_SECRET` ou `AUTH_SECRET` est-il défini ?
   - Les secrets R2 sont-ils corrects ?

## 🔧 Solutions Possibles

### Solution 1 : Vérifier DATABASE_URL

La `DATABASE_URL` doit utiliser le format Neon avec `?sslmode=require` :
```
postgresql://user:password@host/database?sslmode=require
```

### Solution 2 : Vérifier Prisma Adapter

L'adaptateur Neon peut nécessiter une configuration supplémentaire. Vérifier que :
- `@neondatabase/serverless` est installé
- `@prisma/adapter-neon` est installé
- `previewFeatures = ["driverAdapters"]` est dans `schema.prisma`

### Solution 3 : Vérifier Auth.js Configuration

Auth.js v5 peut nécessiter des ajustements pour fonctionner avec Prisma en Edge Runtime.

## 📝 Prochaines Étapes

1. ✅ Tester `/api/health` pour identifier le problème
2. ⏳ Vérifier les logs Cloudflare Pages
3. ⏳ Corriger les problèmes identifiés
4. ⏳ Retester les routes API

