# Infrastructure et Déploiement - Larian

## Environnements

### Développement Local

- **OS** : macOS, Linux, Windows (WSL recommandé)
- **Node.js** : 22.x (requis)
- **npm** : Inclus avec Node.js
- **Base de données** : SQLite (`prisma/dev.db`)
- **Port** : 3000 (par défaut)

### Production

- **Plateforme** : Vercel (recommandé) ou Cloudflare Pages
- **Base de données** : PostgreSQL (Neon DB)
- **Stockage** : Vercel Blob Storage
- **CDN** : Automatique (Vercel/Cloudflare)

## Prérequis

### Système

- **Node.js** : 22.x minimum
  ```bash
  node --version  # Doit afficher v22.x.x
  ```
- **npm** : Inclus avec Node.js
  ```bash
  npm --version
  ```
- **Git** : Pour cloner le repository
  ```bash
  git --version
  ```

### Services Externes (Production)

- **Neon DB** : Base de données PostgreSQL (gratuit jusqu'à 0.5 GB)
- **Vercel** : Hébergement (gratuit avec limitations)
- **Google Cloud** : OAuth Google (gratuit)
- **Twitch Developers** : OAuth Twitch (gratuit)

## Variables d'Environnement

### Tableau Complet

| Variable                       | Obligatoire | Secret | Description                         | Exemple                       |
| ------------------------------ | ----------- | ------ | ----------------------------------- | ----------------------------- |
| `DATABASE_URL`                 | ✅ Oui      | ✅ Oui | Connection string PostgreSQL/SQLite | `postgresql://...`            |
| `NEXTAUTH_URL`                 | ✅ Oui      | ❌ Non | URL de l'application                | `http://localhost:3000`       |
| `NEXTAUTH_SECRET`              | ✅ Oui      | ✅ Oui | Secret pour NextAuth                | Généré avec `openssl`         |
| `NODE_ENV`                     | ✅ Oui      | ❌ Non | Environnement                       | `production` ou `development` |
| `GOOGLE_CLIENT_ID`             | ❌ Non      | ❌ Non | OAuth Google Client ID              | `123456-...`                  |
| `GOOGLE_CLIENT_SECRET`         | ❌ Non      | ✅ Oui | OAuth Google Secret                 | `GOCSPX-...`                  |
| `TWITCH_CLIENT_ID`             | ❌ Non      | ❌ Non | OAuth Twitch Client ID              | `abc123...`                   |
| `TWITCH_CLIENT_SECRET`         | ❌ Non      | ✅ Oui | OAuth Twitch Secret                 | `xyz789...`                   |
| `BLOB_READ_WRITE_TOKEN`        | ❌ Non      | ✅ Oui | Token Vercel Blob                   | `vercel_blob_...`             |
| `SPOTIFY_CLIENT_ID`            | ❌ Non      | ❌ Non | Spotify API Client ID               | `abc123...`                   |
| `SPOTIFY_CLIENT_SECRET`        | ❌ Non      | ✅ Oui | Spotify API Secret                  | `xyz789...`                   |
| `SPOTIFY_ARTIST_ID`            | ❌ Non      | ❌ Non | ID Artiste Spotify                  | `6BzYsuiPSFBMJ7YnxLeKbz`      |
| `YOUTUBE_API_KEY`              | ❌ Non      | ❌ Non | Clé API YouTube                     | `AIza...`                     |
| `NEXT_PUBLIC_SENTRY_DSN`       | ❌ Non      | ❌ Non | DSN Sentry (public)                 | `https://...`                 |
| `SENTRY_AUTH_TOKEN`            | ❌ Non      | ✅ Oui | Token Sentry (source maps)          | `sntrys_...`                  |
| `NEXT_PUBLIC_UMAMI_URL`        | ❌ Non      | ❌ Non | URL Umami Analytics                 | `https://...`                 |
| `NEXT_PUBLIC_UMAMI_WEBSITE_ID` | ❌ Non      | ❌ Non | Site ID Umami                       | `abc-123...`                  |
| `REQUIRE_MERGE_CONFIRMATION`   | ❌ Non      | ❌ Non | Confirmation fusion OAuth           | `true` ou `false`             |

### Configuration Locale

Créer un fichier `.env.local` à la racine :

```env
# Base de données
DATABASE_URL="file:./prisma/dev.db"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="votre-secret-genere-avec-openssl"

# Environnement
NODE_ENV="development"

# OAuth (optionnel)
GOOGLE_CLIENT_ID="votre-google-client-id"
GOOGLE_CLIENT_SECRET="votre-google-client-secret"
TWITCH_CLIENT_ID="votre-twitch-client-id"
TWITCH_CLIENT_SECRET="votre-twitch-client-secret"

# APIs externes (optionnel)
SPOTIFY_CLIENT_ID="votre-spotify-client-id"
SPOTIFY_CLIENT_SECRET="votre-spotify-client-secret"
SPOTIFY_ARTIST_ID="votre-artist-id"
YOUTUBE_API_KEY="votre-youtube-api-key"
```

### Génération de NEXTAUTH_SECRET

```bash
openssl rand -base64 32
```

Copier le résultat dans `.env.local` et dans Vercel.

## Configuration Docker

### Docker Compose (Umami Analytics)

Le projet inclut un `docker-compose.yml` pour Umami Analytics (optionnel) :

```yaml
version: '3'
services:
  umami:
    image: ghcr.io/umami-software/umami:postgresql-latest
    ports:
      - '3001:3000'
    environment:
      DATABASE_URL: postgresql://umami:${POSTGRES_PASSWORD}@db:5432/umami
      DATABASE_TYPE: postgresql
      HASH_SALT: ${HASH_SALT}
    depends_on:
      - db

  db:
    image: postgres:14-alpine
    environment:
      POSTGRES_DB: umami
      POSTGRES_USER: umami
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - umami-db-data:/var/lib/postgresql/data

volumes:
  umami-db-data:
```

### Utilisation

```bash
# Démarrer Umami
docker-compose up -d

# Arrêter Umami
docker-compose down

# Voir les logs
docker-compose logs -f
```

**Note** : Umami est optionnel. L'application fonctionne sans.

## Déploiement Vercel

### 1. Préparation

1. **Créer un compte Vercel** : https://vercel.com
2. **Installer Vercel CLI** (optionnel) :
   ```bash
   npm i -g vercel
   ```

### 2. Configuration du Projet

1. **Connecter le repository** :
   - Vercel Dashboard → Add New Project
   - Import Git Repository → Sélectionner votre repo
   - Framework Preset : Next.js (détecté automatiquement)

2. **Configuration du build** :
   - Build Command : `npm run build` (détecté automatiquement)
   - Output Directory : `.next` (détecté automatiquement)
   - Install Command : `npm install` (détecté automatiquement)

### 3. Variables d'Environnement

Dans **Settings → Environment Variables**, ajouter :

#### Obligatoires

- `DATABASE_URL` - Connection string Neon (✅ Encrypt)
- `NEXTAUTH_URL` - URL de production (ex: `https://votre-projet.vercel.app`)
- `NEXTAUTH_SECRET` - Secret généré (✅ Encrypt)
- `NODE_ENV` - `production`

#### Optionnelles

- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` (✅ Encrypt pour secret)
- `TWITCH_CLIENT_ID` / `TWITCH_CLIENT_SECRET` (✅ Encrypt pour secret)
- `BLOB_READ_WRITE_TOKEN` (✅ Encrypt)
- `SPOTIFY_CLIENT_ID` / `SPOTIFY_CLIENT_SECRET` (✅ Encrypt pour secret)
- `YOUTUBE_API_KEY`
- `NEXT_PUBLIC_SENTRY_DSN`
- `NEXT_PUBLIC_UMAMI_URL` / `NEXT_PUBLIC_UMAMI_WEBSITE_ID`

### 4. Déploiement

1. **Premier déploiement** :
   - Cliquer sur "Deploy"
   - Attendre la fin du build (2-5 minutes)

2. **Déploiements automatiques** :
   - Push sur `main` → Déploiement automatique
   - Pull requests → Preview deployments

### 5. Vérification

1. **Vérifier le build** :
   - Vercel Dashboard → Deployments
   - Vérifier que le build est réussi

2. **Tester l'application** :
   - Ouvrir l'URL de production
   - Tester l'authentification
   - Vérifier les fonctionnalités principales

## Déploiement Cloudflare Pages (Alternative)

### 1. Préparation

1. **Créer un compte Cloudflare** : https://dash.cloudflare.com
2. **Créer un bucket R2** (pour uploads) :
   - R2 → Create bucket
   - Nom : `larian-uploads`
   - Créer un API token avec permissions Read & Write

### 2. Configuration

1. **Connecter le repository** :
   - Pages → Create a project
   - Connect to Git → Autoriser Cloudflare
   - Sélectionner le repository

2. **Configuration du build** :
   - Framework preset : `Next.js`
   - Build command : `npm run build`
   - Build output directory : `.next`
   - Root directory : `/`

3. **Variables d'environnement** :
   - Mêmes variables que Vercel
   - Ajouter `CLOUDFLARE_ACCOUNT_ID`
   - Ajouter `R2_ACCESS_KEY_ID` et `R2_SECRET_ACCESS_KEY` (✅ Encrypt)

### 3. Déploiement

- Push sur `main` → Déploiement automatique
- Preview deployments pour PRs

## Base de Données

### Développement Local (SQLite)

```bash
# Setup initial
npm run db:setup:local

# Reset (supprime et recrée)
npm run db:reset:local

# Prisma Studio (GUI)
npm run db:studio
```

**Fichier** : `prisma/dev.db` (créé automatiquement)

### Production (PostgreSQL - Neon DB)

#### 1. Créer un compte Neon

1. Aller sur https://neon.tech
2. Sign Up (avec GitHub recommandé)
3. Créer un projet :
   - Name : `larian`
   - Region : Europe (Frankfurt) ou la plus proche
   - PostgreSQL : 15 ou 16

#### 2. Récupérer la Connection String

1. Neon Dashboard → votre projet
2. Copier la connection string (format : `postgresql://user:password@host/database?sslmode=require`)

#### 3. Configurer les Migrations

```bash
# Appliquer les migrations
npx prisma migrate deploy

# Générer le client Prisma
npx prisma generate
```

#### 4. Vérification

```bash
# Ouvrir Prisma Studio (connecté à Neon)
DATABASE_URL="votre-connection-string-neon" npx prisma studio
```

### Scripts de Migration

```bash
# Migration production
npm run db:migrate:production

# Migration images Blob
npm run db:migrate:blob-images

# Toutes les migrations
npm run db:migrate:all

# Diagnostic
npm run db:diagnose
npm run db:diagnose-prod
```

## Stockage - Vercel Blob Storage

### Configuration Automatique

Vercel Blob est automatiquement configuré lors du déploiement sur Vercel. Aucune configuration manuelle nécessaire.

### Configuration Manuelle (Optionnel)

1. **Vercel Dashboard** → Storage → Create Database
2. **Sélectionner** : Blob
3. **Nom** : `larian-blob` (ou votre choix)
4. **Récupérer le token** : `BLOB_READ_WRITE_TOKEN`
5. **Ajouter dans Vercel** : Environment Variables (✅ Encrypt)

### Utilisation

Le code utilise automatiquement Vercel Blob en production et le stockage local en développement.

## Configuration OAuth

### Google OAuth

Voir [docs/OAUTH_QUICK_START.md](OAUTH_QUICK_START.md) pour le guide rapide (10-15 min).

**Résumé** :

1. Google Cloud Console → Créer un projet
2. OAuth Consent Screen → Configurer
3. Identifiants → Créer OAuth 2.0 Client ID
4. Copier Client ID et Secret
5. Configurer dans `.env.local` et Vercel

### Twitch OAuth

Voir [docs/OAUTH_QUICK_START.md](OAUTH_QUICK_START.md) pour le guide rapide (10-15 min).

**Résumé** :

1. Twitch Developers → Créer une application
2. Copier Client ID
3. Générer Client Secret
4. Configurer dans `.env.local` et Vercel

**Note** : Les deux providers OAuth sont **100% gratuits** pour l'authentification standard.

## CI/CD

### GitHub Actions (Si configuré)

Le projet peut être configuré avec GitHub Actions pour :

- Tests automatiques
- Linting
- Build de vérification

**Exemple de workflow** (à créer dans `.github/workflows/ci.yml`) :

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '22'
      - run: npm ci
      - run: npm run lint
      - run: npm run type-check
      - run: npm test
```

### Vercel (Automatique)

- **Push sur `main`** → Déploiement automatique production
- **Pull Request** → Preview deployment
- **Build automatique** avec détection des erreurs

## Monitoring

### Sentry (Error Tracking)

#### Configuration

1. **Créer un compte Sentry** : https://sentry.io
2. **Créer un projet** : Platform Next.js
3. **Récupérer le DSN** : Settings → Client Keys (DSN)
4. **Configurer dans Vercel** :
   - `NEXT_PUBLIC_SENTRY_DSN` (non-secret, mais sensible)
   - `SENTRY_ORG` (optionnel, pour source maps)
   - `SENTRY_PROJECT` (optionnel, pour source maps)
   - `SENTRY_AUTH_TOKEN` (✅ Encrypt, pour stats détaillées)

#### Utilisation

L'application capture automatiquement :

- Erreurs client-side (React)
- Erreurs serveur (API routes, Server Components)
- Stack traces avec contexte

**Limites gratuites** : 5,000 erreurs/mois

### Umami Analytics

#### Configuration

1. **Installer Umami** (optionnel) :

   ```bash
   docker-compose up -d
   ```

2. **Créer un site** dans Umami Dashboard

3. **Configurer dans Vercel** :
   - `NEXT_PUBLIC_UMAMI_URL` : URL de votre instance Umami
   - `NEXT_PUBLIC_UMAMI_WEBSITE_ID` : ID du site créé

**Note** : Umami est optionnel. L'application fonctionne sans.

### Vercel Analytics

Automatiquement activé sur Vercel. Aucune configuration nécessaire.

- **Analytics** : Visites, pages vues, etc.
- **Speed Insights** : Performance, Core Web Vitals

## Scripts Utilitaires

### Vérification de Configuration

```bash
# Vérifier les variables d'environnement
npm run check-env
```

Affiche :

- ✅ Variables obligatoires présentes
- ✅ OAuth configuré (si configuré)
- ⚠️ Variables manquantes

### Base de Données

```bash
# Setup local
npm run db:setup:local

# Setup production
npm run db:production

# Studio (GUI)
npm run db:studio

# Migrations
npm run db:migrate:production
```

### Développement

```bash
# Serveur de développement
npm run dev

# Build de production
npm run build

# Linting
npm run lint
npm run lint:fix

# Tests
npm test
npm run test:coverage
```

## Dépannage

### Erreurs de Build

1. **Vérifier Node.js version** : Doit être 22.x
2. **Vérifier les variables d'environnement** : `npm run check-env`
3. **Vérifier Prisma** : `npx prisma generate`
4. **Vérifier les logs Vercel** : Dashboard → Deployments → Logs

### Erreurs de Base de Données

1. **Vérifier DATABASE_URL** : Format correct
2. **Vérifier les migrations** : `npx prisma migrate deploy`
3. **Vérifier la connexion** : `npx prisma studio`

### Erreurs OAuth

1. **Vérifier les URIs de redirection** : Doivent correspondre exactement
2. **Vérifier les credentials** : Client ID et Secret corrects
3. **Vérifier NEXTAUTH_URL** : Doit correspondre à l'URL de l'application

### Erreurs d'Upload

1. **Vérifier BLOB_READ_WRITE_TOKEN** : Configuré en production
2. **Vérifier les permissions** : Read & Write
3. **Vérifier les logs** : Vercel Dashboard → Functions → Logs

## Checklist de Déploiement

### Avant le Déploiement

- [ ] Node.js 22.x installé
- [ ] Repository cloné
- [ ] `.env.local` configuré (développement)
- [ ] Base de données locale fonctionnelle
- [ ] Tests passent (`npm test`)
- [ ] Build fonctionne (`npm run build`)

### Configuration Production

- [ ] Compte Vercel créé
- [ ] Repository connecté à Vercel
- [ ] Compte Neon créé
- [ ] Base de données Neon configurée
- [ ] Migrations appliquées
- [ ] Variables d'environnement configurées dans Vercel
- [ ] Secrets marqués comme "Encrypt"
- [ ] OAuth configuré (optionnel)
- [ ] Sentry configuré (optionnel)
- [ ] Umami configuré (optionnel)

### Après le Déploiement

- [ ] Site accessible
- [ ] Authentification fonctionne
- [ ] Upload d'images fonctionne
- [ ] API routes fonctionnent
- [ ] Pas d'erreurs dans les logs
- [ ] Analytics fonctionnent (si configurés)

## Ressources

- [Documentation Vercel](https://vercel.com/docs)
- [Documentation Neon](https://neon.tech/docs)
- [Documentation NextAuth](https://next-auth.js.org)
- [Guide OAuth Rapide](OAUTH_QUICK_START.md)
- [Guide OAuth Complet](OAUTH_SETUP.md)
