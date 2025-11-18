# 🚀 Guide Pas à Pas : Déploiement Cloudflare Pages + Neon

## ✅ Checklist de Déploiement

### Phase 1 : Configuration Neon (Base de Données)
- [ ] Créer un compte Neon
- [ ] Créer un projet
- [ ] Obtenir la connection string
- [ ] Migrer le schéma Prisma
- [ ] Importer les données (optionnel)

### Phase 2 : Configuration Cloudflare R2 (Uploads)
- [ ] Créer un compte Cloudflare
- [ ] Créer un bucket R2
- [ ] Créer des API tokens
- [ ] Configurer un custom domain (optionnel)

### Phase 3 : Configuration Cloudflare Pages
- [ ] Connecter le repository GitHub
- [ ] Configurer les variables d'environnement
- [ ] Configurer les secrets
- [ ] Déployer

### Phase 4 : Tests et Vérification
- [ ] Tester l'application
- [ ] Tester l'authentification
- [ ] Tester les uploads
- [ ] Vérifier les API routes

---

## 📋 Phase 1 : Configuration Neon

### Étape 1.1 : Créer un Compte Neon

1. Aller sur https://neon.tech
2. Cliquer sur **"Sign Up"** ou **"Get Started"**
3. S'inscrire avec GitHub, Google, ou email
4. Confirmer votre email si nécessaire

### Étape 1.2 : Créer un Projet

1. Une fois connecté, cliquer sur **"Create a project"**
2. Remplir les informations :
   - **Project name** : `djlarian` (ou votre choix)
   - **Region** : Choisir la région la plus proche (ex: `Europe (Frankfurt)`)
   - **PostgreSQL version** : **`17`** (recommandé - disponible et stable sur Neon) ou `16`/`15` en alternative
3. Cliquer sur **"Create project"**

### Étape 1.3 : Obtenir la Connection String

1. Une fois le projet créé, vous verrez un écran avec la connection string
2. **IMPORTANT** : Copier la connection string complète
   - Format : `postgresql://user:password@host/database?sslmode=require`
   - Elle ressemble à : `postgresql://neondb_owner:xxxxx@ep-xxxxx.eu-central-1.aws.neon.tech/neondb?sslmode=require`
3. **Sauvegarder cette connection string** (vous en aurez besoin plus tard)

### Étape 1.4 : Mettre à Jour le Fichier .env

Créer ou mettre à jour `.env.local` (ou `.env.production`) :

```env
DATABASE_URL="postgresql://user:password@host/database?sslmode=require"
```

**Remplacez** la connection string par celle de Neon.

### Étape 1.5 : Appliquer les Migrations Prisma

```bash
# Installer les dépendances si pas déjà fait
npm install

# Appliquer les migrations sur Neon
npx prisma migrate deploy

# Générer le client Prisma
npx prisma generate
```

### Étape 1.6 : Importer les Données (Optionnel)

Si vous avez des données dans votre backup.sql :

```bash
# Installer psql si pas déjà fait (ou utiliser l'interface Neon)
# Extraire les credentials de la connection string Neon

# Exemple avec psql
psql "postgresql://user:password@host/database?sslmode=require" < backup.sql
```

**OU** utiliser l'interface Neon :
1. Aller dans **Neon Dashboard → SQL Editor**
2. Copier-coller le contenu de `backup.sql`
3. Exécuter

---

## 📦 Phase 2 : Configuration Cloudflare R2

### Étape 2.1 : Créer un Compte Cloudflare

1. Aller sur https://dash.cloudflare.com/sign-up
2. Créer un compte (gratuit)
3. Ajouter votre domaine (optionnel, peut être fait plus tard)

### Étape 2.2 : Créer un Bucket R2

1. Dans le dashboard Cloudflare, aller dans **R2** (menu de gauche)
2. Cliquer sur **"Create bucket"**
3. Remplir :
   - **Bucket name** : `djlarian-uploads`
   - **Location** : Choisir la région la plus proche
4. Cliquer sur **"Create bucket"**

### Étape 2.3 : Créer des API Tokens

1. Dans R2, aller dans **"Manage R2 API Tokens"**
2. Cliquer sur **"Create API token"**
3. Remplir :
   - **Token name** : `djlarian-upload-token`
   - **Permissions** : **Object Read & Write**
   - **TTL** : Laisser vide (pas d'expiration) ou définir une date
4. Cliquer sur **"Create API Token"**
5. **IMPORTANT** : Copier et sauvegarder :
   - **Access Key ID**
   - **Secret Access Key**
   - **Account ID** (visible dans l'URL ou dans Overview)

### Étape 2.4 : Configurer un Custom Domain (Optionnel mais Recommandé)

1. Dans votre bucket R2, aller dans **Settings**
2. Scroller jusqu'à **"Public access"**
3. Cliquer sur **"Connect Domain"**
4. Suivre les instructions pour configurer un sous-domaine (ex: `cdn.votre-site.com`)
5. **Note** : Vous devrez configurer un enregistrement DNS CNAME

**Alternative** : Utiliser l'URL publique R2 par défaut (moins propre mais fonctionne)

---

## 🚀 Phase 3 : Configuration Cloudflare Pages

### Étape 3.1 : Préparer le Repository

Assurez-vous que votre code est sur GitHub :

```bash
# Vérifier que tout est commité
git status

# Si nécessaire, commit et push
git add .
git commit -m "Prepare for Cloudflare Pages deployment"
git push origin main
```

### Étape 3.2 : Connecter le Repository à Cloudflare Pages

1. Dans Cloudflare Dashboard, aller dans **Pages** (menu de gauche)
2. Cliquer sur **"Create a project"**
3. Cliquer sur **"Connect to Git"**
4. Autoriser Cloudflare à accéder à votre GitHub
5. Sélectionner le repository `djlarian-react` (ou votre nom de repo)
6. Cliquer sur **"Begin setup"**

### Étape 3.3 : Configurer le Build

Dans la configuration du projet :

- **Project name** : `djlarian` (ou votre choix)
- **Production branch** : `main` (ou `master`)
- **Framework preset** : `Next.js`
- **Build command** : `npm run build`
- **Build output directory** : `.next`
- **Root directory** : `/` (laisser vide ou `/`)

### Étape 3.4 : Configurer les Variables d'Environnement

Dans **Settings → Environment Variables**, ajouter :

#### Variables de Production

1. **DATABASE_URL**
   - Value : Votre connection string Neon
   - Environment : Production

2. **NEXTAUTH_URL**
   - Value : `https://votre-projet.pages.dev` (remplacer par votre URL Cloudflare Pages)
   - Environment : Production

3. **NEXTAUTH_SECRET**
   - Value : Générer avec `openssl rand -base64 32`
   - Environment : Production
   - **Marquer comme Secret** (sécurisé)

4. **GOOGLE_CLIENT_ID**
   - Value : Votre Google Client ID
   - Environment : Production

5. **GOOGLE_CLIENT_SECRET**
   - Value : Votre Google Client Secret
   - Environment : Production
   - **Marquer comme Secret**

6. **TWITCH_CLIENT_ID**
   - Value : Votre Twitch Client ID
   - Environment : Production

7. **TWITCH_CLIENT_SECRET**
   - Value : Votre Twitch Client Secret
   - Environment : Production
   - **Marquer comme Secret**

8. **CLOUDFLARE_ACCOUNT_ID**
   - Value : Votre Account ID Cloudflare
   - Environment : Production

9. **R2_ACCESS_KEY_ID**
   - Value : Votre R2 Access Key ID
   - Environment : Production
   - **Marquer comme Secret**

10. **R2_SECRET_ACCESS_KEY**
    - Value : Votre R2 Secret Access Key
    - Environment : Production
    - **Marquer comme Secret**

11. **R2_BUCKET_NAME**
    - Value : `djlarian-uploads`
    - Environment : Production

12. **R2_PUBLIC_URL** (si vous avez configuré un custom domain)
    - Value : `https://cdn.votre-site.com` (ou votre URL)
    - Environment : Production

13. **NODE_ENV**
    - Value : `production`
    - Environment : Production

14. **NEXT_PUBLIC_UMAMI_URL** (si utilisé)
    - Value : Votre URL Umami
    - Environment : Production

15. **NEXT_PUBLIC_UMAMI_WEBSITE_ID** (si utilisé)
    - Value : Votre Website ID Umami
    - Environment : Production

### Étape 3.5 : Générer NEXTAUTH_SECRET

```bash
# Dans votre terminal
openssl rand -base64 32
```

Copier le résultat et l'ajouter comme variable d'environnement.

### Étape 3.6 : Déployer

1. Cliquer sur **"Save and Deploy"**
2. Attendre la fin du build (2-5 minutes)
3. Une fois terminé, votre site sera accessible sur `https://votre-projet.pages.dev`

---

## 🧪 Phase 4 : Tests et Vérification

### Test 1 : Page d'Accueil

1. Ouvrir `https://votre-projet.pages.dev`
2. Vérifier que la page se charge correctement
3. Vérifier la navigation

### Test 2 : Authentification

1. Essayer de se connecter
2. Vérifier que la session fonctionne
3. Vérifier l'accès au panel admin (si admin)

### Test 3 : API Routes

```bash
# Tester l'API music
curl https://votre-projet.pages.dev/api/music

# Tester l'API events
curl https://votre-projet.pages.dev/api/events
```

### Test 4 : Upload d'Images

1. Se connecter en tant qu'admin
2. Aller dans le panel admin
3. Essayer d'uploader une image
4. Vérifier que l'image apparaît correctement

### Test 5 : Base de Données

1. Créer un événement depuis le panel admin
2. Vérifier qu'il apparaît sur le site
3. Vérifier dans Neon Dashboard que les données sont bien sauvegardées

---

## 🔧 Dépannage

### Erreur : "Cannot connect to database"

- Vérifier que `DATABASE_URL` est correcte
- Vérifier que la base Neon autorise les connexions depuis Cloudflare
- Vérifier que `?sslmode=require` est présent

### Erreur : "NextAuth session not working"

- Vérifier que `NEXTAUTH_URL` correspond à votre URL Cloudflare Pages
- Vérifier que `NEXTAUTH_SECRET` est défini
- Vérifier les cookies dans les DevTools

### Erreur : "Upload failed"

- Vérifier les credentials R2
- Vérifier que le bucket existe
- Vérifier les permissions du token R2

### Erreur : "Build failed"

- Vérifier les logs de build dans Cloudflare Pages
- Vérifier que toutes les dépendances sont dans `package.json`
- Vérifier que `npm run build` fonctionne localement

---

## 📝 Commandes Utiles

### Vérifier la Taille de la Base Neon

```sql
-- Dans Neon SQL Editor
SELECT pg_size_pretty(pg_database_size(current_database()));
```

### Vérifier les Variables d'Environnement

Dans Cloudflare Pages → Settings → Environment Variables

### Redéployer

- Push sur `main` déclenche automatiquement un déploiement
- Ou manuellement : Pages → Deployments → Retry deployment

---

## ✅ Checklist Finale

- [ ] Site accessible sur Cloudflare Pages
- [ ] Authentification fonctionne
- [ ] Panel admin accessible
- [ ] Upload d'images fonctionne
- [ ] Images s'affichent correctement
- [ ] API routes fonctionnent
- [ ] Base de données fonctionne
- [ ] Domaine personnalisé configuré (optionnel)

---

## 🎉 Félicitations !

Votre site est maintenant déployé sur Cloudflare Pages avec Neon ! 🚀

**Coût total : 0€/mois** (dans les limites du gratuit)

---

## 📚 Ressources

- [Documentation Neon](https://neon.tech/docs)
- [Documentation Cloudflare Pages](https://developers.cloudflare.com/pages/)
- [Documentation Cloudflare R2](https://developers.cloudflare.com/r2/)
- [Documentation Next.js](https://nextjs.org/docs)

