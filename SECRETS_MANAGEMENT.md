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
- ✅ `GOOGLE_CLIENT_SECRET` - Si utilisé
- ✅ `TWITCH_CLIENT_SECRET` - Si utilisé
- ✅ `SPOTIFY_CLIENT_SECRET` - Secret Spotify pour l'API (auto-détection des releases)

### Variables Non-Secrètes (pas besoin d'encrypt)

- `NEXTAUTH_URL` - URL publique
- `CLOUDFLARE_ACCOUNT_ID` - Public
- `R2_ACCESS_KEY_ID` - Public (mais peut être encrypté par précaution)
- `R2_BUCKET_NAME` - Public
- `NODE_ENV` - Public
- `TWITCH_CLIENT_ID` - Public (pour vérifier le statut du stream)
- `NEXT_PUBLIC_*` - Toutes les variables publiques
- `SPOTIFY_ARTIST_ID` - ID de l'artiste Spotify (optionnel, peut être configuré dans l'UI)
- `MUSICBRAINZ_USER_AGENT` - User-Agent pour MusicBrainz (requis, format: "AppName/Version (contact@email.com)")
- `YOUTUBE_API_KEY` - Clé API YouTube (déjà utilisée pour l'atelier YouTube)

**Note** : `TWITCH_CLIENT_ID` et `TWITCH_CLIENT_SECRET` sont optionnels. Si non configurés, l'écran offline personnalisé s'affichera par défaut.

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

### 11. MUSICBRAINZ_USER_AGENT (Non-secret, requis)

**Format** : `AppName/Version (contact@email.com)`

**Exemple** : `DJLarianApp/1.0.0 (contact@djlarian.com)`

**Note** : MusicBrainz exige un User-Agent valide pour toutes les requêtes

### 12. LASTFM_API_KEY (Non-secret, optionnel)

**Où trouver** : https://www.last.fm/api/account/create

1. Créer un compte Last.fm
2. Créer une API key (gratuit)

**Valeur** : Votre API key Last.fm

**Note** : Optionnel, l'enrichissement fonctionnera sans mais sera moins complet

### 13. GOOGLE_SEARCH_API_KEY (Non-secret, optionnel)

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
