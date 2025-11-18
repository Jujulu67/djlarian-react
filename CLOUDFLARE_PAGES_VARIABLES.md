# 🔐 Variables d'Environnement pour Cloudflare Pages

## 📋 Liste Complète des Variables

Une fois votre projet Cloudflare Pages créé, configurez ces variables dans :
**Settings → Environment Variables**

### 🔴 Variables Obligatoires (Production)

| Variable | Valeur | Secret ? | Description |
|----------|--------|----------|-------------|
| `DATABASE_URL` | *(à obtenir depuis Neon Dashboard)* | ✅ Oui | Connection string Neon |
| `NEXTAUTH_URL` | `https://votre-projet.pages.dev` | Non | URL de votre site (à mettre à jour après déploiement) |
| `NEXTAUTH_SECRET` | *(à générer avec `openssl rand -base64 32`)* | ✅ Oui | Secret NextAuth |
| `CLOUDFLARE_ACCOUNT_ID` | *(à obtenir depuis Cloudflare Dashboard)* | Non | Account ID Cloudflare |
| `R2_ACCESS_KEY_ID` | *(à obtenir depuis R2 → Manage API Tokens)* | ✅ Oui | R2 Access Key |
| `R2_SECRET_ACCESS_KEY` | *(à obtenir depuis R2 → Manage API Tokens)* | ✅ Oui | R2 Secret Key |
| `R2_BUCKET_NAME` | `djlarian-uploads` | Non | Nom du bucket R2 |
| `NODE_ENV` | `production` | Non | Environment |

### 🟡 Variables Optionnelles (si utilisées)

| Variable | Valeur | Secret ? | Description |
|----------|--------|----------|-------------|
| `GOOGLE_CLIENT_ID` | *(votre valeur)* | Non | Google OAuth Client ID |
| `GOOGLE_CLIENT_SECRET` | *(votre valeur)* | ✅ Oui | Google OAuth Secret |
| `TWITCH_CLIENT_ID` | *(votre valeur)* | Non | Twitch OAuth Client ID |
| `TWITCH_CLIENT_SECRET` | *(votre valeur)* | ✅ Oui | Twitch OAuth Secret |
| `R2_PUBLIC_URL` | *(optionnel)* | Non | URL publique R2 (si custom domain) |
| `NEXT_PUBLIC_UMAMI_URL` | *(si utilisé)* | Non | URL Umami Analytics |
| `NEXT_PUBLIC_UMAMI_WEBSITE_ID` | *(si utilisé)* | Non | Website ID Umami |

---

## 🔐 NEXTAUTH_SECRET

**Générer avec** :
```bash
openssl rand -base64 32
```

Copiez le résultat et ajoutez-le comme variable `NEXTAUTH_SECRET` (marquer comme Secret).

---

## 📝 Instructions de Configuration

1. **Aller dans Cloudflare Pages** → votre projet → **Settings** → **Environment Variables**

2. **Pour chaque variable** :
   - Cliquer sur **"Add variable"**
   - Entrer le **nom** de la variable
   - Entrer la **valeur**
   - Cocher **"Encrypt"** pour les secrets (✅ marqués dans le tableau)
   - Sélectionner **"Production"** comme environment
   - Cliquer sur **"Save"**

3. **Important** : 
   - `NEXTAUTH_URL` doit être mis à jour après le premier déploiement avec votre vraie URL
   - Toutes les variables marquées "Secret" doivent être encryptées

---

## ✅ Checklist

- [ ] DATABASE_URL configurée (Secret)
- [ ] NEXTAUTH_URL configurée (mettre à jour après déploiement)
- [ ] NEXTAUTH_SECRET généré et configuré (Secret)
- [ ] CLOUDFLARE_ACCOUNT_ID configurée
- [ ] R2_ACCESS_KEY_ID configurée (Secret)
- [ ] R2_SECRET_ACCESS_KEY configurée (Secret)
- [ ] R2_BUCKET_NAME configurée
- [ ] NODE_ENV = production
- [ ] Variables OAuth configurées (si utilisées)
- [ ] Variables Umami configurées (si utilisées)

---

## 🚀 Après Configuration

Une fois toutes les variables configurées :
1. Cliquer sur **"Save and Deploy"**
2. Attendre la fin du build (2-5 minutes)
3. Votre site sera accessible sur `https://votre-projet.pages.dev`

---

## 🆘 En Cas de Problème

Si le build échoue :
- Vérifier les logs dans Cloudflare Pages → Deployments
- Vérifier que toutes les variables sont correctement configurées
- Vérifier que les secrets sont bien encryptés

