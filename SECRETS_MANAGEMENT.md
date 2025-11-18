# 🔐 Gestion des Secrets - Guide de Sécurité

## ⚠️ IMPORTANT : Les Secrets ne doivent JAMAIS être dans GitHub

### ✅ Ce qui est Sécurisé

- ✅ `.env.local` - **N'est PAS commité** (dans `.gitignore`)
- ✅ Variables d'environnement Cloudflare Pages - **Sécurisées** (encryptées)
- ✅ Code source - **Ne contient PAS de secrets**

### ❌ Ce qui NE doit PAS être dans GitHub

- ❌ Secrets R2 (Access Key, Secret Key)
- ❌ Connection string Neon avec mot de passe
- ❌ NEXTAUTH_SECRET
- ❌ Clés OAuth (Client Secrets)
- ❌ Toute valeur sensible

---

## 🔒 Configuration des Secrets dans Cloudflare Pages

### Étape 1 : Aller dans les Variables d'Environnement

1. Cloudflare Dashboard → **Pages** → votre projet
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

### Variables Non-Secrètes (pas besoin d'encrypt)

- `NEXTAUTH_URL` - URL publique
- `CLOUDFLARE_ACCOUNT_ID` - Public
- `R2_ACCESS_KEY_ID` - Public (mais peut être encrypté par précaution)
- `R2_BUCKET_NAME` - Public
- `NODE_ENV` - Public
- `NEXT_PUBLIC_*` - Toutes les variables publiques

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

---

## 🔍 Vérification

### Vérifier que les Secrets ne sont PAS dans GitHub

```bash
# Chercher des secrets dans le repo
git grep -i "r2_secret\|r2_access\|neondb_owner" -- ':!*.md' ':!.env*'
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

