# Variables OAuth à configurer dans Vercel

## 📋 Liste des variables à ajouter

Voici les variables d'environnement OAuth à configurer dans Vercel pour que l'authentification Google et Twitch fonctionne en production.

## 🔐 Variables OAuth Google

### 1. `GOOGLE_CLIENT_ID`

- **Type** : Public (ne pas cocher "Encrypt")
- **Description** : Client ID OAuth de Google
- **Où trouver** : Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client IDs
- **Exemple** : `123456789-abcdefghijklmnop.apps.googleusercontent.com`

### 2. `GOOGLE_CLIENT_SECRET`

- **Type** : Secret (✅ **COCHER "Encrypt"**)
- **Description** : Client Secret OAuth de Google
- **Où trouver** : Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client IDs → Votre client → Secret
- **Exemple** : `GOCSPX-abcdefghijklmnopqrstuvwxyz123456`

## 🎮 Variables OAuth Twitch

### 3. `TWITCH_CLIENT_ID`

- **Type** : Public (ne pas cocher "Encrypt")
- **Description** : Client ID OAuth de Twitch
- **Où trouver** : Twitch Developers → https://dev.twitch.tv/console/apps → Votre application → Client ID
- **Exemple** : `abcdefghijklmnopqrstuvwxyz123456`

### 4. `TWITCH_CLIENT_SECRET`

- **Type** : Secret (✅ **COCHER "Encrypt"**)
- **Description** : Client Secret OAuth de Twitch
- **Où trouver** : Twitch Developers → https://dev.twitch.tv/console/apps → Votre application → Manage → New Secret
- **Exemple** : `abcdefghijklmnopqrstuvwxyz123456789`

### 5. `TWITCH_BROADCASTER_ID` (Optionnel)

- **Type** : Public (ne pas cocher "Encrypt")
- **Description** : ID du broadcaster Twitch pour vérifier les abonnements
- **Où trouver** : Votre ID utilisateur Twitch (disponible dans l'URL de votre profil Twitch)
- **Exemple** : `123456789`
- **Note** : Utilisé uniquement pour vérifier les abonnements Twitch dans la page Live

## 📝 Instructions pour Vercel

1. **Aller dans Vercel Dashboard** :
   - Ouvrir votre projet
   - Aller dans **Settings** → **Environment Variables**

2. **Pour chaque variable** :
   - Cliquer sur **"Add New"**
   - Entrer le **nom** de la variable (ex: `GOOGLE_CLIENT_ID`)
   - Entrer la **valeur** depuis votre `.env.local`
   - Pour les secrets (`*_SECRET`), ✅ **COCHER "Encrypt"**
   - Pour les IDs publics, ❌ **NE PAS COCHER "Encrypt"**
   - Sélectionner les environnements : **Production**, **Preview**, **Development**
   - Cliquer sur **"Save"**

3. **Vérifier les Redirect URLs** :

   **Google** :
   - Dans Google Cloud Console → OAuth 2.0 Client IDs → Votre client
   - Ajouter dans "Authorized redirect URIs" :
     - `https://votre-domaine.vercel.app/api/auth/callback/google`
     - `https://votre-domaine.com/api/auth/callback/google` (si vous avez un domaine custom)

   **Twitch** :
   - Dans Twitch Developers → Votre application → OAuth Redirect URLs
   - Ajouter :
     - `https://votre-domaine.vercel.app/api/auth/callback/twitch`
     - `https://votre-domaine.com/api/auth/callback/twitch` (si vous avez un domaine custom)

## ✅ Checklist

- [ ] `GOOGLE_CLIENT_ID` ajouté (non encrypté)
- [ ] `GOOGLE_CLIENT_SECRET` ajouté (encrypté)
- [ ] `TWITCH_CLIENT_ID` ajouté (non encrypté)
- [ ] `TWITCH_CLIENT_SECRET` ajouté (encrypté)
- [ ] `TWITCH_BROADCASTER_ID` ajouté (optionnel, non encrypté)
- [ ] Redirect URLs configurées dans Google Cloud Console
- [ ] Redirect URLs configurées dans Twitch Developers Console
- [ ] Redéploiement effectué après ajout des variables

## 🔄 Après configuration

1. **Redéployer l'application** :
   - Les variables d'environnement sont prises en compte au prochain déploiement
   - Ou déclencher un redéploiement manuel depuis Vercel

2. **Tester** :
   - Aller sur votre site en production
   - Cliquer sur "Se connecter"
   - Vérifier que les boutons "Continuer avec Google" et "Continuer avec Twitch" apparaissent
   - Tester la connexion avec chaque provider

## ⚠️ Notes importantes

- **Ne jamais commit les secrets** dans le code
- Les variables encryptées dans Vercel sont sécurisées
- Les Redirect URLs doivent correspondre exactement à votre domaine Vercel
- Si vous changez de domaine, mettre à jour les Redirect URLs dans Google/Twitch
