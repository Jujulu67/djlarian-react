# ⚙️ Configuration Build Command Cloudflare Pages

## ⚠️ IMPORTANT : Changer le Build Command

Dans Cloudflare Pages, le build command doit utiliser `pages:build` au lieu de `build`.

### Configuration Requise

**Dans Cloudflare Pages → Settings → Builds & deployments :**

1. **Build command** : 
   ```
   npm run pages:build
   ```

2. **Build output directory** :
   ```
   .vercel/output/static
   ```

3. **Root directory** : `/` (vide)

---

## 📝 Pourquoi ?

Le script `pages:build` utilise `vercel build` qui génère les fichiers `.vercel/output` nécessaires pour `@cloudflare/next-on-pages`, alors que `next build` ne le fait pas.

---

## ✅ Après Configuration

1. Sauvegarder dans Cloudflare Pages
2. Redéployer (ou attendre le prochain commit)
3. Le site devrait fonctionner !

