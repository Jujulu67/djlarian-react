# 📊 Comment Voir les Logs Cloudflare Pages

## 🔍 Méthode 1 : Dashboard Cloudflare Pages (Realtime Logs)

### Étapes :

1. **Aller sur Cloudflare Dashboard**
   - URL : https://dash.cloudflare.com/
   - Se connecter avec votre compte

2. **Naviguer vers Pages**
   - Dans le menu de gauche, cliquer sur **"Workers & Pages"**
   - Puis cliquer sur **"Pages"**

3. **Sélectionner votre projet**
   - Cliquer sur **"djlarian-react"**

4. **Accéder aux Logs**
   - Cliquer sur l'onglet **"Logs"** ou **"Real-time Logs"**
   - Vous verrez les logs en temps réel des requêtes

### Ce que vous verrez :

- Les logs `console.log()` et `console.error()` de votre application
- Les requêtes HTTP (GET, POST, etc.)
- Les erreurs et stack traces
- Les logs `[PRISMA INIT]` et `[HEALTH CHECK]` que nous avons ajoutés

---

## 🔍 Méthode 2 : Logs d'un Déploiement Spécifique

### Étapes :

1. **Aller sur votre projet Pages**
   - Cloudflare Dashboard → Workers & Pages → Pages → djlarian-react

2. **Ouvrir l'onglet "Deployments"**
   - Vous verrez la liste de tous vos déploiements

3. **Cliquer sur un déploiement**
   - Cliquer sur le déploiement le plus récent

4. **Voir les Build Logs**
   - Les logs du build sont visibles dans la page du déploiement
   - Mais pour les logs runtime (pendant l'exécution), utilisez la Méthode 1

---

## 🔍 Méthode 3 : Via l'API Cloudflare (Avancé)

Si vous voulez accéder aux logs programmatiquement :

```bash
# Installer wrangler CLI
npm install -g wrangler

# Se connecter
wrangler login

# Voir les logs en temps réel
wrangler pages deployment tail
```

---

## 📝 Ce qu'il faut chercher dans les logs

Quand vous testez `/api/health`, cherchez :

1. **Logs `[PRISMA INIT]`** :
   - `[PRISMA INIT] Début de l'initialisation Prisma Client`
   - `[PRISMA INIT] isEdgeRuntime: true/false`
   - `[PRISMA INIT] Création du PrismaClient avec adaptateur...`
   - Si vous voyez une erreur ici, c'est pendant l'initialisation

2. **Logs `[HEALTH CHECK]`** :
   - `[HEALTH CHECK] Début du health check`
   - `[HEALTH CHECK] Exécution de $queryRaw...`
   - Si vous voyez une erreur ici, c'est pendant la requête

3. **Erreur `fs.readdir`** :
   - Cherchez `[unenv] fs.readdir is not implemented yet!`
   - Notez la stack trace complète pour voir d'où vient l'appel

---

## 🎯 Astuce : Filtrer les Logs

Dans le dashboard Cloudflare Pages Logs, vous pouvez :
- Filtrer par niveau (Error, Warning, Info)
- Filtrer par texte (chercher "PRISMA" ou "HEALTH")
- Voir les logs en temps réel ou historiques

---

## ⚠️ Note Importante

Les logs runtime (pendant l'exécution) ne sont disponibles que si :
- Vous avez un plan Cloudflare qui inclut les logs (gratuit avec limitations)
- Ou vous utilisez `wrangler pages deployment tail` en local

Les logs de build sont toujours visibles dans chaque déploiement.

