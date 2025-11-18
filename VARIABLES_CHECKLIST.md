# ✅ Checklist Variables Cloudflare Pages

## Variables Configurées

- ✅ `NEXTAUTH_URL` - Configuré

## Variables à Vérifier

Assurez-vous que toutes ces variables sont configurées dans Cloudflare Pages :

### 🔴 Obligatoires (Secrets)

- [ ] `DATABASE_URL` - Connection string Neon (Secret)
- [ ] `NEXTAUTH_SECRET` - Secret NextAuth (Secret)
- [ ] `R2_SECRET_ACCESS_KEY` - Secret R2 (Secret)

### 🟡 Obligatoires (Non-secrets)

- [ ] `CLOUDFLARE_ACCOUNT_ID` - Account ID Cloudflare
- [ ] `R2_ACCESS_KEY_ID` - R2 Access Key
- [ ] `R2_BUCKET_NAME` - `djlarian-uploads`
- [ ] `NODE_ENV` - `production`

### 🟢 Optionnelles (si utilisées)

- [ ] `GOOGLE_CLIENT_ID` - Si OAuth Google utilisé
- [ ] `GOOGLE_CLIENT_SECRET` - Si OAuth Google utilisé (Secret)
- [ ] `TWITCH_CLIENT_ID` - Si OAuth Twitch utilisé
- [ ] `TWITCH_CLIENT_SECRET` - Si OAuth Twitch utilisé (Secret)
- [ ] `NEXT_PUBLIC_UMAMI_URL` - Si Umami Analytics utilisé
- [ ] `NEXT_PUBLIC_UMAMI_WEBSITE_ID` - Si Umami Analytics utilisé

---

## 📝 Valeurs à Utiliser

Toutes les valeurs sont dans `.secrets.local.md` (fichier local, non commité).

---

## 🚀 Après Configuration

1. **Sauvegarder** toutes les variables
2. **Redéployer** le projet (ou attendre le redéploiement automatique)
3. **Tester** le site : `https://fa32fe61.djlarian-react.pages.dev/`

