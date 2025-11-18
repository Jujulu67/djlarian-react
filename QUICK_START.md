# ⚡ Quick Start : Déploiement Cloudflare Pages + Neon

## 🎯 Démarrage Rapide (15 minutes)

### 1. Neon - Base de Données (5 min)

1. **Créer un compte** : https://neon.tech → Sign Up
2. **Créer un projet** :
   - Name : `djlarian`
   - Region : Europe (Frankfurt) ou la plus proche
   - PostgreSQL : 15
3. **Copier la connection string** (format : `postgresql://...`)
4. **Mettre à jour `.env.local`** :
   ```env
   DATABASE_URL="postgresql://user:password@host/database?sslmode=require"
   ```
5. **Appliquer les migrations** :
   ```bash
   npx prisma migrate deploy
   npx prisma generate
   ```

### 2. Cloudflare R2 - Uploads (5 min)

1. **Créer un compte** : https://dash.cloudflare.com/sign-up
2. **Créer un bucket R2** :
   - Dashboard → R2 → Create bucket
   - Name : `djlarian-uploads`
3. **Créer un API token** :
   - R2 → Manage R2 API Tokens → Create API token
   - Permissions : Object Read & Write
   - **Sauvegarder** : Access Key ID, Secret Access Key, Account ID

### 3. Cloudflare Pages - Déploiement (5 min)

1. **Connecter le repo** :
   - Dashboard → Pages → Create a project
   - Connect to Git → Sélectionner votre repo
2. **Configurer le build** :
   - Framework : Next.js
   - Build command : `npm run build`
   - Output directory : `.next`
3. **Variables d'environnement** (Settings → Environment Variables) :
   ```env
   DATABASE_URL=postgresql://... (connection string Neon)
   NEXTAUTH_URL=https://votre-projet.pages.dev
   NEXTAUTH_SECRET=<générer avec: openssl rand -base64 32>
   CLOUDFLARE_ACCOUNT_ID=<votre account ID>
   R2_ACCESS_KEY_ID=<votre access key>
   R2_SECRET_ACCESS_KEY=<votre secret key>
   R2_BUCKET_NAME=djlarian-uploads
   NODE_ENV=production
   ```
   + Vos variables OAuth (Google, Twitch)
4. **Déployer** : Save and Deploy

---

## 🔑 Variables d'Environnement Requises

### Obligatoires

- `DATABASE_URL` - Connection string Neon
- `NEXTAUTH_URL` - URL de votre site Cloudflare Pages
- `NEXTAUTH_SECRET` - Générer avec `openssl rand -base64 32`
- `CLOUDFLARE_ACCOUNT_ID` - Account ID Cloudflare
- `R2_ACCESS_KEY_ID` - R2 Access Key
- `R2_SECRET_ACCESS_KEY` - R2 Secret Key
- `R2_BUCKET_NAME` - Nom du bucket (ex: `djlarian-uploads`)

### Optionnelles (si utilisées)

- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`
- `TWITCH_CLIENT_ID` / `TWITCH_CLIENT_SECRET`
- `R2_PUBLIC_URL` - URL publique R2 (si custom domain)
- `NEXT_PUBLIC_UMAMI_URL` / `NEXT_PUBLIC_UMAMI_WEBSITE_ID`

---

## 🧪 Test Rapide

```bash
# 1. Tester le build localement
npm run build

# 2. Vérifier que Prisma fonctionne
npx prisma studio

# 3. Tester l'upload (en dev, utilise le système local)
# Aller sur http://localhost:3000/admin et uploader une image
```

---

## 📚 Documentation Complète

- **Guide détaillé** : `DEPLOYMENT_STEP_BY_STEP.md`
- **Analyse technique** : `CLOUDFLARE_DEPLOYMENT_ANALYSIS.md`
- **Guide de setup** : `CLOUDFLARE_SETUP_GUIDE.md`

---

## 🆘 Besoin d'Aide ?

Consultez la section "Dépannage" dans `DEPLOYMENT_STEP_BY_STEP.md`

