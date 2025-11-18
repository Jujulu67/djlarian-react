# Guide Pratique : Déploiement sur Cloudflare Pages

Ce guide vous accompagne étape par étape pour déployer votre site sur Cloudflare Pages.

---

## 📋 Prérequis

- Compte GitHub (pour le déploiement automatique)
- Compte Cloudflare (gratuit)
- Compte sur un provider PostgreSQL (Neon, Supabase, ou Railway)
- Node.js et npm installés localement

---

## 🗄️ Étape 1 : Configuration de la Base de Données

### Option A : Neon (Recommandé)

1. **Créer un compte** : https://neon.tech
2. **Créer un nouveau projet**
3. **Copier la connection string** (format : `postgresql://user:password@host/database?sslmode=require`)

### Option B : Supabase

1. **Créer un compte** : https://supabase.com
2. **Créer un nouveau projet**
3. **Aller dans Settings → Database**
4. **Copier la connection string** (format : `postgresql://postgres:[password]@[host]:5432/postgres`)

### Migration de la Base de Données

```bash
# 1. Exporter votre base locale (si vous avez des données)
pg_dump -h localhost -U postgres -d djlarian > backup.sql

# 2. Appliquer les migrations Prisma sur la nouvelle base
# Mettre à jour .env avec la nouvelle DATABASE_URL
DATABASE_URL="postgresql://user:password@host/database?sslmode=require"

# 3. Appliquer les migrations
npx prisma migrate deploy

# 4. (Optionnel) Importer les données
psql -h [host] -U [user] -d [database] < backup.sql
```

---

## 📦 Étape 2 : Configuration Cloudflare R2 (Uploads)

### 2.1 Créer un Bucket R2

1. **Aller dans Cloudflare Dashboard** → **R2**
2. **Créer un bucket** : `djlarian-uploads`
3. **Notez le nom du bucket**

### 2.2 Créer des API Tokens

1. **Aller dans R2 → Manage R2 API Tokens**
2. **Créer un token** avec les permissions :
   - Object Read & Write
3. **Notez** :
   - `Access Key ID`
   - `Secret Access Key`
   - `Account ID` (visible dans l'URL ou dans Overview)

### 2.3 Installer les Dépendances

```bash
npm install @aws-sdk/client-s3
```

### 2.4 Créer un Fichier de Configuration R2

Créer `src/lib/r2.ts` :

```typescript
import { S3Client } from '@aws-sdk/client-s3';

const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
const bucketName = process.env.R2_BUCKET_NAME || 'djlarian-uploads';

if (!accountId || !accessKeyId || !secretAccessKey) {
  throw new Error('Missing R2 credentials');
}

export const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
});

export { bucketName };
```

### 2.5 Modifier l'API d'Upload

Modifier `src/app/api/upload/route.ts` :

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { r2Client, bucketName } from '@/lib/r2';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const formData = await request.formData();
    const imageId = formData.get('imageId') as string | null;
    const croppedImage = formData.get('croppedImage') as Blob | null;

    if (!imageId || !croppedImage) {
      return NextResponse.json(
        { error: 'Image ID et image recadrée requis' },
        { status: 400 }
      );
    }

    // Convertir le Blob en Buffer
    const arrayBuffer = await croppedImage.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload vers R2
    const key = `uploads/${imageId}.jpg`;
    
    await r2Client.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        Body: buffer,
        ContentType: 'image/jpeg',
      })
    );

    // Retourner l'URL publique (vous devrez configurer un custom domain R2 ou utiliser l'URL publique)
    const publicUrl = process.env.R2_PUBLIC_URL 
      ? `${process.env.R2_PUBLIC_URL}/${key}`
      : `https://pub-[account-id].r2.dev/${key}`;

    return NextResponse.json({
      success: true,
      imageId,
      url: publicUrl,
    });
  } catch (error) {
    console.error('[API UPLOAD] Erreur:', error);
    return NextResponse.json(
      { error: 'Erreur lors de l\'upload' },
      { status: 500 }
    );
  }
}
```

### 2.6 Configurer un Custom Domain R2 (Optionnel mais Recommandé)

1. **Aller dans R2 → votre bucket → Settings**
2. **Configurer un Custom Domain** (ex: `cdn.votre-site.com`)
3. **Ajouter cette URL dans vos variables d'environnement** :
   ```env
   R2_PUBLIC_URL=https://cdn.votre-site.com
   ```

---

## 🔐 Étape 3 : Configuration des Variables d'Environnement

### 3.1 Créer un Fichier `.env.example`

```env
# Database
DATABASE_URL=postgresql://user:password@host/database?sslmode=require

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=votre-secret-tres-long-et-aleatoire-genere-avec-openssl

# OAuth Providers
GOOGLE_CLIENT_ID=votre-google-client-id
GOOGLE_CLIENT_SECRET=votre-google-client-secret
TWITCH_CLIENT_ID=votre-twitch-client-id
TWITCH_CLIENT_SECRET=votre-twitch-client-secret

# Cloudflare R2
CLOUDFLARE_ACCOUNT_ID=votre-account-id
R2_ACCESS_KEY_ID=votre-access-key-id
R2_SECRET_ACCESS_KEY=votre-secret-access-key
R2_BUCKET_NAME=djlarian-uploads
R2_PUBLIC_URL=https://cdn.votre-site.com

# Umami Analytics (optionnel)
NEXT_PUBLIC_UMAMI_URL=https://votre-umami.com
NEXT_PUBLIC_UMAMI_WEBSITE_ID=votre-website-id

# Node Environment
NODE_ENV=production
```

### 3.2 Générer NEXTAUTH_SECRET

```bash
openssl rand -base64 32
```

---

## 🚀 Étape 4 : Déploiement sur Cloudflare Pages

### 4.1 Préparer le Projet

1. **Vérifier que le build fonctionne localement** :
   ```bash
   npm run build
   ```

2. **Créer un fichier `_headers` dans `public/`** (optionnel, pour les headers de sécurité) :
   ```
   /*
     X-Frame-Options: DENY
     X-Content-Type-Options: nosniff
     Referrer-Policy: strict-origin-when-cross-origin
   ```

### 4.2 Connecter le Repository GitHub

1. **Aller dans Cloudflare Dashboard** → **Pages**
2. **Créer un nouveau projet**
3. **Connecter votre repository GitHub**
4. **Sélectionner le repository** `djlarian-react`

### 4.3 Configurer le Build

Dans les paramètres du projet Cloudflare Pages :

- **Framework preset** : `Next.js`
- **Build command** : `npm run build`
- **Build output directory** : `.next`
- **Root directory** : `/` (racine du projet)

### 4.4 Configurer les Variables d'Environnement

Dans **Settings → Environment Variables**, ajouter toutes les variables de `.env.example` :

1. **Production variables** :
   - `DATABASE_URL`
   - `NEXTAUTH_URL` (votre URL Cloudflare Pages : `https://votre-projet.pages.dev`)
   - `NEXTAUTH_SECRET`
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `TWITCH_CLIENT_ID`
   - `TWITCH_CLIENT_SECRET`
   - `CLOUDFLARE_ACCOUNT_ID`
   - `R2_ACCESS_KEY_ID`
   - `R2_SECRET_ACCESS_KEY`
   - `R2_BUCKET_NAME`
   - `R2_PUBLIC_URL`
   - `NEXT_PUBLIC_UMAMI_URL` (si utilisé)
   - `NEXT_PUBLIC_UMAMI_WEBSITE_ID` (si utilisé)
   - `NODE_ENV` = `production`

2. **Pour les secrets sensibles**, utiliser **Wrangler** :
   ```bash
   npm install -g wrangler
   wrangler login
   wrangler pages secret put NEXTAUTH_SECRET
   wrangler pages secret put DATABASE_URL
   wrangler pages secret put GOOGLE_CLIENT_SECRET
   wrangler pages secret put TWITCH_CLIENT_SECRET
   wrangler pages secret put R2_SECRET_ACCESS_KEY
   ```

### 4.5 Déployer

1. **Cloudflare Pages va automatiquement détecter les push sur votre branche principale**
2. **Ou déclencher manuellement un déploiement** depuis le dashboard
3. **Attendre la fin du build** (environ 2-5 minutes)

---

## 🧪 Étape 5 : Tests Post-Déploiement

### Checklist de Vérification

- [ ] **Page d'accueil** se charge correctement
- [ ] **Navigation** entre les pages fonctionne
- [ ] **Authentification** (connexion/déconnexion)
- [ ] **Panel admin** accessible (si admin)
- [ ] **API routes** fonctionnent (tester `/api/music`, `/api/events`)
- [ ] **Upload d'images** fonctionne (tester depuis le panel admin)
- [ ] **Images affichées** correctement (vérifier les URLs R2)
- [ ] **Base de données** : créer/modifier un événement
- [ ] **Base de données** : créer/modifier une track

### Tests Spécifiques

```bash
# Tester l'API music
curl https://votre-site.pages.dev/api/music

# Tester l'API events
curl https://votre-site.pages.dev/api/events

# Vérifier les images
# Ouvrir https://votre-site.pages.dev/uploads/[image-id].jpg
```

---

## 🔧 Étape 6 : Configuration du Domaine Personnalisé (Optionnel)

1. **Aller dans Pages → votre projet → Custom domains**
2. **Ajouter un domaine** (ex: `www.votre-site.com`)
3. **Suivre les instructions DNS** :
   - Ajouter un enregistrement CNAME pointant vers `votre-projet.pages.dev`
4. **Attendre la propagation DNS** (quelques minutes)

---

## 🐛 Dépannage

### Erreur : "Cannot connect to database"

- Vérifier que `DATABASE_URL` est correcte
- Vérifier que la base de données autorise les connexions depuis Cloudflare
- Vérifier que `?sslmode=require` est présent dans l'URL

### Erreur : "NextAuth session not working"

- Vérifier que `NEXTAUTH_URL` correspond à votre URL Cloudflare Pages
- Vérifier que `NEXTAUTH_SECRET` est défini
- Vérifier les cookies dans les DevTools du navigateur

### Erreur : "Upload failed"

- Vérifier les credentials R2
- Vérifier que le bucket existe
- Vérifier les permissions du token R2

### Erreur : "Build failed"

- Vérifier les logs de build dans Cloudflare Pages
- Vérifier que toutes les dépendances sont dans `package.json`
- Vérifier que `npm run build` fonctionne localement

### Images ne s'affichent pas

- Vérifier que `R2_PUBLIC_URL` est correct
- Vérifier que le custom domain R2 est configuré
- Vérifier les permissions du bucket R2 (doit être public pour les images)

---

## 📊 Monitoring et Analytics

### Cloudflare Analytics

Cloudflare Pages inclut des analytics gratuits :
- Vues de pages
- Visiteurs uniques
- Pays d'origine
- Bandwidth utilisé

### Umami Analytics

Si vous utilisez Umami, vérifier que :
- `NEXT_PUBLIC_UMAMI_URL` est correct
- `NEXT_PUBLIC_UMAMI_WEBSITE_ID` est correct
- Le script Umami se charge (vérifier dans les DevTools)

---

## 🔄 Mises à Jour Futures

### Déploiement Automatique

Cloudflare Pages se met à jour automatiquement à chaque push sur votre branche principale.

### Déploiement Manuel

1. **Via GitHub** : Push sur `main`
2. **Via Wrangler** :
   ```bash
   npm run build
   wrangler pages deploy .next --project-name=votre-projet
   ```

---

## 📚 Ressources Supplémentaires

- [Documentation Cloudflare Pages](https://developers.cloudflare.com/pages/)
- [Documentation Cloudflare R2](https://developers.cloudflare.com/r2/)
- [Next.js sur Cloudflare Pages](https://developers.cloudflare.com/pages/framework-guides/nextjs/)
- [Prisma avec Cloudflare](https://www.prisma.io/docs/guides/deployment/deployment-guides/deploying-to-cloudflare-workers-and-pages)

---

## ✅ Résumé

Une fois toutes ces étapes complétées, votre site sera :
- ✅ Déployé sur Cloudflare Pages (gratuit)
- ✅ Connecté à une base PostgreSQL externe
- ✅ Utilisant Cloudflare R2 pour les uploads
- ✅ Accessible via un domaine personnalisé (optionnel)
- ✅ Avec déploiement automatique depuis GitHub

**Temps total estimé :** 2-4 heures (selon votre expérience)

