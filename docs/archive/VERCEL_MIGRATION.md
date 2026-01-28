# 🚀 Guide de Migration vers Vercel

Ce guide vous accompagne dans la migration de votre projet de Cloudflare Pages vers Vercel.

## ✅ Ce qui a été fait

### Nettoyage du code

- ✅ Suppression de tous les fichiers de debug (CLOUDFLARE*\*.md, FIX*\*.md, etc.)
- ✅ Simplification de `src/lib/prisma.ts` - Plus de hacks Cloudflare
- ✅ Suppression des polyfills (`src/lib/polyfills.ts`, `src/lib/fs-polyfill.js`)
- ✅ Simplification de `src/lib/bcrypt-edge.ts` - Utilisation native de bcryptjs
- ✅ Nettoyage de `next.config.ts` - Configuration standard
- ✅ Suppression de `open-next.config.ts` et `wrangler.toml`
- ✅ Nettoyage de `package.json` - Suppression des scripts et dépendances Cloudflare
- ✅ Suppression des scripts Cloudflare dans `scripts/`
- ✅ Nettoyage des commentaires mentionnant Edge Runtime
- ✅ **Migration R2 → Vercel Blob** : Remplacement complet de Cloudflare R2 par Vercel Blob Storage
  - Nouveau fichier `src/lib/blob.ts` avec les mêmes fonctions que R2
  - Tous les imports mis à jour automatiquement
  - Plus besoin de configurer R2, tout est automatique avec Vercel

### Résultat

Votre projet est maintenant **100% compatible Vercel** sans aucun hack ou workaround.

---

## 📋 Étapes de Migration

### 1. Préparer votre compte Vercel

1. Créez un compte sur [vercel.com](https://vercel.com) (gratuit)
2. Connectez votre compte GitHub si ce n'est pas déjà fait

### 2. Installer les dépendances

```bash
# Supprimer les dépendances Cloudflare qui ne sont plus nécessaires
pnpm uninstall @opennextjs/cloudflare wrangler @aws-sdk/client-s3

# Installer Vercel Blob (remplacement de R2)
pnpm install @vercel/blob

# Installer les dépendances (si nécessaire)
pnpm install
```

### 3. Configurer les variables d'environnement

Dans votre dashboard Vercel, allez dans **Settings > Environment Variables** et ajoutez :

#### Variables obligatoires

- `DATABASE_URL` - Votre URL de connexion Neon (identique à celle utilisée avant)
- `NEXTAUTH_SECRET` - Votre secret NextAuth (générez-en un nouveau si besoin : `openssl rand -base64 32`)
- `NEXTAUTH_URL` - L'URL de votre site Vercel (ex: `https://votre-projet.vercel.app`)

#### Variables optionnelles (selon vos besoins)

- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` - Pour l'authentification Google
- `TWITCH_CLIENT_ID` / `TWITCH_CLIENT_SECRET` - Pour l'authentification Twitch
- `BLOB_READ_WRITE_TOKEN` - **Automatiquement configuré par Vercel** (pas besoin de le définir manuellement)
  - Vercel Blob est automatiquement activé sur votre projet
  - Le token est injecté automatiquement dans les variables d'environnement
  - **Plan gratuit** : 5 GB de stockage, 100 GB de bande passante/mois
- `NEXT_PUBLIC_UMAMI_WEBSITE_ID` / `NEXT_PUBLIC_UMAMI_URL` - Pour les analytics

### 4. Connecter votre repository GitHub

1. Dans Vercel, cliquez sur **Add New Project**
2. Sélectionnez votre repository GitHub
3. Vercel détectera automatiquement Next.js
4. Configurez :
   - **Framework Preset**: Next.js
   - **Root Directory**: `.` (ou laissez vide)
   - **Build Command**: `pnpm run build` (par défaut)
   - **Output Directory**: `.next` (par défaut)
   - **Install Command**: `pnpm install` (par défaut)

### 5. Déployer

1. Cliquez sur **Deploy**
2. Vercel va :
   - Installer les dépendances
   - Builder votre projet
   - Déployer automatiquement

### 6. Vérifier le déploiement

Une fois le déploiement terminé :

1. Testez votre site : `https://votre-projet.vercel.app`
2. Testez l'endpoint de santé : `https://votre-projet.vercel.app/api/health`
3. Vérifiez les logs dans le dashboard Vercel si nécessaire

---

## 🔧 Configuration Prisma (si nécessaire)

Si vous utilisez toujours l'adaptateur Neon (optionnel sur Vercel), vous pouvez le garder. Cependant, sur Vercel, Prisma fonctionne nativement sans adaptateur.

### Option 1 : Garder l'adaptateur Neon (recommandé pour le pooling)

Si vous voulez utiliser le pooling de connexions Neon, gardez `@prisma/adapter-neon` et `@neondatabase/serverless` dans vos dépendances.

### Option 2 : Utiliser Prisma standard (plus simple)

Si vous préférez la simplicité, vous pouvez supprimer l'adaptateur et utiliser Prisma directement avec votre `DATABASE_URL` Neon standard.

**Note** : Le code actuel utilise Prisma standard, ce qui est parfait pour Vercel.

---

## 📝 Notes importantes

### Base de données Neon

- Votre base de données Neon continue de fonctionner exactement comme avant
- Aucune modification nécessaire dans Neon
- La connexion directe fonctionne parfaitement sur Vercel

### Stockage Vercel Blob (remplacement de R2)

- ✅ **Migration automatique** : Le code utilise maintenant Vercel Blob au lieu de R2
- ✅ **Gratuit** : 5 GB de stockage + 100 GB de bande passante/mois sur le plan Hobby
- ✅ **Automatique** : `BLOB_READ_WRITE_TOKEN` est injecté automatiquement par Vercel
- ✅ **Plus simple** : Pas besoin de configurer de bucket ou de credentials
- ✅ **Intégré** : Fonctionne nativement avec Vercel, optimisé pour la performance

### Authentification

- NextAuth.js (Auth.js v5) fonctionne nativement sur Vercel
- Plus besoin de hacks ou de configurations spéciales
- `bcryptjs` fonctionne nativement

### Build et Performance

- Le build est plus rapide (pas de transformation OpenNext)
- Les routes API fonctionnent nativement en Node.js
- Performance identique ou meilleure pour un site vitrine

---

## 🆘 Dépannage

### Erreur de build

- Vérifiez que toutes les variables d'environnement sont configurées
- Vérifiez les logs de build dans Vercel
- Testez localement avec `pnpm run build`

### Erreur de connexion à la base de données

- Vérifiez que `DATABASE_URL` est correctement configuré
- Vérifiez que votre base Neon accepte les connexions depuis Vercel (par défaut, oui)
- Testez la connexion avec `pnpm run dev` localement

### Erreur d'authentification

- Vérifiez que `NEXTAUTH_SECRET` est configuré
- Vérifiez que `NEXTAUTH_URL` correspond à votre URL Vercel
- Vérifiez les secrets OAuth (Google, Twitch) si utilisés

---

## 🎉 Avantages de Vercel

1. **Simplicité** : Plus de hacks, tout fonctionne nativement
2. **Performance** : Optimisé pour Next.js (créé par Vercel)
3. **Déploiements automatiques** : À chaque push sur GitHub
4. **Preview deployments** : Une URL de preview pour chaque PR
5. **Logs intégrés** : Logs directement dans le dashboard
6. **Gratuit** : Plan Hobby gratuit pour les projets personnels

---

## 📚 Ressources

- [Documentation Vercel](https://vercel.com/docs)
- [Documentation Next.js](https://nextjs.org/docs)
- [Documentation Prisma](https://www.prisma.io/docs)
- [Documentation NextAuth.js](https://next-auth.js.org)

---

## ✅ Checklist finale

- [ ] Compte Vercel créé
- [ ] Repository GitHub connecté
- [ ] Variables d'environnement configurées
- [ ] Premier déploiement réussi
- [ ] Endpoint `/api/health` fonctionne
- [ ] Authentification fonctionne
- [ ] Uploads fonctionnent (Vercel Blob automatiquement configuré)
- [ ] Site accessible publiquement

**Félicitations ! Votre migration vers Vercel est terminée ! 🎉**
