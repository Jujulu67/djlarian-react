# ✅ Checklist de Déploiement Cloudflare Pages + Neon

Utilisez cette checklist pour suivre votre progression.

---

## 📋 Phase 1 : Neon (Base de Données)

### Étape 1.1 : Créer un Compte Neon
- [ ] Aller sur https://neon.tech
- [ ] Cliquer sur "Sign Up"
- [ ] S'inscrire (GitHub recommandé)
- [ ] Confirmer l'email si nécessaire

### Étape 1.2 : Créer un Projet
- [ ] Cliquer sur "Create a project"
- [ ] **Project name** : `djlarian`
- [ ] **Region** : Europe (Frankfurt) ou la plus proche
- [ ] **PostgreSQL version** : **`17`** (recommandé - disponible et stable) ou `16`/`15` en alternative
- [ ] Cliquer sur "Create project"

### Étape 1.3 : Obtenir la Connection String
- [ ] Copier la connection string complète
- [ ] Format : `postgresql://user:password@host/database?sslmode=require`
- [ ] **SAUVEGARDER** cette valeur (vous en aurez besoin)

### Étape 1.4 : Appliquer les Migrations
- [ ] Mettre à jour `.env.local` avec `DATABASE_URL`
- [ ] Exécuter : `./scripts/migrate-to-neon.sh`
- [ ] OU manuellement : `npx prisma migrate deploy`

### Étape 1.5 : Importer les Données (Optionnel)
- [ ] Aller dans Neon Dashboard → SQL Editor
- [ ] Copier-coller le contenu de `backup.sql`
- [ ] Exécuter

**✅ Phase 1 terminée quand :**
- [ ] Projet Neon créé
- [ ] Connection string obtenue
- [ ] Migrations appliquées
- [ ] (Optionnel) Données importées

---

## 📦 Phase 2 : Cloudflare R2 (Uploads)

### Étape 2.1 : Créer un Compte Cloudflare
- [ ] Aller sur https://dash.cloudflare.com/sign-up
- [ ] Créer un compte (gratuit)
- [ ] Vérifier l'email si nécessaire

### Étape 2.2 : Créer un Bucket R2
- [ ] Dashboard → **R2** (menu de gauche)
- [ ] Cliquer sur **"Create bucket"**
- [ ] **Bucket name** : `djlarian-uploads`
- [ ] **Location** : Choisir la région la plus proche
- [ ] Cliquer sur **"Create bucket"**

### Étape 2.3 : Créer des API Tokens
- [ ] R2 → **"Manage R2 API Tokens"**
- [ ] Cliquer sur **"Create API token"**
- [ ] **Token name** : `djlarian-upload-token`
- [ ] **Permissions** : **Object Read & Write**
- [ ] Cliquer sur **"Create API Token"**
- [ ] **SAUVEGARDER** :
  - [ ] Access Key ID
  - [ ] Secret Access Key
  - [ ] Account ID (visible dans Overview ou URL)

### Étape 2.4 : Configurer un Custom Domain (Optionnel)
- [ ] Bucket → Settings → Public access
- [ ] Cliquer sur "Connect Domain"
- [ ] Suivre les instructions DNS
- [ ] **SAUVEGARDER** l'URL publique

**✅ Phase 2 terminée quand :**
- [ ] Compte Cloudflare créé
- [ ] Bucket R2 créé
- [ ] API tokens créés et sauvegardés
- [ ] (Optionnel) Custom domain configuré

---

## 🚀 Phase 3 : Cloudflare Pages (Déploiement)

### Étape 3.1 : Préparer le Repository
- [ ] Vérifier que le code est sur GitHub
- [ ] Vérifier que tout est commité : `git status`
- [ ] Si nécessaire : `git add . && git commit -m "Prepare for deployment" && git push`

### Étape 3.2 : Connecter le Repository
- [ ] Dashboard → **Pages** (menu de gauche)
- [ ] Cliquer sur **"Create a project"**
- [ ] Cliquer sur **"Connect to Git"**
- [ ] Autoriser Cloudflare à accéder à GitHub
- [ ] Sélectionner le repository `djlarian-react`
- [ ] Cliquer sur **"Begin setup"**

### Étape 3.3 : Configurer le Build
- [ ] **Project name** : `djlarian` (ou votre choix)
- [ ] **Production branch** : `main`
- [ ] **Framework preset** : `Next.js`
- [ ] **Build command** : `npm run build`
- [ ] **Build output directory** : `.next`
- [ ] **Root directory** : `/` (laisser vide)

### Étape 3.4 : Générer NEXTAUTH_SECRET
- [ ] Exécuter : `./scripts/generate-nextauth-secret.sh`
- [ ] OU : `openssl rand -base64 32`
- [ ] **SAUVEGARDER** la valeur générée

### Étape 3.5 : Configurer les Variables d'Environnement
Dans **Settings → Environment Variables**, ajouter :

#### Variables Obligatoires
- [ ] `DATABASE_URL` = Connection string Neon (Secret)
- [ ] `NEXTAUTH_URL` = `https://votre-projet.pages.dev`
- [ ] `NEXTAUTH_SECRET` = Valeur générée (Secret)
- [ ] `CLOUDFLARE_ACCOUNT_ID` = Account ID Cloudflare
- [ ] `R2_ACCESS_KEY_ID` = R2 Access Key (Secret)
- [ ] `R2_SECRET_ACCESS_KEY` = R2 Secret Key (Secret)
- [ ] `R2_BUCKET_NAME` = `djlarian-uploads`
- [ ] `NODE_ENV` = `production`

#### Variables Optionnelles (si utilisées)
- [ ] `GOOGLE_CLIENT_ID` = Votre Google Client ID
- [ ] `GOOGLE_CLIENT_SECRET` = Votre Google Secret (Secret)
- [ ] `TWITCH_CLIENT_ID` = Votre Twitch Client ID
- [ ] `TWITCH_CLIENT_SECRET` = Votre Twitch Secret (Secret)
- [ ] `R2_PUBLIC_URL` = URL publique R2 (si custom domain)
- [ ] `NEXT_PUBLIC_UMAMI_URL` = URL Umami (si utilisé)
- [ ] `NEXT_PUBLIC_UMAMI_WEBSITE_ID` = Website ID Umami (si utilisé)

### Étape 3.6 : Déployer
- [ ] Cliquer sur **"Save and Deploy"**
- [ ] Attendre la fin du build (2-5 minutes)
- [ ] Vérifier que le déploiement réussit

**✅ Phase 3 terminée quand :**
- [ ] Repository connecté
- [ ] Build configuré
- [ ] Variables d'environnement configurées
- [ ] Déploiement réussi

---

## 🧪 Phase 4 : Tests et Vérification

### Tests Fonctionnels
- [ ] Page d'accueil se charge : `https://votre-projet.pages.dev`
- [ ] Navigation fonctionne
- [ ] Authentification fonctionne (connexion/déconnexion)
- [ ] Panel admin accessible (si admin)
- [ ] Upload d'image fonctionne (depuis panel admin)
- [ ] Images s'affichent correctement
- [ ] API routes fonctionnent (`/api/music`, `/api/events`)
- [ ] Création d'événement fonctionne
- [ ] Création de track fonctionne

### Vérifications Techniques
- [ ] Base de données accessible (vérifier dans Neon Dashboard)
- [ ] Images uploadées dans R2 (vérifier dans Cloudflare R2)
- [ ] Logs de build sans erreurs (Cloudflare Pages → Deployments)
- [ ] Variables d'environnement correctes (Cloudflare Pages → Settings)

**✅ Phase 4 terminée quand :**
- [ ] Tous les tests fonctionnels passent
- [ ] Toutes les vérifications techniques sont OK

---

## 🎉 Déploiement Terminé !

Une fois toutes les cases cochées :
- ✅ Votre site est en ligne sur Cloudflare Pages
- ✅ Base de données sur Neon
- ✅ Uploads sur Cloudflare R2
- ✅ **Coût total : 0€/mois** (dans les limites du gratuit)

---

## 📝 Notes

- **Secrets** : Marquez comme "Encrypt" (Secret) dans Cloudflare Pages
- **NEXTAUTH_URL** : Mettez à jour après le premier déploiement avec votre vraie URL
- **Custom Domain** : Peut être configuré après le déploiement

---

## 🆘 En Cas de Problème

Consultez la section "Dépannage" dans `DEPLOYMENT_STEP_BY_STEP.md`

