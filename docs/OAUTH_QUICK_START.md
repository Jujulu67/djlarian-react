# ⚡ OAuth Quick Start - Configuration Rapide

Guide rapide pour configurer OAuth Google et Twitch (100% gratuit) en 10 minutes.

## 🎯 Vue d'ensemble

- **Google OAuth** : 100% gratuit, illimité pour l'authentification
- **Twitch OAuth** : 100% gratuit, illimité pour l'authentification
- **Temps estimé** : 10-15 minutes par provider
- **Code déjà prêt** : Il suffit de configurer les credentials

---

## 📋 Google OAuth - Configuration Rapide

### Étape 1 : Utiliser le projet existant (1 min)

**✅ Vous avez déjà un projet Google Cloud "Larian Search" ?**

Parfait ! Vous pouvez utiliser le **même projet** pour OAuth. C'est même recommandé pour centraliser la configuration.

1. Aller sur https://console.cloud.google.com/
2. **Sélectionner le projet existant** : "Larian Search" (ou le nom de votre projet)
3. Si vous n'avez pas encore de projet, créer un nouveau projet (nom : `Larian` ou `Larian Search`)

**💡 Note** : Un même projet Google Cloud peut avoir plusieurs identifiants :

- Une **clé API** (`GOOGLE_SEARCH_API_KEY`) pour Custom Search API (recherche SoundCloud)
- Un **Client ID/Secret OAuth 2.0** (`GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`) pour l'authentification utilisateur
- Les deux coexistent dans le même projet sans problème

### Étape 2 : Configurer OAuth Consent Screen (3 min)

**⚠️ Si vous utilisez un projet existant** : Vérifiez d'abord si l'écran de consentement OAuth est déjà configuré. Si oui, vous pouvez passer à l'étape 3.

1. Menu → **"APIs & Services"** → **"OAuth consent screen"**
2. Si c'est la première fois, choisir **"Externe"** (ou "Interne" si Google Workspace)
3. Remplir :
   - **Nom de l'application** : `Larian`
   - **Email de support utilisateur** : votre email
   - **Email du développeur** : votre email
4. Cliquer **"Enregistrer et continuer"** (2 fois)
5. **Utilisateurs de test** (si en mode test) : Ajouter votre email
6. Cliquer **"Retour au tableau de bord"**

7. Menu → **"APIs & Services"** → **"OAuth consent screen"**
8. Choisir **"Externe"** (ou "Interne" si Google Workspace)
9. Remplir :
   - **Nom de l'application** : `Larian`
   - **Email de support utilisateur** : votre email
   - **Email du développeur** : votre email
10. Cliquer **"Enregistrer et continuer"** (2 fois)
11. **Utilisateurs de test** (si en mode test) : Ajouter votre email
12. Cliquer **"Retour au tableau de bord"**

### Étape 3 : Créer les identifiants OAuth (3 min)

**💡 Important** : Vous pouvez avoir plusieurs identifiants dans le même projet. Celui-ci sera spécifiquement pour OAuth (authentification utilisateur), différent de votre clé API Custom Search.

1. Menu → **"APIs & Services"** → **"Identifiants"**
2. **"Créer des identifiants"** → **"ID client OAuth 2.0"**
3. **Type** : Application Web
4. **Nom** : `Larian Web Client` (ou `Larian OAuth` pour différencier)
5. **URI de redirection autorisées** :
   ```
   http://localhost:3000/api/auth/callback/google
   https://votre-projet.vercel.app/api/auth/callback/google
   ```
   **⚠️ Important** : Ajoutez les deux URIs (dev et prod) séparément, une par ligne
6. Cliquer **"Créer"**
7. **⚠️ COPIER IMMÉDIATEMENT** :
   - **Client ID** (ex: `123456789-abc...`) → C'est différent de votre `GOOGLE_SEARCH_API_KEY`
   - **Client Secret** (ex: `GOCSPX-abc...`)

**📝 Note** :

- Votre `GOOGLE_SEARCH_API_KEY` reste inchangée et continue de fonctionner pour SoundCloud
- Ce nouveau Client ID/Secret est uniquement pour OAuth (connexion utilisateur)
- Les deux peuvent coexister dans le même projet sans problème

### Étape 4 : Configurer les variables (2 min)

**Dans `.env.local`** :

```env
GOOGLE_CLIENT_ID=votre_client_id_google
GOOGLE_CLIENT_SECRET=votre_client_secret_google
```

**Dans Vercel** (Settings → Environment Variables) :

- `GOOGLE_CLIENT_ID` : Ne PAS cocher "Encrypt"
- `GOOGLE_CLIENT_SECRET` : **COCHER "Encrypt"**

### Étape 5 : Tester

```bash
pnpm run dev
```

Ouvrir http://localhost:3000 → Cliquer "Connexion" → Vérifier que le bouton **"Continuer avec Google"** apparaît.

---

## 🎮 Twitch OAuth - Configuration Rapide

### Étape 1 : Créer le compte développeur (1 min)

1. Aller sur https://dev.twitch.tv/
2. Se connecter avec votre compte Twitch
3. Accepter les conditions développeur

### Étape 2 : Créer l'application (3 min)

1. Aller sur https://dev.twitch.tv/console/apps
2. Cliquer **"Register Your Application"**
3. Remplir :
   - **Name** : `Larian`
   - **OAuth Redirect URLs** :
     ```
     http://localhost:3000/api/auth/callback/twitch
     https://votre-projet.vercel.app/api/auth/callback/twitch
     ```
   - **Category** : Website Integration
4. Cliquer **"Create"**
5. **⚠️ COPIER** : **Client ID**
6. **"Manage"** → **"New Secret"** → **⚠️ COPIER** : **Client Secret**

### Étape 3 : Configurer les variables (2 min)

**Dans `.env.local`** :

```env
TWITCH_CLIENT_ID=votre_client_id_twitch
TWITCH_CLIENT_SECRET=votre_client_secret_twitch
```

**Dans Vercel** :

- `TWITCH_CLIENT_ID` : Ne PAS cocher "Encrypt"
- `TWITCH_CLIENT_SECRET` : **COCHER "Encrypt"**

### Étape 4 : Tester

```bash
pnpm run dev
```

Ouvrir http://localhost:3000 → Cliquer "Connexion" → Vérifier que le bouton **"Continuer avec Twitch"** apparaît.

---

## ✅ Vérification

### Vérifier la configuration

```bash
pnpm run check-env
```

Le script affichera :

- ✅ Variables obligatoires présentes
- ✅ OAuth Google configuré (si configuré)
- ✅ OAuth Twitch configuré (si configuré)

### Vérifier via l'API

```bash
curl http://localhost:3000/api/auth/providers
```

Réponse attendue :

```json
{
  "google": true,
  "twitch": true
}
```

---

## 🐛 Dépannage

### Les boutons OAuth ne s'affichent pas

**Cause** : Variables d'environnement non configurées ou incorrectes.

**Solution** :

1. Vérifier `.env.local` existe et contient les variables
2. Redémarrer le serveur : `pnpm run dev`
3. Vérifier via `/api/auth/providers`

### Erreur "redirect_uri_mismatch"

**Cause** : L'URI de redirection dans Google/Twitch ne correspond pas.

**Solution** :

1. Vérifier que l'URI est **exactement** :
   - Dev : `http://localhost:3000/api/auth/callback/google`
   - Prod : `https://votre-projet.vercel.app/api/auth/callback/google`
2. Pas d'espace, pas de slash final
3. Les URIs doivent correspondre **exactement**

### Le compte n'est pas créé automatiquement

**Cause** : Problème avec la base de données ou Prisma.

**Solution** :

1. Vérifier que `DATABASE_URL` est configuré
2. Appliquer les migrations : `pnpm prisma migrate deploy`
3. Vérifier les logs du serveur

---

---

## 🔗 Fusion de Comptes OAuth

### Comportement par défaut

Par défaut, si un utilisateur essaie de se connecter avec Google/Twitch et qu'un compte existe déjà avec le même email (créé via email/mot de passe), le système :

1. **Détecte** le compte existant
2. **Affiche une page de fusion** pour comparer les deux comptes
3. **Demande confirmation** avant de fusionner
4. **Permet de choisir** quelles informations fusionner (nom, image)

### Configuration

**Par défaut** : La confirmation est **activée** (`REQUIRE_MERGE_CONFIRMATION=true` par défaut)

Pour **désactiver** la confirmation et fusionner automatiquement, ajoutez dans `.env.local` :

```env
REQUIRE_MERGE_CONFIRMATION=false
```

**⚠️ Important** : Cette variable doit aussi être configurée en **production** dans Vercel :

1. Vercel Dashboard → Votre projet → **Settings** → **Environment Variables**
2. Ajouter `REQUIRE_MERGE_CONFIRMATION` avec la valeur `true` (ou `false` pour fusion automatique)
3. Ne PAS cocher "Encrypt" (variable non-secrète)
4. Sélectionner **Production** (et Preview/Development si nécessaire)

### Page de fusion

Quand la confirmation est activée, l'utilisateur voit une page (`/auth/merge-accounts`) qui permet de :

- ✅ Comparer le compte existant et le compte OAuth
- ✅ Choisir quelles informations fusionner (nom, image)
- ✅ Conserver le mot de passe du compte existant
- ✅ Confirmer ou annuler la fusion

---

## 📚 Documentation Complète

Pour plus de détails, voir :

- **Guide complet OAuth** : `docs/OAUTH_SETUP.md`
- **Gestion des secrets** : `SECRETS_MANAGEMENT.md`
- **Vérification env** : `pnpm run check-env`

---

## 🎉 C'est tout !

Une fois configuré, les utilisateurs pourront se connecter avec Google ou Twitch en un clic. Le compte sera créé automatiquement lors de la première connexion.

**Les deux providers sont 100% gratuits pour l'authentification standard !** 🚀
