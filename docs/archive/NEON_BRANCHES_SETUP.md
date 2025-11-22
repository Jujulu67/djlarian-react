# 🔄 Configuration des Branches Neon (Production vs Développement)

## ⚠️ Problème Actuel

Votre `.env.local` utilise actuellement la **branche de production** de Neon, ce qui fait que vos tests locaux modifient les données de production.

## ✅ Solution : Utiliser la Branche `development`

Neon permet de créer des **branches** (comme Git) pour séparer vos environnements.

### 📋 Étapes pour Configurer la Branche de Développement

1. **Aller dans Neon Dashboard** :

   - https://console.neon.tech
   - Se connecter à votre compte
   - Sélectionner le projet `djlarian` (Project ID: `twilight-bonus-80399064`)

2. **Vérifier/Créer la branche `development`** :

   - Dans le menu de gauche, cliquer sur **"Branches"**
   - Si la branche `development` existe déjà, la sélectionner
   - Si elle n'existe pas :
     - Cliquer sur **"Create branch"**
     - **Name** : `development`
     - **Parent branch** : `production` (ou `main`)
     - Cliquer sur **"Create"**

3. **Obtenir la Connection String de la branche `development`** :

   - Sélectionner la branche `development`
   - Aller dans **"Connection Details"** ou **"Connection String"**
   - Copier la connection string (format : `postgresql://...`)
   - **⚠️ IMPORTANT** : Cette connection string sera différente de celle de production

4. **Mettre à jour `.env.local`** :

   ```env
   # Branche de développement (pour tests locaux)
   DATABASE_URL="postgresql://neondb_owner:xxxxx@ep-xxxxx-dev-pooler.c-2.eu-central-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require"
   ```

5. **Appliquer les migrations sur la branche de développement** :

   ```bash
   npx prisma migrate deploy
   npx prisma generate
   ```

6. **Vérifier que ça fonctionne** :
   ```bash
   npx prisma studio
   ```
   - Cela devrait ouvrir Prisma Studio connecté à la branche `development`
   - Vous devriez voir une base vide (ou avec vos données de test)

---

## 🔄 Workflow Recommandé

### Développement Local

- **Branche Neon** : `development`
- **Fichier** : `.env.local`
- **Connection String** : Celle de la branche `development`

### Production (Vercel)

- **Branche Neon** : `production` (ou `main`)
- **Variables d'environnement** : Dans Vercel Dashboard
- **Connection String** : Celle de la branche `production`

---

## 📝 Notes Importantes

1. **Les branches Neon sont indépendantes** :

   - Les données de `development` ne sont pas dans `production`
   - Les données de `production` ne sont pas dans `development`
   - Chaque branche a sa propre connection string

2. **Synchronisation des schémas** :

   - Après avoir créé une migration, l'appliquer sur les deux branches :
     - D'abord sur `development` (pour tester)
     - Ensuite sur `production` (après validation)

3. **Données de test** :
   - Vous pouvez avoir des données différentes dans chaque branche
   - C'est normal et recommandé pour le développement

---

## 🆘 Dépannage

### Comment savoir quelle branche j'utilise ?

Regardez l'URL de votre connection string :

- `ep-xxxxx-pooler` → Branche par défaut (production)
- `ep-xxxxx-dev-pooler` → Branche `development`
- Le nom de la branche apparaît dans l'URL

### Je veux réinitialiser la branche de développement

Dans Neon Dashboard :

1. Aller dans **Branches** → `development`
2. Cliquer sur **"Reset"** ou **"Delete and recreate"**
3. Cela créera une branche vide avec le même schéma que `production`

### Je veux copier les données de production vers development

**⚠️ ATTENTION** : Cela écrasera les données de développement !

Dans Neon Dashboard :

1. Aller dans **Branches** → `development`
2. Cliquer sur **"Reset from parent"** (ou équivalent)
3. Cela copiera le schéma et les données de `production` vers `development`
