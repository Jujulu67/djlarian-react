# 🔐 Variables d'Environnement pour Vercel

Ce fichier liste toutes les variables d'environnement à configurer dans Vercel, basées sur votre `.env.local`.

## 📋 Instructions

1. Allez dans votre projet Vercel → **Settings** → **Environment Variables**
2. Pour chaque variable ci-dessous :
   - Cliquez sur **"Add variable"**
   - Entrez le **nom** et la **valeur**
   - Cochez **"Encrypt"** pour les secrets (marqués avec 🔒)
   - Sélectionnez **Production** (et Preview/Development si nécessaire)
   - Cliquez sur **"Save"**

---

## ✅ Variables Obligatoires

### 🔒 Secrets (à encrypter)

```env
# Base de données Neon
DATABASE_URL="postgresql://neondb_owner:npg_4RfHFXtrLsI9@ep-quiet-glade-agrwubg6-pooler.c-2.eu-central-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require"

# NextAuth - Générer un nouveau secret pour la production
# Commande: openssl rand -base64 32
NEXTAUTH_SECRET="[GÉNÉRER UN NOUVEAU SECRET]"
```

### 🌐 Variables Publiques

```env
# URL de votre site Vercel (à remplacer par votre URL réelle)
NEXTAUTH_URL="https://votre-projet.vercel.app"

# Environnement
NODE_ENV="production"
```

---

## 🟢 Variables Optionnelles (selon vos besoins)

### OAuth Google (si utilisé)

```env
GOOGLE_CLIENT_ID="[VOTRE_GOOGLE_CLIENT_ID]"
GOOGLE_CLIENT_SECRET="[VOTRE_GOOGLE_CLIENT_SECRET]"  # 🔒 Secret
```

### OAuth Twitch (si utilisé)

```env
TWITCH_CLIENT_ID="[VOTRE_TWITCH_CLIENT_ID]"
TWITCH_CLIENT_SECRET="[VOTRE_TWITCH_CLIENT_SECRET]"  # 🔒 Secret
```

### YouTube API (si utilisé)

```env
YOUTUBE_API_KEY="AIzaSyAI0LHuemMMQCIViObGkG_G0r7GIUT0ByE"
```

### Umami Analytics (si utilisé)

```env
NEXT_PUBLIC_UMAMI_WEBSITE_ID="484ec662-e403-4498-a654-ca04b9b504c3"
NEXT_PUBLIC_UMAMI_URL="[VOTRE_URL_UMAMI]"  # Ex: https://analytics.votre-domaine.com
```

---

## 🚫 Variables à NE PAS Configurer

Ces variables sont **automatiquement gérées par Vercel** :

- ❌ `BLOB_READ_WRITE_TOKEN` - Injecté automatiquement par Vercel Blob
- ❌ Variables R2 (R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, etc.) - Plus utilisées, migré vers Vercel Blob
- ❌ `CLOUDFLARE_ACCOUNT_ID` - Plus nécessaire

---

## 📝 Notes Importantes

1. **NEXTAUTH_SECRET** : Générer un **nouveau secret** pour la production (ne pas réutiliser celui du dev)

   ```bash
   openssl rand -base64 32
   ```

2. **NEXTAUTH_URL** : Doit correspondre exactement à l'URL de votre site Vercel

   - Format : `https://votre-projet.vercel.app`
   - Sans slash final

3. **DATABASE_URL** : Votre connection string Neon actuelle fonctionne parfaitement

4. **Vercel Blob** : Aucune configuration nécessaire, le token est injecté automatiquement

---

## ✅ Checklist

- [ ] `DATABASE_URL` configuré (🔒 Secret)
- [ ] `NEXTAUTH_SECRET` généré et configuré (🔒 Secret)
- [ ] `NEXTAUTH_URL` configuré avec votre URL Vercel
- [ ] `NODE_ENV` configuré à `production`
- [ ] Variables OAuth configurées (si utilisées)
- [ ] Variables Umami configurées (si utilisées)
- [ ] Tous les secrets sont marqués comme "Encrypt"

---

## 🔄 Après Configuration

1. **Redéployer** votre projet (ou attendre le prochain déploiement)
2. **Tester** l'endpoint `/api/health` pour vérifier la connexion
3. **Tester** l'authentification
4. **Tester** les uploads (Vercel Blob)

---

**Note** : Ce fichier contient des valeurs de développement. Pour la production, utilisez des secrets différents et plus sécurisés.
