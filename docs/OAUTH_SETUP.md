# 🔐 Configuration OAuth Google et Twitch

Guide complet pour configurer l'authentification OAuth avec Google et Twitch.

## 📋 Vue d'ensemble

L'application supporte l'authentification OAuth via :

- **Google** : Connexion avec compte Google
- **Twitch** : Connexion avec compte Twitch

**Les deux sont 100% gratuits** pour l'authentification utilisateur standard.

## ✅ Avantages OAuth

- ✅ **Gratuit** pour l'authentification standard
- ✅ **Création automatique de compte** : Le compte est créé automatiquement lors de la première connexion
- ✅ **Pas de mot de passe à gérer** : L'utilisateur utilise son compte Google/Twitch existant
- ✅ **Sécurisé** : Géré par Google/Twitch, pas besoin de stocker de mots de passe
- ✅ **Expérience utilisateur améliorée** : Connexion en un clic

## 🔧 Configuration Google OAuth

### Étape 1 : Utiliser un projet Google Cloud existant ou en créer un nouveau

**✅ Vous avez déjà un projet Google Cloud (ex: "Larian Search" pour Custom Search API) ?**

Parfait ! Vous pouvez utiliser le **même projet** pour OAuth. C'est même recommandé pour centraliser la configuration.

1. Aller sur https://console.cloud.google.com/
2. **Sélectionner le projet existant** (ex: "Larian Search")
3. Si vous n'avez pas encore de projet, créer un nouveau projet :
   - Cliquer sur "Sélectionner un projet" → "Nouveau projet"
   - Donner un nom (ex: "Larian" ou "Larian Search")
   - Cliquer sur "Créer"

**💡 Note** : Un même projet Google Cloud peut avoir plusieurs identifiants :

- Une **clé API** pour Custom Search API (SoundCloud parsing)
- Un **Client ID/Secret OAuth 2.0** pour l'authentification utilisateur
- Les deux coexistent sans problème dans le même projet

### Étape 2 : Configurer l'écran de consentement OAuth

**⚠️ Si vous utilisez un projet existant** : Vérifiez d'abord si l'écran de consentement OAuth est déjà configuré. Si oui, vous pouvez passer à l'étape 3.

1. Dans le menu, aller dans **"APIs & Services"** → **"OAuth consent screen"**
2. Si c'est la première fois, choisir **"Externe"** (ou "Interne" si vous avez Google Workspace)
3. Remplir les informations :
   - **Nom de l'application** : Larian (ou votre choix)
   - **Email de support utilisateur** : votre email
   - **Email du développeur** : votre email
4. Cliquer sur **"Enregistrer et continuer"**
5. **Scopes** : Les scopes `email`, `profile`, `openid` sont déjà ajoutés par défaut
6. Cliquer sur **"Enregistrer et continuer"**
7. **Utilisateurs de test** (si en mode test) : Ajouter votre email pour tester
8. Cliquer sur **"Retour au tableau de dashboard"**

### Étape 3 : Créer des identifiants OAuth 2.0

**💡 Important** : Vous pouvez avoir plusieurs identifiants dans le même projet. Celui-ci sera spécifiquement pour OAuth (authentification utilisateur), différent de votre clé API Custom Search.

1. Aller dans **"APIs & Services"** → **"Identifiants"**
2. Cliquer sur **"Créer des identifiants"** → **"ID client OAuth 2.0"**
3. **Type d'application** : Application Web
4. **Nom** : Larian Web Client (ou `Larian OAuth` pour différencier de votre clé API)
5. **URI de redirection autorisées** :
   - Pour le développement local : `http://localhost:3000/api/auth/callback/google`
   - Pour la production : `https://votre-domaine.com/api/auth/callback/google`
   - Pour Vercel : `https://votre-projet.vercel.app/api/auth/callback/google`
   - **⚠️ Important** : Ajoutez les URIs une par ligne, séparément
6. Cliquer sur **"Créer"**
7. **⚠️ IMPORTANT** : Copier immédiatement le **Client ID** et le **Client Secret**

**📝 Note** :

- Votre `GOOGLE_SEARCH_API_KEY` (clé API) reste inchangée et continue de fonctionner pour SoundCloud
- Ce nouveau Client ID/Secret est uniquement pour OAuth (connexion utilisateur)
- Les deux peuvent coexister dans le même projet sans problème
- Le Client ID OAuth est différent de votre clé API Custom Search

### Étape 4 : Configurer les variables d'environnement

**Dans `.env.local` (développement local)** :

```env
GOOGLE_CLIENT_ID=votre_client_id_google
GOOGLE_CLIENT_SECRET=votre_client_secret_google
```

**Dans Vercel (production)** :

1. Aller dans **Vercel Dashboard** → Votre projet → **Settings** → **Environment Variables**
2. Ajouter `GOOGLE_CLIENT_ID` :
   - **Nom** : `GOOGLE_CLIENT_ID`
   - **Valeur** : Votre Client ID Google
   - **Encrypt** : ❌ Ne PAS cocher (public)
   - **Environnements** : Production, Preview, Development
3. Ajouter `GOOGLE_CLIENT_SECRET` :
   - **Nom** : `GOOGLE_CLIENT_SECRET`
   - **Valeur** : Votre Client Secret Google
   - **Encrypt** : ✅ **COCHER** (secret)
   - **Environnements** : Production, Preview, Development

### Étape 5 : Redémarrer le serveur

```bash
# Arrêter le serveur (Ctrl+C)
# Redémarrer
pnpm run dev
```

Le bouton **"Continuer avec Google"** devrait maintenant apparaître dans le modal de connexion.

---

## 🎮 Configuration Twitch OAuth

### Étape 1 : Créer un compte développeur Twitch

1. Aller sur https://dev.twitch.tv/
2. Se connecter avec votre compte Twitch
3. Accepter les conditions d'utilisation des développeurs

### Étape 2 : Créer une nouvelle application

1. Aller sur https://dev.twitch.tv/console/apps
2. Cliquer sur **"Register Your Application"**
3. Remplir les informations :
   - **Name** : Larian (ou votre choix)
   - **OAuth Redirect URLs** :
     - Pour le développement local : `http://localhost:3000/api/auth/callback/twitch`
     - Pour la production : `https://votre-domaine.com/api/auth/callback/twitch`
     - Pour Vercel : `https://votre-projet.vercel.app/api/auth/callback/twitch`
   - **Category** : Website Integration (ou votre choix)
4. Cliquer sur **"Create"**
5. **⚠️ IMPORTANT** : Copier immédiatement le **Client ID**
6. Cliquer sur **"Manage"** → **"New Secret"** pour générer le **Client Secret**
7. **⚠️ IMPORTANT** : Copier immédiatement le **Client Secret** (il ne sera plus visible après)

### Étape 3 : Configurer les variables d'environnement

**Dans `.env.local` (développement local)** :

```env
TWITCH_CLIENT_ID=votre_client_id_twitch
TWITCH_CLIENT_SECRET=votre_client_secret_twitch
```

**Dans Vercel (production)** :

1. Aller dans **Vercel Dashboard** → Votre projet → **Settings** → **Environment Variables**
2. Ajouter `TWITCH_CLIENT_ID` :
   - **Nom** : `TWITCH_CLIENT_ID`
   - **Valeur** : Votre Client ID Twitch
   - **Encrypt** : ❌ Ne PAS cocher (public)
   - **Environnements** : Production, Preview, Development
3. Ajouter `TWITCH_CLIENT_SECRET` :
   - **Nom** : `TWITCH_CLIENT_SECRET`
   - **Valeur** : Votre Client Secret Twitch
   - **Encrypt** : ✅ **COCHER** (secret)
   - **Environnements** : Production, Preview, Development

### Étape 4 : Redémarrer le serveur

```bash
# Arrêter le serveur (Ctrl+C)
# Redémarrer
pnpm run dev
```

Le bouton **"Continuer avec Twitch"** devrait maintenant apparaître dans le modal de connexion.

---

## 🧪 Tester la connexion OAuth

### Test Google

1. Ouvrir http://localhost:3000
2. Cliquer sur **"Connexion"**
3. Cliquer sur **"Continuer avec Google"**
4. Vous devriez être redirigé vers Google pour vous connecter
5. Après connexion, vous serez redirigé vers l'application
6. Votre compte sera créé automatiquement dans la base de données

### Test Twitch

1. Ouvrir http://localhost:3000
2. Cliquer sur **"Connexion"**
3. Cliquer sur **"Continuer avec Twitch"**
4. Vous devriez être redirigé vers Twitch pour autoriser l'application
5. Après autorisation, vous serez redirigé vers l'application
6. Votre compte sera créé automatiquement dans la base de données

---

## 🔍 Vérification

### Vérifier que les providers sont disponibles

L'application vérifie automatiquement si les providers sont configurés. Si les credentials ne sont pas configurés :

- Les boutons OAuth ne s'afficheront pas dans le modal de connexion
- Un message informatif s'affichera expliquant comment configurer OAuth

### Vérifier via l'API

Vous pouvez aussi vérifier manuellement :

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

**Cause** : Les credentials ne sont pas configurés ou incorrects.

**Solution** :

1. Vérifier que les variables d'environnement sont bien définies dans `.env.local`
2. Redémarrer le serveur de développement
3. Vérifier que les variables sont bien nommées (sans fautes de frappe)
4. Vérifier via `/api/auth/providers` si les providers sont détectés

### Erreur "redirect_uri_mismatch"

**Cause** : L'URI de redirection dans Google/Twitch ne correspond pas à celle utilisée par l'application.

**Solution** :

1. Vérifier que l'URI de redirection dans Google Cloud Console est exactement :
   - `http://localhost:3000/api/auth/callback/google` (pour le dev)
   - `https://votre-domaine.com/api/auth/callback/google` (pour la prod)
2. Vérifier que l'URI dans Twitch Developers est exactement :
   - `http://localhost:3000/api/auth/callback/twitch` (pour le dev)
   - `https://votre-domaine.com/api/auth/callback/twitch` (pour la prod)
3. Les URIs doivent correspondre **exactement** (pas d'espace, pas de slash final)

### Erreur "Configuration" lors de la connexion

**Cause** : `NEXTAUTH_URL` n'est pas configuré ou incorrect.

**Solution** :

1. Vérifier que `NEXTAUTH_URL` est défini dans `.env.local` :
   ```env
   NEXTAUTH_URL=http://localhost:3000
   ```
2. Pour la production, utiliser l'URL complète :
   ```env
   NEXTAUTH_URL=https://votre-domaine.com
   ```

### Le compte n'est pas créé automatiquement

**Cause** : Problème avec PrismaAdapter ou la base de données.

**Solution** :

1. Vérifier que la base de données est accessible
2. Vérifier que les migrations Prisma sont appliquées :
   ```bash
   pnpm prisma migrate deploy
   ```
3. Vérifier les logs du serveur pour voir les erreurs

---

## 📚 Documentation supplémentaire

- **Guide complet des secrets** : `SECRETS_MANAGEMENT.md`
- **Quick Start** : `QUICK_START.md`
- **Documentation NextAuth** : https://next-auth.js.org/

---

## ✅ Checklist de configuration

- [ ] Projet Google Cloud créé
- [ ] Écran de consentement OAuth configuré
- [ ] Identifiants OAuth 2.0 créés (Google)
- [ ] Application Twitch créée
- [ ] Client ID et Secret copiés (Google et Twitch)
- [ ] URIs de redirection configurées correctement
- [ ] Variables d'environnement configurées dans `.env.local`
- [ ] Variables d'environnement configurées dans Vercel (production)
- [ ] Serveur redémarré
- [ ] Boutons OAuth visibles dans le modal de connexion
- [ ] Test de connexion Google réussi
- [ ] Test de connexion Twitch réussi
- [ ] Compte créé automatiquement dans la base de données

---

**Les deux providers OAuth sont 100% gratuits pour l'authentification standard !** 🎉
