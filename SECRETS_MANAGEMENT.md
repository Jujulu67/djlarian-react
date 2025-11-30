# 🔐 Gestion des Secrets - Guide de Sécurité

## ⚠️ IMPORTANT : Les Secrets ne doivent JAMAIS être dans GitHub

### ✅ Ce qui est Sécurisé

- ✅ `.env.local` - **N'est PAS commité** (dans `.gitignore`)
- ✅ Variables d'environnement Vercel - **Sécurisées** (encryptées)
- ✅ Code source - **Ne contient PAS de secrets**

### ❌ Ce qui NE doit PAS être dans GitHub

- ❌ Secrets R2 (Access Key, Secret Key)
- ❌ Connection string Neon avec mot de passe
- ❌ NEXTAUTH_SECRET
- ❌ Clés OAuth (Client Secrets)
- ❌ Toute valeur sensible

---

## 🔒 Configuration des Secrets dans Vercel

### Étape 1 : Aller dans les Variables d'Environnement

1. Vercel Dashboard → votre projet
2. **Settings** → **Environment Variables**

### Étape 2 : Ajouter les Secrets

Pour chaque secret :

1. Cliquer sur **"Add variable"**
2. Entrer le **nom** de la variable
3. Entrer la **valeur** (copier depuis `.env.local` ou depuis les services)
4. **✅ COCHER "Encrypt"** (très important pour les secrets !)
5. Sélectionner **"Production"** (ou l'environment souhaité)
6. Cliquer sur **"Save"**

### Étape 3 : Variables à Configurer comme Secrets

Marquez ces variables comme **"Encrypt"** (Secret) :

- ✅ `DATABASE_URL` - Connection string Neon
- ✅ `NEXTAUTH_SECRET` - Secret NextAuth
- ✅ `R2_SECRET_ACCESS_KEY` - Secret R2
- ✅ `GOOGLE_CLIENT_SECRET` - Secret Google OAuth (🔒 Secret)
- ✅ `TWITCH_CLIENT_SECRET` - Secret Twitch OAuth (🔒 Secret)
- ✅ `SPOTIFY_CLIENT_SECRET` - Secret Spotify pour l'API (auto-détection des releases)
- ✅ `INSTAGRAM_APP_SECRET` - Secret Instagram pour l'API (intégration galerie)
- ✅ `INSTAGRAM_ACCESS_TOKEN` - Token d'accès long-lived Instagram (intégration galerie)
- ✅ `VERCEL_TOKEN` - Token d'accès API Vercel (pour récupérer les stats Analytics/Speed Insights)

### Variables Non-Secrètes (pas besoin d'encrypt)

- `NEXTAUTH_URL` - URL publique
- `CLOUDFLARE_ACCOUNT_ID` - Public
- `R2_ACCESS_KEY_ID` - Public (mais peut être encrypté par précaution)
- `R2_BUCKET_NAME` - Public
- `NODE_ENV` - Public
- `AWS_LAMBDA_JS_RUNTIME` - Runtime Lambda pour Puppeteer/Chromium (⚠️ REQUIS pour auto-détection SoundCloud, valeur: `nodejs22.x`)
- `GOOGLE_CLIENT_ID` - Public (pour OAuth Google)
- `TWITCH_CLIENT_ID` - Public (pour OAuth Twitch et vérifier le statut du stream)
- `NEXT_PUBLIC_*` - Toutes les variables publiques
- `SPOTIFY_ARTIST_ID` - ID de l'artiste Spotify (optionnel, peut être configuré dans l'UI)
- `INSTAGRAM_APP_ID` - ID de l'application Instagram (intégration galerie)
- `INSTAGRAM_USER_ID` - ID du compte Instagram Business (intégration galerie)
- `MUSICBRAINZ_USER_AGENT` - User-Agent pour MusicBrainz (requis, format: "AppName/Version (contact@email.com)")
- `VERCEL_PROJECT_NAME` - Nom du projet Vercel (recommandé, ex: `djlarian-react`)
- `VERCEL_TEAM_SLUG` - Slug de l'équipe Vercel (recommandé, ex: `larians-projects-a2dc5026`)
- `VERCEL_PROJECT_ID` - ID du projet Vercel (optionnel, pour compatibilité)
- `VERCEL_TEAM_ID` - ID de l'équipe Vercel (optionnel, pour compatibilité)
- `YOUTUBE_API_KEY` - Clé API YouTube (déjà utilisée pour l'atelier YouTube)
- `NEXT_PUBLIC_SENTRY_DSN` - DSN Sentry pour error tracking (optionnel)
- `SENTRY_ORG` - Organisation Sentry (optionnel, pour source maps)
- `SENTRY_PROJECT` - Projet Sentry (optionnel, pour source maps)
- `SENTRY_AUTH_TOKEN` - Token d'authentification Sentry (optionnel, pour releases)
- `REQUIRE_MERGE_CONFIRMATION` - Demander confirmation avant fusion de comptes OAuth (optionnel, par défaut: `true`, mettre `false` pour fusion automatique)

**Note** : `TWITCH_CLIENT_ID` et `TWITCH_CLIENT_SECRET` sont optionnels. Si non configurés pour OAuth, les boutons de connexion Twitch ne s'afficheront pas. Pour le statut du stream, si non configurés, l'écran offline personnalisé s'affichera par défaut.

---

## 📋 Liste des Secrets à Configurer

### 1. DATABASE_URL (Secret)

**Où trouver** : Neon Dashboard → votre projet → Connection String

**Valeur** : `postgresql://neondb_owner:xxxxx@ep-xxxxx.eu-central-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require`

**⚠️ IMPORTANT** : Cocher "Encrypt" !

### 2. NEXTAUTH_SECRET (Secret)

**Générer** :

```bash
openssl rand -base64 32
```

**⚠️ IMPORTANT** : Cocher "Encrypt" !

### 3. CLOUDFLARE_ACCOUNT_ID (Non-secret)

**Où trouver** : Cloudflare Dashboard → Overview (en haut à droite)

**Valeur** : Votre Account ID

### 4. R2_ACCESS_KEY_ID (Peut être encrypté par précaution)

**Où trouver** : R2 → Manage R2 API Tokens → votre token

**Valeur** : Access Key ID

### 5. R2_SECRET_ACCESS_KEY (Secret)

**Où trouver** : R2 → Manage R2 API Tokens → votre token

**Valeur** : Secret Access Key

**⚠️ IMPORTANT** : Cocher "Encrypt" !

### 6. R2_BUCKET_NAME (Non-secret)

**Valeur** : `djlarian-uploads`

### 7. NODE_ENV (Non-secret)

**Valeur** : `production`

### 7b. AWS_LAMBDA_JS_RUNTIME (Non-secret, ⚠️ REQUIS pour auto-détection SoundCloud)

**⚠️ IMPORTANT** : Cette variable est **requise** pour que Puppeteer/Chromium fonctionne correctement sur Vercel avec Node.js 22.

**Valeur** : `nodejs22.x`

**Où configurer** : Vercel Dashboard → Settings → Environment Variables

**Note** : Sans cette variable, l'auto-détection SoundCloud échouera avec l'erreur "The input directory does not exist"

### 8. SPOTIFY_CLIENT_ID (Non-secret, mais sensible)

**Où trouver** : Spotify Developer Dashboard → https://developer.spotify.com/dashboard

1. Créer une nouvelle app
2. Copier le Client ID

**Valeur** : Votre Client ID Spotify (ex: `1234567890abcdefghij1234567890ab`)

**Note** : Peut être encrypté par précaution

### 9. SPOTIFY_CLIENT_SECRET (Secret)

**Où trouver** : Spotify Developer Dashboard → votre app → "Show client secret"

**Valeur** : Votre Client Secret Spotify

**⚠️ IMPORTANT** : Cocher "Encrypt" !

### 10. SPOTIFY_ARTIST_ID (Non-secret, optionnel)

**Où trouver** :

- Sur votre profil Spotify for Artists, l'URL contient l'Artist ID
- Exemple : `https://artists.spotify.com/c/artist/6BzYsuiPSFBMJ7YnxLeKbz/profile/overview`
- L'Artist ID est la partie après `/artist/` : `6BzYsuiPSFBMJ7YnxLeKbz`
- Ou utiliser le nom d'artiste dans l'interface (recherche automatique)

**Valeur** : `6BzYsuiPSFBMJ7YnxLeKbz` (Larian)

**Note** : Optionnel, peut être configuré directement dans l'interface admin

### 11. INSTAGRAM_APP_ID (Non-secret, optionnel)

**Où trouver** : Facebook Developers → https://developers.facebook.com/

1. Créer une nouvelle app Facebook (ou utiliser une existante)
2. Ajouter le produit "Instagram Graph API"
3. Dans les paramètres de l'app, copier l'App ID

**Valeur** : Votre App ID Instagram (ex: `1234567890123456`)

**Note** : Optionnel, nécessaire uniquement si vous voulez intégrer les posts Instagram dans la galerie

### 12. INSTAGRAM_APP_SECRET (Secret)

**Où trouver** : Facebook Developers → votre app → Settings → Basic

1. Cliquer sur "Show" à côté de "App Secret"
2. Copier le secret

**Valeur** : Votre App Secret Instagram

**⚠️ IMPORTANT** : Cocher "Encrypt" !

**Note** : Optionnel, nécessaire uniquement si vous voulez intégrer les posts Instagram dans la galerie

### 13. INSTAGRAM_ACCESS_TOKEN (Secret)

**Où trouver** : Facebook Graph API Explorer → https://developers.facebook.com/tools/explorer/

1. Sélectionner votre app Instagram
2. Sélectionner l'utilisateur Instagram Business
3. Générer un token d'accès
4. **Important** : Convertir en token long-lived (60 jours) :
   - Utiliser l'endpoint : `GET /oauth/access_token?grant_type=fb_exchange_token&client_id={app-id}&client_secret={app-secret}&fb_exchange_token={short-lived-token}`
   - Ou utiliser le processus OAuth complet pour obtenir directement un long-lived token

**Valeur** : Votre token d'accès long-lived Instagram

**⚠️ IMPORTANT** : Cocher "Encrypt" !

**Note** : Optionnel, nécessaire uniquement si vous voulez intégrer les posts Instagram dans la galerie. Le token doit avoir les permissions `instagram_basic` et `instagram_content_publish` (si nécessaire).

### 14. INSTAGRAM_USER_ID (Non-secret, optionnel)

**Où trouver** : Facebook Graph API Explorer

1. Utiliser l'endpoint : `GET /me/accounts` pour obtenir les pages Facebook
2. Pour chaque page, utiliser : `GET /{page-id}?fields=instagram_business_account` pour obtenir l'ID Instagram Business
3. L'ID Instagram Business est l'`INSTAGRAM_USER_ID` à utiliser

**Valeur** : Votre Instagram Business Account ID (ex: `17841405309211844`)

**Note** : Optionnel, nécessaire uniquement si vous voulez intégrer les posts Instagram dans la galerie. Le compte Instagram doit être un compte Business ou Creator connecté à une page Facebook.

**Prérequis** :

- Compte Instagram Business ou Creator
- Page Facebook associée au compte Instagram
- App Facebook avec Instagram Graph API activé

### 15. GOOGLE_CLIENT_ID et GOOGLE_CLIENT_SECRET (OAuth Google - Optionnel mais gratuit)

**Pourquoi** : Permet aux utilisateurs de se connecter avec leur compte Google. **100% gratuit** pour l'authentification OAuth.

**Où trouver** : Google Cloud Console → https://console.cloud.google.com/

**Étapes détaillées** :

1. **Créer un projet Google Cloud** :
   - Aller sur https://console.cloud.google.com/
   - Cliquer sur "Sélectionner un projet" → "Nouveau projet"
   - Donner un nom (ex: "DJLarian Auth")
   - Cliquer sur "Créer"

2. **Configurer l'écran de consentement OAuth** :
   - Dans le menu, aller dans "APIs & Services" → "OAuth consent screen"
   - Choisir "Externe" (ou "Interne" si vous avez Google Workspace)
   - Remplir les informations :
     - **Nom de l'application** : DJLarian (ou votre choix)
     - **Email de support utilisateur** : votre email
     - **Email du développeur** : votre email
   - Cliquer sur "Enregistrer et continuer"
   - **Scopes** : Ajouter `email`, `profile`, `openid` (déjà ajoutés par défaut)
   - Cliquer sur "Enregistrer et continuer"
   - **Utilisateurs de test** (si en mode test) : Ajouter votre email pour tester
   - Cliquer sur "Retour au tableau de bord"

3. **Créer des identifiants OAuth 2.0** :
   - Aller dans "APIs & Services" → "Identifiants"
   - Cliquer sur "Créer des identifiants" → "ID client OAuth 2.0"
   - **Type d'application** : Application Web
   - **Nom** : DJLarian Web Client (ou votre choix)
   - **URI de redirection autorisées** :
     - Pour le développement local : `http://localhost:3000/api/auth/callback/google`
     - Pour la production : `https://votre-domaine.com/api/auth/callback/google`
     - Pour Vercel : `https://votre-projet.vercel.app/api/auth/callback/google`
   - Cliquer sur "Créer"
   - **⚠️ IMPORTANT** : Copier immédiatement le **Client ID** et le **Client Secret** (le secret ne sera plus visible après)

**Valeurs à configurer** :

- `GOOGLE_CLIENT_ID` : Votre Client ID Google (ex: `123456789-abcdefghijklmnop.apps.googleusercontent.com`)
- `GOOGLE_CLIENT_SECRET` : Votre Client Secret Google (🔒 Secret)

**Dans Vercel** :

- `GOOGLE_CLIENT_ID` : Ne PAS cocher "Encrypt" (public)
- `GOOGLE_CLIENT_SECRET` : **✅ COCHER "Encrypt"** (secret)

**Limites gratuites** :

- **Illimité** pour l'authentification OAuth standard
- Aucun coût pour la connexion utilisateur
- Quotas généreux pour la plupart des cas d'usage

**Note** : Optionnel. Si non configuré, le bouton "Continuer avec Google" ne s'affichera pas dans le modal de connexion. L'authentification par email/mot de passe reste disponible.

### 16. TWITCH_CLIENT_ID et TWITCH_CLIENT_SECRET (OAuth Twitch - Optionnel mais gratuit)

**Pourquoi** : Permet aux utilisateurs de se connecter avec leur compte Twitch. **100% gratuit** pour l'authentification OAuth.

**Où trouver** : Twitch Developers → https://dev.twitch.tv/console/apps

**Étapes détaillées** :

1. **Créer un compte développeur Twitch** :
   - Aller sur https://dev.twitch.tv/
   - Se connecter avec votre compte Twitch
   - Accepter les conditions d'utilisation des développeurs

2. **Créer une nouvelle application** :
   - Aller sur https://dev.twitch.tv/console/apps
   - Cliquer sur "Register Your Application"
   - Remplir les informations :
     - **Name** : DJLarian (ou votre choix)
     - **OAuth Redirect URLs** :
       - Pour le développement local : `http://localhost:3000/api/auth/callback/twitch`
       - Pour la production : `https://votre-domaine.com/api/auth/callback/twitch`
       - Pour Vercel : `https://votre-projet.vercel.app/api/auth/callback/twitch`
     - **Category** : Website Integration (ou votre choix)
   - Cliquer sur "Create"
   - **⚠️ IMPORTANT** : Copier immédiatement le **Client ID**
   - Cliquer sur "Manage" → "New Secret" pour générer le **Client Secret**
   - **⚠️ IMPORTANT** : Copier immédiatement le **Client Secret** (il ne sera plus visible après)

**Valeurs à configurer** :

- `TWITCH_CLIENT_ID` : Votre Client ID Twitch (ex: `abcdefghijklmnopqrstuvwxyz123456`)
- `TWITCH_CLIENT_SECRET` : Votre Client Secret Twitch (🔒 Secret)

**Dans Vercel** :

- `TWITCH_CLIENT_ID` : Ne PAS cocher "Encrypt" (public)
- `TWITCH_CLIENT_SECRET` : **✅ COCHER "Encrypt"** (secret)

**Limites gratuites** :

- **Illimité** pour l'authentification OAuth
- Aucun coût pour la connexion utilisateur
- Pas de limite de requêtes pour l'authentification

**Note** : Optionnel. Si non configuré, le bouton "Continuer avec Twitch" ne s'affichera pas dans le modal de connexion. L'authentification par email/mot de passe reste disponible. Si `TWITCH_CLIENT_ID` est configuré mais pas pour OAuth (juste pour vérifier le statut du stream), cela fonctionnera aussi.

### 17. MUSICBRAINZ_USER_AGENT (Non-secret, requis)

**Format** : `AppName/Version (contact@email.com)`

**Exemple** : `DJLarianApp/1.0.0 (contact@djlarian.com)`

**Note** : MusicBrainz exige un User-Agent valide pour toutes les requêtes

### 16. LASTFM_API_KEY (Non-secret, optionnel)

**Où trouver** : https://www.last.fm/api/account/create

1. Créer un compte Last.fm
2. Créer une API key (gratuit)

**Valeur** : Votre API key Last.fm

**Note** : Optionnel, l'enrichissement fonctionnera sans mais sera moins complet

### 17. GOOGLE_SEARCH_API_KEY (Non-secret, optionnel)

**Où trouver** : Google Cloud Console

**Étapes détaillées** :

1. **Créer un projet Google Cloud** :
   - Aller sur https://console.cloud.google.com/
   - Cliquer sur "Sélectionner un projet" → "Nouveau projet"
   - Donner un nom (ex: "DJLarian Search")
   - Cliquer sur "Créer"

2. **Activer l'API Custom Search** :
   - Dans le menu, aller dans "APIs & Services" → "Bibliothèque"
   - Rechercher "Custom Search API"
   - Cliquer sur "Custom Search API" → "Activer"

3. **Créer un moteur de recherche personnalisé (Programmable Search Engine)** :
   - Aller sur https://programmablesearchengine.google.com/
   - Cliquer sur "Ajouter" ou "Create a custom search engine"
   - Dans "Sites à rechercher", entrer : `soundcloud.com`
   - Donner un nom (ex: "SoundCloud Search")
   - Cliquer sur "Créer"
   - **⚠️ IMPORTANT** : Noter le **Search Engine ID (CX)** qui s'affiche (format: `xxxxxxxxxxxxxxxxxxxxxxxxx:xxxxxx`)

4. **Créer une clé API** :
   - Retourner sur https://console.cloud.google.com/
   - Aller dans "APIs & Services" → "Identifiants"
   - Cliquer sur "Créer des identifiants" → "Clé API"
   - **Optionnel** : Restreindre la clé API à "Custom Search API" uniquement (plus sécurisé)
   - Copier la clé API générée

**Valeurs à configurer** :

- `GOOGLE_SEARCH_API_KEY` : Votre clé API Google
- `GOOGLE_SEARCH_CX` : Votre Search Engine ID (CX)

**Limites gratuites** :

- **100 requêtes/jour** gratuitement
- Au-delà : $5 pour 1000 requêtes supplémentaires
- Pour un usage modéré (quelques recherches par release), le quota gratuit devrait suffire

**Note** : Optionnel, la recherche SoundCloud fonctionnera sans mais retournera `null` (pas de faux liens 404)

### 18. Sentry - Error Tracking (Optionnel)

**Pourquoi** : Suivi des erreurs en production pour améliorer la stabilité de l'application

**Où trouver** : https://sentry.io/

1. **Créer un compte Sentry** (gratuit jusqu'à 5k erreurs/mois)
2. **Créer un projet** :
   - Platform : Next.js
   - Nom du projet : `djlarian-react` (ou votre choix)

**🎯 Deux options d'intégration :**

#### Option A : DSN Sentry (Recommandé pour erreurs client-side)

- ✅ Capture les erreurs **client-side** (React, JavaScript)
- ✅ Capture les erreurs **serveur** (API routes, Server Components)
- ✅ Contexte riche (stack traces, user context, session replay)
- ❌ Nécessite le SDK dans le code (déjà intégré)

#### Option B : Vercel Log Drains (Recommandé pour logs serveur)

- ✅ **Automatique** - Capture tous les logs Vercel sans code
- ✅ Capture les logs serveur (API routes, builds, fonctions)
- ✅ Configuration simple dans Vercel Dashboard
- ❌ **Ne capture PAS** les erreurs client-side React
- ❌ Nécessite un endpoint Sentry ou intégration native

#### 🏆 Approche Recommandée : Hybride

**Utiliser les deux** pour une couverture complète :

- **Vercel Log Drains** → Logs serveur automatiques
- **DSN Sentry** → Erreurs client-side React (nécessaire)

**📍 Où trouver le DSN dans Sentry :**

**Méthode 1 - Depuis le Dashboard du Projet :**

1. Aller sur votre projet Sentry
2. Cliquer sur **Settings** (icône engrenage en haut à droite)
3. Dans le menu de gauche, cliquer sur **Client Keys (DSN)**
4. Le DSN s'affiche (format : `https://xxxxx@xxxxx.ingest.sentry.io/xxxxx`)
5. Cliquer sur **Copy** pour copier le DSN

**Méthode 2 - Depuis la page "Get Started" :**

1. Sur la page d'accueil du projet
2. Dans la section **"Set up the Sentry SDK"**
3. Le DSN est visible dans les instructions de configuration

**📋 Configuration :**

#### 1. DSN Sentry (Pour erreurs client + serveur)

**⚠️ SÉCURITÉ : Le DSN contient une clé publique mais reste sensible. Ne pas le commiter dans Git !**

**✅ Configuration :**

**Dans Vercel :**

1. **Aller dans Vercel** → Votre projet → **Settings** → **Environment Variables**
2. **Ajouter la variable** :
   - **Nom** : `NEXT_PUBLIC_SENTRY_DSN`
   - **Valeur** : Votre DSN Sentry (voir `.secrets.local.md` pour la valeur réelle)
   - **⚠️ IMPORTANT** : Ne PAS cocher "Encrypt" (variable publique, mais sensible)
   - **Environnements** : Production, Preview, Development (selon vos besoins)
3. **Sauvegarder**

**En local (`.env.local`) :**

```env
NEXT_PUBLIC_SENTRY_DSN=https://xxxxx@xxxxx.ingest.sentry.io/xxxxx
```

**💡 Note :** Le DSN fonctionne en **local ET sur Vercel**. Ajoutez-le dans `.env.local` pour tester en développement.

**Variables optionnelles (pour source maps) :**

- `SENTRY_ORG` : Nom de votre organisation Sentry (optionnel)
  - **Où trouver** : Visible dans l'URL Sentry (ex: `https://sentry.io/organizations/[ORG_NAME]/`)
  - **Note** : Non-secret, visible dans l'URL Sentry

- `SENTRY_PROJECT` : Nom de votre projet Sentry (optionnel)
  - **Où trouver** : Nom du projet que vous avez créé (ex: `djlarian-react`)
  - **Note** : Non-secret, visible dans l'URL Sentry

- `SENTRY_AUTH_TOKEN` : Token d'authentification Sentry (optionnel, pour stats détaillées dans le dashboard admin)
  - **Type de token** : **Personal Access Token** (pas Organization Token)
  - **Où trouver** :
    1. Sentry Dashboard → **Settings** (icône engrenage en bas à gauche)
    2. Dans le menu de gauche, cliquer sur **"Auth Tokens"** (sous "Account")
    3. Cliquer sur **"Create New Token"** (bouton en haut à droite)
    4. Donner un nom (ex: "Admin Dashboard")
    5. **Permissions** : Cocher au minimum :
       - ✅ `project:read` (pour lire les issues)
       - ✅ `org:read` (pour lire les infos de l'organisation)
    6. Cliquer sur **"Create Token"**
    7. **⚠️ IMPORTANT** : Copier le token immédiatement (il ne sera plus visible après)
  - **Dans Vercel** : Cocher "Encrypt" pour cette variable (c'est un secret)
  - **Note** : Sans ce token, le dashboard admin fonctionnera mais affichera juste le statut (Actif/Inactif) sans le nombre d'erreurs détaillé

- `SENTRY_ORG` : Nom de votre organisation Sentry (optionnel, pour source maps)
  - **Où trouver** : Visible dans l'URL Sentry (ex: `https://sentry.io/organizations/[ORG_NAME]/`)
  - **Note** : Non-secret, visible dans l'URL Sentry

- `SENTRY_PROJECT` : Nom de votre projet Sentry (optionnel, pour source maps)
  - **Où trouver** : Nom du projet que vous avez créé (ex: `djlarian-react`)
  - **Note** : Non-secret, visible dans l'URL Sentry

- `SENTRY_AUTH_TOKEN` : Token d'authentification Sentry (optionnel, pour stats détaillées dans le dashboard admin)
  - **Type de token** : **Personal Access Token** (pas Organization Token)
  - **Où trouver** :
    1. Sentry Dashboard → **Settings** (icône engrenage en bas à gauche)
    2. Dans le menu de gauche, cliquer sur **"Auth Tokens"** (sous "Account")
    3. Cliquer sur **"Create New Token"** (bouton en haut à droite)
    4. Donner un nom (ex: "Admin Dashboard")
    5. **Permissions** : Cocher au minimum :
       - ✅ `project:read` (pour lire les issues)
       - ✅ `org:read` (pour lire les infos de l'organisation)
    6. Cliquer sur **"Create Token"**
    7. **⚠️ IMPORTANT** : Copier le token immédiatement (il ne sera plus visible après)
  - **Dans Vercel** : Cocher "Encrypt" pour cette variable (c'est un secret)
  - **Note** : Sans ce token, le dashboard admin fonctionnera mais affichera juste le statut (Actif/Inactif) sans le nombre d'erreurs détaillé

#### 2. Vercel Log Drains avec OpenTelemetry (Pour traces serveur automatiques) - ⚠️ OPTIONNEL

**⚠️ NÉCESSITE VERCEL PRO** - Si vous n'avez pas le plan Pro, ignorez cette section

**⚠️ SÉCURITÉ : L'endpoint contient des identifiants sensibles. Ne pas le commiter !**

**⚠️ FONCTIONNE UNIQUEMENT SUR VERCEL** - Pas en local

**✅ Configuration dans Vercel Dashboard :**

1. **Aller dans Vercel** → Votre projet → **Settings** → **Log Drains**
2. **Cliquer sur "Create Log Drain"**
3. **Sélectionner "OpenTelemetry"** ou **"HTTP Endpoint"**
4. **Configurer l'endpoint** :
   - **Endpoint URL** : Votre endpoint Sentry OTLP (voir `.secrets.local.md` pour la valeur réelle)
   - **Format** : OpenTelemetry (OTLP) - pour les traces
   - **Sources** : Cochez "Functions", "Builds", "Edge Functions"
   - **Note** : Cet endpoint envoie les traces OpenTelemetry directement à Sentry
5. **Sauvegarder**

**💡 Notes importantes :**

- L'endpoint OTLP (`/integration/otlp/v1/traces`) est spécifiquement pour les **traces OpenTelemetry**
- Cela capture automatiquement les traces de performance des fonctions Vercel
- **Fonctionne uniquement sur Vercel** : Les logs locaux ne passent pas par Vercel, donc pas de drain en local
- Pour les logs bruts, vous pouvez aussi créer un drain supplémentaire avec l'endpoint envelope Sentry si nécessaire

**Avantages Vercel Drains :**

- ✅ Capture automatiquement tous les logs serveur
- ✅ Pas besoin de modifier le code
- ✅ Capture les erreurs non gérées par le SDK
- ✅ Logs de build et déploiement

**Note** : Vercel Drains complète le DSN mais ne le remplace pas. Le DSN reste nécessaire pour les erreurs client-side React.

**Limites gratuites** :

- **5,000 erreurs/mois** gratuitement
- **Session replay** inclus (1 session/mois)
- Au-delà : Plans payants disponibles

**💡 Recommandation Finale :**

**Minimum requis (fonctionne sans Vercel Pro) :**

1. **DSN Sentry** → Configurez `NEXT_PUBLIC_SENTRY_DSN` dans Vercel (erreurs client + serveur, **fonctionne en local ET sur Vercel**)
   - ✅ C'est suffisant pour capturer toutes les erreurs
   - ✅ Fonctionne avec le plan Vercel gratuit

**Optionnel (nécessite Vercel Pro) :** 2. **Vercel Log Drains** → Configurez dans Vercel Dashboard (traces de performance automatiques, **uniquement sur Vercel Pro**)

- ⚠️ Nécessite Vercel Pro (plan payant)
- Si vous n'avez pas Pro, ignorez cette étape

**Optionnel (pour stats détaillées dans le dashboard admin) :** 3. **SENTRY_AUTH_TOKEN** → Configurez dans Vercel (pour voir le nombre d'erreurs dans `/admin/configuration`)

- Sans ce token, le dashboard admin affichera juste le statut (Actif/Inactif)
- Les erreurs seront quand même capturées dans Sentry

**🔒 Sécurité :**

- Les valeurs réelles (DSN et endpoint) sont stockées dans `.secrets.local.md` (déjà dans `.gitignore`)
- Ne jamais commiter ces valeurs dans Git
- Le DSN est "public" (d'où `NEXT_PUBLIC_`) mais reste sensible

**🏠 Local vs Production :**

- **DSN Sentry** : Fonctionne partout (local + Vercel). Ajoutez dans `.env.local` pour le dev local.
- **Vercel Drains** : Fonctionne uniquement sur Vercel. Pas de configuration nécessaire en local.

**Note** : Sentry est entièrement optionnel. Si `NEXT_PUBLIC_SENTRY_DSN` n'est pas configuré, l'application fonctionnera normalement sans error tracking. Vercel Drains peut être configuré indépendamment dans le dashboard Vercel.

---

## 🔍 Vérification

### Vérifier que les Secrets ne sont PAS dans GitHub

```bash
# Chercher des secrets dans le repo
git grep -i "spotify_client_secret\|neondb_owner\|nextauth_secret" -- ':!*.md' ':!.env*'
```

Si rien n'est trouvé, c'est bon ! ✅

### Vérifier que .env.local est bien ignoré

```bash
git check-ignore .env.local
```

Si ça retourne `.env.local`, c'est bon ! ✅

---

## 📝 Bonnes Pratiques

1. **✅ Utiliser `.env.local`** pour le développement local (dans .gitignore)
2. **✅ Utiliser Cloudflare Pages Environment Variables** pour la production
3. **✅ Toujours cocher "Encrypt"** pour les secrets dans Cloudflare
4. **❌ Ne JAMAIS commit** de fichiers contenant des secrets
5. **❌ Ne JAMAIS partager** les secrets dans les issues GitHub ou discussions

---

## 🆘 Si un Secret a été Commité par Erreur

1. **Immédiatement** : Régénérer le secret compromis
2. **Supprimer** le secret du repository (git history)
3. **Ajouter** le fichier au .gitignore
4. **Configurer** le nouveau secret dans Cloudflare Pages

---

## ✅ Checklist de Sécurité

- [ ] Aucun secret dans les fichiers commités
- [ ] `.env.local` dans `.gitignore`
- [ ] Tous les secrets configurés dans Cloudflare Pages
- [ ] Tous les secrets marqués comme "Encrypt" dans Cloudflare
- [ ] Documentation mise à jour (sans vraies valeurs)

---

**Tous les secrets doivent être configurés UNIQUEMENT dans Cloudflare Pages, jamais dans le code source !** 🔒
