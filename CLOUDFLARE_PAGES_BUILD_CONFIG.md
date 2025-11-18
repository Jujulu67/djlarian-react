# ⚙️ Configuration Build Cloudflare Pages

## 📋 Configuration Requise

Avec `@cloudflare/next-on-pages`, la configuration du build dans Cloudflare Pages doit être :

### Build Settings

**Dans Cloudflare Pages → Settings → Builds & deployments :**

- **Build command** : `npm run build`
- **Build output directory** : `.vercel/output/static` (après l'installation de @cloudflare/next-on-pages)
- **Root directory** : `/` (vide)

### Alternative (si `.vercel/output/static` ne fonctionne pas)

Si le build output directory n'est pas correct, essayer :
- `.vercel/output/static` (par défaut avec next-on-pages)
- `.vercel/output` (si static n'existe pas)
- `.next` (fallback)

---

## 🔧 Vérification

Après le prochain build, vérifier dans les logs :
1. Que `@cloudflare/next-on-pages` s'exécute
2. Que le dossier `.vercel/output/static` est créé
3. Que les fichiers sont uploadés correctement

---

## 📝 Note

`@cloudflare/next-on-pages` adapte Next.js App Router pour fonctionner sur Cloudflare Pages (runtime Edge). C'est nécessaire pour que les API routes et le routing fonctionnent correctement.

