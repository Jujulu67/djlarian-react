# ⚡ Quick Start : Déploiement Vercel + Neon

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

### 2. Vercel Blob - Uploads (automatique)

Vercel Blob est automatiquement configuré lors du déploiement. Aucune configuration manuelle nécessaire.

### 3. Vercel - Déploiement (5 min)

1. **Connecter le repo** :
   - Dashboard Vercel → Add New Project
   - Import Git Repository → Sélectionner votre repo
2. **Configurer le build** :
   - Framework Preset : Next.js (détecté automatiquement)
   - Build command et Output directory : détectés automatiquement
3. **Variables d'environnement** (Settings → Environment Variables) :
   ```env
   DATABASE_URL=postgresql://... (connection string Neon)
   NEXTAUTH_URL=https://votre-projet.vercel.app
   NEXTAUTH_SECRET=<générer avec: openssl rand -base64 32>
   NODE_ENV=production
   SPOTIFY_CLIENT_ID=<votre_client_id_spotify>
   SPOTIFY_CLIENT_SECRET=<votre_client_secret_spotify> (🔒 Secret)
   SPOTIFY_ARTIST_ID=<votre_artist_id_spotify>
   YOUTUBE_API_KEY=<votre_cle_api_youtube>
   ```
   - Vos variables OAuth (Google, Twitch)
   - Variables MusicBrainz/Last.fm (optionnel, voir SECRETS_MANAGEMENT.md)
4. **Déployer** : Save and Deploy

---

## 🔑 Variables d'Environnement Requises

### Obligatoires

- `DATABASE_URL` - Connection string Neon
- `NEXTAUTH_URL` - URL de votre site Cloudflare Pages
- `NEXTAUTH_SECRET` - Générer avec `openssl rand -base64 32`
- `SPOTIFY_CLIENT_ID` - Client ID Spotify
- `SPOTIFY_CLIENT_SECRET` - Client Secret Spotify (🔒 Secret)
- `SPOTIFY_ARTIST_ID` - ID de l'artiste Spotify
- `YOUTUBE_API_KEY` - Clé API YouTube

### Optionnelles (si utilisées)

- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`
- `TWITCH_CLIENT_ID` / `TWITCH_CLIENT_SECRET`
- `R2_PUBLIC_URL` - URL publique R2 (si custom domain)
- `NEXT_PUBLIC_UMAMI_URL` / `NEXT_PUBLIC_UMAMI_WEBSITE_ID`
- `PRISMA_LOG_QUERIES` - Activer les logs de requêtes Prisma pour le debug (défaut: `false`)

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
