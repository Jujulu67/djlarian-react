# ⚠️ ACTION REQUISE : Configuration Cloudflare Pages

## 🔴 Problème Actuel

Le site déploie mais retourne 404 car **le Build Output Directory n'est pas correctement configuré**.

## ✅ Solution

### Étape 1 : Mettre à Jour la Configuration

1. Aller sur **Cloudflare Pages Dashboard**
2. Ouvrir votre projet **`djlarian-react`**
3. Aller dans **Settings** → **Builds & deployments**

### Étape 2 : Modifier le Build Output Directory

**Actuellement configuré** :
```
Build output directory: .next
```

**À changer pour** :
```
Build output directory: .vercel/output/static
```

**OU** (si `.vercel/output/static` n'existe pas après le build) :
```
Build output directory: .vercel/output
```

### Étape 3 : Sauvegarder et Redéployer

1. Cliquer sur **Save**
2. Aller dans **Deployments**
3. Cliquer sur **Retry deployment** (ou attendre le prochain commit)

---

## 🔍 Comment Vérifier

Après le prochain build, dans les logs Cloudflare Pages, vous devriez voir :
- `⚡️ @cloudflare/next-on-pages CLI` s'exécuter
- Le dossier `.vercel/output/static` être créé
- Les fichiers être uploadés depuis ce dossier

---

## 📝 Pourquoi C'est Nécessaire

`@cloudflare/next-on-pages` transforme le build Next.js pour fonctionner sur Cloudflare Pages (runtime Edge). Il génère les fichiers dans `.vercel/output/static` au lieu de `.next`.

**Sans cette configuration, Cloudflare Pages ne sait pas où trouver les fichiers générés, d'où les 404.**

---

## 🚀 Après Configuration

Une fois le Build Output Directory mis à jour et le redéploiement terminé :
- ✅ Le site devrait fonctionner
- ✅ Les API routes devraient répondre
- ✅ Le routing Next.js devrait fonctionner

**Tester** :
- `https://djlarian-react.pages.dev/`
- `https://djlarian-react.pages.dev/api/events`

