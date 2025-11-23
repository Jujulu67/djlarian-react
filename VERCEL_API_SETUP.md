# 🔧 Configuration de l'API Vercel

Ce guide explique comment configurer l'API Vercel. **Note importante** : L'API REST Vercel ne fournit pas d'endpoints pour Analytics et Speed Insights (ces stats sont uniquement disponibles via le dashboard web). Cependant, le token Vercel peut être utile pour d'autres fonctionnalités.

## 📋 Prérequis

- Un compte Vercel
- Un projet déployé sur Vercel
- Accès administrateur au projet

## 🔑 Étape 1 : Créer un Token d'Accès Vercel

1. **Aller dans Vercel Dashboard** :

   - https://vercel.com/account/tokens
   - Ou : Vercel Dashboard → Settings → Tokens

2. **Créer un nouveau token** :

   - Cliquer sur **"Create Token"**
   - **Nom** : `DJLarian API Token` (ou un nom de votre choix)
   - **Scope** : Sélectionner **"Full Account"** (ou au minimum les permissions pour lire les analytics)
   - **Expiration** : Choisir une durée (recommandé : 1 an ou "No expiration")
   - Cliquer sur **"Create Token"**

3. **Copier le token** :
   - ⚠️ **IMPORTANT** : Le token ne sera affiché qu'une seule fois
   - Copier immédiatement le token généré
   - **Exemple** : `votre_token_vercel_ici`

## 📍 Étape 1.5 : Trouver le Team Slug et Project Name

Ces informations sont visibles dans l'URL de votre dashboard Vercel Analytics :

**Exemple d'URL** : `https://vercel.com/larians-projects-a2dc5026/djlarian-react/analytics?environment=all`

Dans cette URL :

- **Team Slug** : `larians-projects-a2dc5026` (la première partie après `/vercel.com/`)
- **Project Name** : `djlarian-react` (la deuxième partie)

**Comment trouver** :

1. Aller dans votre projet Vercel
2. Cliquer sur **Analytics** ou **Speed Insights**
3. Regarder l'URL dans la barre d'adresse
4. Extraire le team slug et le project name

## 🔐 Étape 2 : Configurer les Variables d'Environnement

### Dans Vercel Dashboard

1. **Aller dans votre projet** :

   - Vercel Dashboard → Votre projet → **Settings** → **Environment Variables**

2. **Ajouter les variables suivantes** :

   #### `VERCEL_TOKEN` (🔒 Secret - à encrypter)

   - **Nom** : `VERCEL_TOKEN`
   - **Valeur** : Le token que vous venez de créer
   - ✅ **Cocher "Encrypt"** (très important !)
   - **Environnements** : Production (et Preview si nécessaire)
   - **Save**

   #### `VERCEL_PROJECT_NAME` (Recommandé)

   - **Nom** : `VERCEL_PROJECT_NAME`
   - **Valeur** : `djlarian-react` (le nom de votre projet)
   - **Comment trouver** : C'est le nom de votre projet dans Vercel, visible dans l'URL du dashboard
   - ❌ Ne PAS cocher "Encrypt" (peut être public)
   - **Environnements** : Production (et Preview si nécessaire)
   - **Save**

   #### `VERCEL_TEAM_SLUG` (Recommandé si vous êtes dans une équipe)

   - **Nom** : `VERCEL_TEAM_SLUG`
   - **Valeur** : `larians-projects-a2dc5026` (le slug de votre équipe)
   - **Comment trouver** : Visible dans l'URL du dashboard Vercel (ex: `https://vercel.com/larians-projects-a2dc5026/djlarian-react/analytics`)
   - ❌ Ne PAS cocher "Encrypt" (peut être public)
   - **Environnements** : Production (et Preview si nécessaire)
   - **Save**

   #### `VERCEL_PROJECT_ID` (Optionnel, pour compatibilité)

   - **Nom** : `VERCEL_PROJECT_ID`
   - **Valeur** : L'ID de votre projet Vercel (si vous l'avez)
   - **Comment trouver** : Vercel Dashboard → Votre projet → Settings → General → Project ID
   - ❌ Ne PAS cocher "Encrypt" (peut être public)
   - **Environnements** : Production (et Preview si nécessaire)
   - **Save**

   #### `VERCEL_TEAM_ID` (Optionnel, pour compatibilité)

   - **Nom** : `VERCEL_TEAM_ID`
   - **Valeur** : L'ID de votre équipe Vercel (si vous l'avez)
   - **Comment trouver** : Vercel Dashboard → Settings → Team → Team ID (dans l'URL ou les paramètres)
   - ❌ Ne PAS cocher "Encrypt" (peut être public)
   - **Environnements** : Production (et Preview si nécessaire)
   - **Save**

### Dans `.env.local` (pour le développement local)

```env
# Token Vercel pour l'API (optionnel en local)
VERCEL_TOKEN=votre_token_vercel_ici

# Nom du projet Vercel (recommandé)
VERCEL_PROJECT_NAME=djlarian-react

# Slug de l'équipe Vercel (recommandé si vous êtes dans une équipe)
VERCEL_TEAM_SLUG=votre_team_slug_ici

# ID du projet Vercel (optionnel, pour compatibilité)
VERCEL_PROJECT_ID=your_project_id_here

# ID de l'équipe Vercel (optionnel, pour compatibilité)
VERCEL_TEAM_ID=your_team_id_here
```

## ✅ Étape 3 : Vérifier la Configuration

1. **Redéployer le projet** sur Vercel (ou attendre le prochain déploiement)

2. **Tester dans le dashboard admin** :
   - Aller dans `/admin/configuration`
   - Onglet "API & Integrations"
   - Les composants **Vercel Web Analytics** et **Vercel Speed Insights** devraient maintenant afficher :
     - ✅ Des stats réelles (visiteurs, pages vues, Core Web Vitals)
     - ✅ Un bouton de rafraîchissement fonctionnel
     - ✅ Des liens directs vers les dashboards Vercel

## 📊 Ce qui sera affiché

### Vercel Web Analytics

- **Visiteurs** (7 derniers jours)
- **Pages vues** (7 derniers jours)
- **Événements** (7 derniers jours)
- **Limite gratuite** : 5,000 événements/mois

### Vercel Speed Insights

- **LCP** (Largest Contentful Paint)
- **FID** (First Input Delay)
- **CLS** (Cumulative Layout Shift)
- **TTFB** (Time to First Byte)
- **INP** (Interaction to Next Paint)

## ⚠️ Notes Importantes

1. **Analytics et Speed Insights** :

   - ⚠️ **L'API REST Vercel ne fournit PAS d'endpoints pour Analytics et Speed Insights**
   - Ces stats sont uniquement disponibles via le dashboard web Vercel
   - Les composants affichent des liens directs vers les dashboards Vercel
   - Le token n'est **pas nécessaire** pour afficher les liens vers les dashboards

2. **Utilité du Token Vercel** :

   - Le token peut être utile pour d'autres fonctionnalités via l'API REST :
     - ✅ Gérer les déploiements (lister, créer, annuler)
     - ✅ Gérer les domaines
     - ✅ Lister les projets
     - ✅ Gérer les variables d'environnement
     - ✅ Accéder aux logs de déploiement
     - ✅ Utiliser l'API Query (nécessite Observability Plus - plan Pro/Enterprise)
   - **Recommandation** : Gardez le token si vous prévoyez d'utiliser l'API Vercel pour d'autres fonctionnalités, sinon vous pouvez le supprimer

3. **Sécurité** :

   - Le `VERCEL_TOKEN` est un secret sensible
   - Ne JAMAIS le commiter dans Git
   - Toujours cocher "Encrypt" dans Vercel

4. **Limites de l'API** :
   - L'API Vercel peut avoir des limites de taux (rate limits)
   - Certaines fonctionnalités peuvent nécessiter un plan Pro/Enterprise
   - Consulter la documentation : https://vercel.com/docs/rest-api

## 🔗 Ressources

- [Documentation API Vercel](https://vercel.com/docs/rest-api)
- [Créer un Token Vercel](https://vercel.com/account/tokens)
- [Vercel Analytics API](https://vercel.com/docs/analytics)
- [Vercel Speed Insights](https://vercel.com/docs/speed-insights)
