# 🔐 Configuration des Secrets dans Cloudflare Pages

## 📋 Guide Rapide

### Étape 1 : Accéder aux Variables d'Environnement

1. Aller sur https://dash.cloudflare.com
2. **Pages** → votre projet `djlarian`
3. **Settings** → **Environment Variables**

### Étape 2 : Ajouter les Variables

Pour chaque variable ci-dessous :

1. Cliquer sur **"Add variable"**
2. Entrer le **nom** de la variable
3. Entrer la **valeur** (voir ci-dessous)
4. **✅ COCHER "Encrypt"** pour les secrets (marqués ✅)
5. Sélectionner **"Production"**
6. Cliquer sur **"Save"**

---

## 🔴 Variables Obligatoires

### 1. DATABASE_URL ✅ (Secret)

**Nom** : `DATABASE_URL`

**Valeur** : Obtenir depuis Neon Dashboard
- Aller sur https://console.neon.tech
- Ouvrir votre projet `djlarian`
- Copier la connection string complète
- Format : `postgresql://neondb_owner:xxxxx@ep-xxxxx.eu-central-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require`

**✅ Cocher "Encrypt"**

---

### 2. NEXTAUTH_SECRET ✅ (Secret)

**Nom** : `NEXTAUTH_SECRET`

**Valeur** : Générer avec :
```bash
openssl rand -base64 32
```

Ou utiliser la valeur déjà générée (si vous l'avez sauvegardée).

**✅ Cocher "Encrypt"**

---

### 3. NEXTAUTH_URL (Non-secret)

**Nom** : `NEXTAUTH_URL`

**Valeur** : `https://votre-projet.pages.dev`
- Remplacez `votre-projet` par le nom réel de votre projet Cloudflare Pages
- Vous pouvez le mettre à jour après le premier déploiement

**❌ Ne PAS cocher "Encrypt"**

---

### 4. CLOUDFLARE_ACCOUNT_ID (Non-secret)

**Nom** : `CLOUDFLARE_ACCOUNT_ID`

**Valeur** : *(à obtenir depuis Cloudflare Dashboard → Overview)*

**❌ Ne PAS cocher "Encrypt"** (mais vous pouvez si vous voulez)

---

### 5. R2_ACCESS_KEY_ID (Peut être encrypté par précaution)

**Nom** : `R2_ACCESS_KEY_ID`

**Valeur** : *(à obtenir depuis R2 → Manage R2 API Tokens → votre token)*

**⚠️ Optionnel** : Cocher "Encrypt" par précaution

---

### 6. R2_SECRET_ACCESS_KEY ✅ (Secret)

**Nom** : `R2_SECRET_ACCESS_KEY`

**Valeur** : *(à obtenir depuis R2 → Manage R2 API Tokens → votre token)*

**✅ Cocher "Encrypt"**

---

### 7. R2_BUCKET_NAME (Non-secret)

**Nom** : `R2_BUCKET_NAME`

**Valeur** : `djlarian-uploads`

**❌ Ne PAS cocher "Encrypt"**

---

### 8. NODE_ENV (Non-secret)

**Nom** : `NODE_ENV`

**Valeur** : `production`

**❌ Ne PAS cocher "Encrypt"**

---

## 🟡 Variables Optionnelles (si utilisées)

### OAuth Providers

Si vous utilisez Google OAuth :
- `GOOGLE_CLIENT_ID` (non-secret)
- `GOOGLE_CLIENT_SECRET` ✅ (secret - cocher "Encrypt")

Si vous utilisez Twitch OAuth :
- `TWITCH_CLIENT_ID` (non-secret)
- `TWITCH_CLIENT_SECRET` ✅ (secret - cocher "Encrypt")

### Umami Analytics (si utilisé)

- `NEXT_PUBLIC_UMAMI_URL` (non-secret)
- `NEXT_PUBLIC_UMAMI_WEBSITE_ID` (non-secret)

### R2 Custom Domain (optionnel)

- `R2_PUBLIC_URL` (non-secret) - Ex: `https://cdn.votre-site.com`

---

## ✅ Checklist

- [ ] DATABASE_URL configurée (Encrypt ✅)
- [ ] NEXTAUTH_SECRET configurée (Encrypt ✅)
- [ ] NEXTAUTH_URL configurée
- [ ] CLOUDFLARE_ACCOUNT_ID configurée
- [ ] R2_ACCESS_KEY_ID configurée
- [ ] R2_SECRET_ACCESS_KEY configurée (Encrypt ✅)
- [ ] R2_BUCKET_NAME configurée
- [ ] NODE_ENV = production
- [ ] Variables OAuth configurées (si utilisées)
- [ ] Variables Umami configurées (si utilisées)

---

## 🔒 Sécurité

**IMPORTANT** :
- ✅ Tous les secrets sont encryptés dans Cloudflare Pages
- ✅ Les secrets ne sont jamais exposés dans le code source
- ✅ `.env.local` n'est pas commité (dans .gitignore)
- ✅ Les valeurs sensibles ne sont pas dans la documentation

---

## 📝 Après Configuration

Une fois toutes les variables configurées :

1. **Sauvegarder** les changements
2. **Redéployer** le projet (ou attendre le redéploiement automatique)
3. **Vérifier** que le build réussit
4. **Tester** l'application en production

---

**Tous les secrets sont maintenant sécurisés !** 🔒

