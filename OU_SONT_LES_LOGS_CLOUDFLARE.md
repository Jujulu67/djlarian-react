# 📊 Où Trouver les Logs Cloudflare Pages

## 🔍 Méthode 1 : Via "View details" d'un Déploiement

1. **Dans la liste des déploiements**, cliquer sur **"View details"** d'un déploiement (celui avec le checkmark vert)
2. **Dans la page de détails du déploiement**, vous verrez :
   - Les logs de build
   - Les logs runtime (si disponibles)

## 🔍 Méthode 2 : Via "Analytics & logs" dans le Menu de Gauche

1. **Dans le menu de gauche**, chercher **"Analytics & logs"** (sous "BUILD")
2. Cliquer dessus
3. Vous devriez voir les logs en temps réel

## 🔍 Méthode 3 : Via l'URL Directe

1. Aller directement sur :
   ```
   https://dash.cloudflare.com/[VOTRE_ACCOUNT_ID]/pages/view/djlarian-react/logs
   ```
   (Remplacer `[VOTRE_ACCOUNT_ID]` par votre ID de compte)

## 🔍 Méthode 4 : Via Wrangler CLI (Recommandé pour les Logs Runtime)

Si les logs runtime ne sont pas visibles dans le dashboard, utilisez Wrangler :

```bash
# Installer wrangler (si pas déjà fait)
npm install -g wrangler

# Se connecter
wrangler login

# Voir les logs en temps réel
wrangler pages deployment tail --project-name=djlarian-react
```

Cette commande affichera les logs en temps réel dans votre terminal, y compris tous les `console.log()` et `console.error()`.

## ⚠️ Note Importante

Les logs **runtime** (pendant l'exécution de l'application) peuvent ne pas être disponibles dans le dashboard gratuit de Cloudflare Pages. Dans ce cas :

1. **Utiliser Wrangler CLI** (Méthode 4) - C'est la méthode la plus fiable
2. **Ou tester directement** en ouvrant la console du navigateur quand vous testez `/api/health`

## 🎯 Alternative : Voir les Erreurs Directement

Si vous ne trouvez pas les logs, vous pouvez aussi :

1. **Tester `/api/health`** dans le navigateur
2. **Ouvrir la Console du Navigateur** (F12 → Console)
3. Les erreurs réseau apparaîtront dans la console
4. Cliquer sur l'erreur pour voir les détails

Mais pour voir les logs `[PRISMA INIT]` et `[HEALTH CHECK]`, il faut vraiment utiliser Wrangler CLI ou avoir accès aux logs runtime dans le dashboard.

