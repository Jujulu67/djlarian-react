# 🚀 Configuration Sentry - Guide Rapide

## ✅ Configuration Complète

### 1. DSN Sentry (Déjà configuré dans le code)

**⚠️ IMPORTANT : Le DSN contient une clé publique mais reste sensible. Ne pas le commiter dans Git !**

**Variable à ajouter :**

**Dans Vercel :**

1. Vercel Dashboard → Votre projet → **Settings** → **Environment Variables**
2. Cliquer sur **"Add variable"**
3. **Nom** : `NEXT_PUBLIC_SENTRY_DSN`
4. **Valeur** : Votre DSN Sentry (voir `.secrets.local.md` pour la valeur)
5. **⚠️ Ne PAS cocher "Encrypt"** (variable publique, mais sensible)
6. Sélectionner les environnements (Production, Preview, etc.)
7. **Save**

**En local (`.env.local`) :**

```env
NEXT_PUBLIC_SENTRY_DSN=https://xxxxx@xxxxx.ingest.sentry.io/xxxxx
```

**💡 Note :** Le DSN fonctionne en **local ET sur Vercel**. Ajoutez-le dans `.env.local` pour tester en développement.

**✅ Une fois configuré :**

- Les erreurs client-side React seront automatiquement capturées
- Les erreurs serveur (API routes) seront capturées
- Session replay sera disponible (1 session/mois en gratuit)

---

### 2. Vercel Log Drains (OpenTelemetry)

**⚠️ IMPORTANT : L'endpoint contient des identifiants sensibles. Ne pas le commiter !**

**⚠️ FONCTIONNE UNIQUEMENT SUR VERCEL** - Pas en local

**Étapes :**

1. Vercel Dashboard → Votre projet → **Settings** → **Log Drains**
2. Cliquer sur **"Create Log Drain"**
3. **Type** : Sélectionner **"OpenTelemetry"** ou **"HTTP Endpoint"**
4. **Endpoint URL** : Votre endpoint Sentry OTLP (voir `.secrets.local.md` pour la valeur)
5. **Sources** : Cocher :
   - ✅ Functions
   - ✅ Builds
   - ✅ Edge Functions
6. **Save**

**💡 Note :** Vercel Log Drains fonctionne **UNIQUEMENT sur Vercel**, pas en local. C'est normal, les logs locaux ne passent pas par Vercel.

**✅ Une fois configuré :**

- Les traces de performance des fonctions Vercel seront envoyées à Sentry
- Les logs serveur seront automatiquement capturés
- Pas besoin de modifier le code

---

### 3. Token d'authentification Sentry (Optionnel - pour les stats dans le dashboard admin)

**⚠️ IMPORTANT : Le token est SECRET. Ne JAMAIS le commiter dans Git !**

**Pourquoi ?** Ce token permet au dashboard admin (`/admin/configuration`) d'afficher le nombre d'erreurs non résolues directement dans l'interface, sans avoir à ouvrir le dashboard Sentry.

**🔑 IMPORTANT : Utiliser un Organization Auth Token (via Custom Integration)**

Pour accéder aux endpoints au niveau de l'organisation, vous devez créer une **Custom Integration interne** (Organization Auth Token) plutôt qu'un Personal Access Token. Les tokens d'organisation ont un accès plus large et sont conçus pour les intégrations internes.

**⚠️ IMPORTANT : Ne PAS utiliser "Organization Tokens" (scopes limités)**

Les "Organization Tokens" n'ont que des scopes limités (comme `org:ci`). Pour accéder aux endpoints API, vous devez créer une **Custom Integration interne** (Internal Integration).

**Étapes pour créer une Custom Integration interne :**

1. **Sentry Dashboard** → **Settings** → **Organization Settings** → **Developer Settings** → **Custom Integrations**
   - Ou directement : `https://sentry.io/settings/[votre-org]/developer-settings/`
   - ⚠️ **Ne PAS aller dans "Organization Tokens"** (c'est différent)
2. Cliquer sur **"Create New Integration"**
3. Sélectionner **"Internal Integration"** et cliquer sur **"Next"**
4. **Name** : `djlarian-react-admin-dashboard` (ou un nom de votre choix)
5. **Description** (optionnel) : `Token pour le dashboard admin de djlarian-react`
6. **Permissions** : Cocher les scopes suivants :
   - ✅ `org:read` (pour lire les issues au niveau de l'organisation)
   - ✅ `event:read` (pour lire les événements/erreurs)
   - ✅ `project:read` (pour lire les informations du projet)
7. Cliquer sur **"Save Changes"**
8. **⚠️ IMPORTANT : Faire défiler jusqu'à la section "Tokens"** en bas de la page
9. Cliquer sur **"Create Token"** dans la section Tokens
10. **⚠️ IMPORTANT : Copier le token immédiatement** (il ne sera plus visible après)
    - ⚠️ **Ne PAS utiliser le "Client Secret"** - c'est différent !
    - Le token d'authentification commence généralement par `sntryu_` ou est une longue chaîne hexadécimale
    - C'est ce token que vous devez utiliser dans `SENTRY_AUTH_TOKEN`
11. Ajouter le token dans Vercel et `.env.local` :

**Dans Vercel :**

1. Vercel Dashboard → Votre projet → **Settings** → **Environment Variables**
2. Cliquer sur **"Add variable"**
3. **Nom** : `SENTRY_AUTH_TOKEN`
4. **Valeur** : Le token que vous venez de créer
5. **✅ COCHER "Encrypt"** (token secret)
6. Sélectionner les environnements (Production, Preview, etc.)
7. **Save**

**En local (`.env.local`) :**

```env
SENTRY_AUTH_TOKEN=sntryu_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**Variables d'environnement optionnelles (pour améliorer la précision) :**

Si vous voulez être plus précis sur l'organisation et le projet (au lieu d'extraire depuis le DSN) :

**Dans Vercel :**

- `SENTRY_ORG` : Le slug de votre organisation (ex: `larian`)
- `SENTRY_PROJECT` : Le slug de votre projet (ex: `javascript-nextjs`)

**En local (`.env.local`) :**

```env
SENTRY_ORG=larian
SENTRY_PROJECT=javascript-nextjs
```

**💡 Note :** Si vous ne configurez pas ces variables, le code extraira automatiquement l'organisation et le projet depuis le DSN.

**Variable d'environnement optionnelle pour la région API :**

Si vous voulez forcer une région API spécifique (par défaut, la région est extraite du DSN) :

**Dans Vercel :**

- `SENTRY_API_REGION` : `de` (Allemagne), `eu` (Europe), ou `us` (USA)
  - ⚠️ **Important** : Votre organisation doit être hébergée sur cette région
  - Par défaut, utilisez la région du DSN (détectée automatiquement)

**En local (`.env.local`) :**

```env
# Optionnel : forcer une région API (par défaut, extraite du DSN)
# SENTRY_API_REGION=de
```

**💡 Note sur les régions :**

- **`de.sentry.io`** : Région européenne (Allemagne) - votre organisation actuelle
- **`eu.sentry.io`** : Nouvelle région européenne (nécessite migration de l'organisation)
- **`us.sentry.io`** : Région américaine

**⚠️ Important :** Ne changez `SENTRY_API_REGION` que si vous avez migré votre organisation vers une autre région. Sinon, laissez le code détecter automatiquement la région depuis le DSN.

**✅ Une fois configuré :**

- Le dashboard admin (`/admin/configuration`) affichera le nombre d'erreurs non résolues
- Vous verrez la dernière erreur capturée
- Un lien direct vers le dashboard Sentry sera disponible

**⚠️ Si l'API ne fonctionne pas :**

- ✅ **Vérifiez que vous utilisez un Organization Auth Token** (via Custom Integration) et non un Personal Access Token
- ✅ Vérifiez que le token a bien les permissions `org:read` et `event:read`
- ✅ Vérifiez que `SENTRY_ORG` et `SENTRY_PROJECT` sont corrects (ou laissez le code les extraire du DSN)
- ✅ Les erreurs sont toujours capturées via le DSN même si l'API REST ne fonctionne pas
- ✅ Vous pouvez toujours consulter les stats directement sur le dashboard Sentry

**💡 Différence entre Personal Access Token et Organization Auth Token :**

- **Personal Access Token** : Lié à votre compte utilisateur, peut avoir des limitations pour les endpoints au niveau de l'organisation
- **Organization Auth Token** (via Custom Integration) : Conçu pour les intégrations internes, accès plus large au niveau de l'organisation, **recommandé pour notre cas d'usage**

---

## 🎯 Ce que vous obtiendrez

### Avec DSN Sentry :

- ✅ Erreurs JavaScript (client + serveur)
- ✅ Stack traces complètes
- ✅ Contexte utilisateur (navigateur, OS, URL)
- ✅ Session replay (rejouer les sessions avec erreurs)
- ✅ Métriques de performance

### Avec Vercel Log Drains :

- ✅ Traces de performance des fonctions Vercel
- ✅ Logs serveur automatiques
- ✅ Logs de build et déploiement
- ✅ Erreurs non gérées par le SDK

---

## 🔍 Vérification

### 1. Vérifier que le DSN est configuré

Après avoir ajouté la variable dans Vercel :

1. Redéployer votre projet
2. Aller sur votre site
3. Dans Sentry Dashboard → Votre projet → **Issues**
4. Vous devriez voir les erreurs apparaître (si il y en a)

### 2. Vérifier que Vercel Drains fonctionne

1. Vercel Dashboard → Votre projet → **Log Drains**
2. Vérifier que le drain est **"Active"**
3. Dans Sentry → **Performance** → **Traces**
4. Vous devriez voir les traces des fonctions Vercel

---

## 📊 Dashboard Sentry

Une fois configuré, vous pourrez voir dans Sentry :

- **Issues** : Toutes les erreurs capturées
- **Performance** : Traces de performance (avec Vercel Drains)
- **Releases** : Versions de votre application
- **User Feedback** : Retours utilisateurs sur les erreurs

---

## 🆘 Dépannage

### Le DSN ne fonctionne pas ?

- ✅ Vérifier que `NEXT_PUBLIC_SENTRY_DSN` est bien configuré dans Vercel
- ✅ Vérifier que la variable n'est pas encryptée
- ✅ Redéployer le projet après avoir ajouté la variable
- ✅ Vérifier les logs Vercel pour voir si Sentry s'initialise

### Vercel Drains ne fonctionne pas ?

- ✅ Vérifier que l'endpoint est correct
- ✅ Vérifier que les sources sont cochées (Functions, Builds, etc.)
- ✅ Attendre quelques minutes pour que les traces apparaissent
- ✅ Vérifier dans Sentry → Performance → Traces

---

## 📝 Notes

- **Gratuit jusqu'à 5,000 erreurs/mois**
- **Session replay** : 1 session/mois en gratuit
- Les deux systèmes (DSN + Drains) fonctionnent ensemble pour une couverture complète
- Pas besoin de redémarrer l'application, les changements prennent effet au prochain déploiement

## 🔒 Sécurité

- **DSN Sentry** : Contient une clé publique mais reste sensible. Ne pas commiter dans Git.
- **Vercel Drains Endpoint** : Contient des identifiants. Ne pas commiter dans Git.
- **Où stocker les valeurs** : Utiliser `.secrets.local.md` (déjà dans `.gitignore`) ou `.env.local`

## 🏠 Local vs Production

### DSN Sentry :

- ✅ **Fonctionne en local** : Ajoutez `NEXT_PUBLIC_SENTRY_DSN` dans `.env.local`
- ✅ **Fonctionne sur Vercel** : Configurez dans Vercel Environment Variables
- Capture les erreurs partout où le code s'exécute

### Vercel Log Drains :

- ❌ **Ne fonctionne PAS en local** : Uniquement sur Vercel
- ✅ **Fonctionne sur Vercel** : Configurez dans Vercel Dashboard → Log Drains
- Capture uniquement les logs/traces des fonctions Vercel
