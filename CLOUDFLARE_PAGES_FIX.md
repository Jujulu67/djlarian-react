# 🔧 Fix 404 Cloudflare Pages - Configuration Requise

## ⚠️ Problème

Le site déploie mais retourne 404 sur toutes les routes, y compris les API routes.

## ✅ Solution : @cloudflare/next-on-pages

J'ai ajouté `@cloudflare/next-on-pages` qui est **nécessaire** pour faire fonctionner Next.js App Router sur Cloudflare Pages.

## 📋 Action Requise : Mettre à Jour la Configuration Cloudflare Pages

### 1. Aller dans Cloudflare Pages Dashboard

1. Ouvrir votre projet `djlarian-react`
2. Aller dans **Settings** → **Builds & deployments**

### 2. Mettre à Jour le Build Output Directory

**Changer de** :
- `Build output directory` : `.next`

**Vers** :
- `Build output directory` : `.vercel/output/static`

### 3. Sauvegarder et Redéployer

1. Cliquer sur **Save**
2. Aller dans **Deployments**
3. Cliquer sur **Retry deployment** sur le dernier déploiement

---

## 🔍 Vérification

Après le redéploiement, vérifier dans les logs :
1. Que `@cloudflare/next-on-pages` s'exécute
2. Que le dossier `.vercel/output/static` est créé
3. Que les fichiers sont uploadés

---

## 📝 Note

`@cloudflare/next-on-pages` adapte Next.js pour fonctionner sur le runtime Edge de Cloudflare. Sans cela, les API routes et le routing ne fonctionnent pas correctement.

---

## 🚀 Après Configuration

Une fois le build output directory mis à jour et le redéploiement terminé, tester :
- `https://djlarian-react.pages.dev/`
- `https://djlarian-react.pages.dev/api/events`

