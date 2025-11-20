# 🔧 Correction des Erreurs de Production

## ✅ Problème 1 : Schema Prisma corrigé

**Erreur** : `provider = "sqlite"` dans `schema.prisma` alors que la production utilise PostgreSQL

**Solution** : ✅ Corrigé - `schema.prisma` utilise maintenant `provider = "postgresql"`

## ⚠️ Problème 2 : Variables d'Environnement Vercel

### Erreur NextAuth : "Erreur de configuration. Vérifiez NEXTAUTH_URL et NEXTAUTH_SECRET."

Cette erreur indique que les variables d'environnement ne sont pas correctement configurées sur Vercel.

### ✅ Actions à faire sur Vercel

1. **Aller dans Vercel Dashboard** → Votre projet → **Settings** → **Environment Variables**

2. **Vérifier/Créer ces variables** :

#### 🔒 NEXTAUTH_SECRET (Secret - à encrypter)

```bash
# Générer un nouveau secret (si pas déjà fait)
openssl rand -base64 32
```

- Nom : `NEXTAUTH_SECRET`
- Valeur : Le secret généré
- ✅ Cocher "Encrypt"
- Environnement : Production (et Preview si nécessaire)

#### 🌐 NEXTAUTH_URL (Public)

- Nom : `NEXTAUTH_URL`
- Valeur : `https://djlarian-react.vercel.app` (votre URL Vercel exacte)
- ❌ Ne PAS cocher "Encrypt" (variable publique)
- Environnement : Production (et Preview si nécessaire)

#### 🔒 DATABASE_URL (Secret - à encrypter)

- Nom : `DATABASE_URL`
- Valeur : Votre connection string Neon PostgreSQL
- ✅ Cocher "Encrypt"
- Environnement : Production (et Preview si nécessaire)

#### 🌐 NODE_ENV (Public)

- Nom : `NODE_ENV`
- Valeur : `production`
- ❌ Ne PAS cocher "Encrypt"
- Environnement : Production (et Preview si nécessaire)

### 📋 Checklist Vercel

- [ ] `DATABASE_URL` configuré avec votre connection string Neon (🔒 Encrypt)
- [ ] `NEXTAUTH_SECRET` généré et configuré (🔒 Encrypt)
- [ ] `NEXTAUTH_URL` configuré avec `https://djlarian-react.vercel.app` (sans slash final)
- [ ] `NODE_ENV` configuré à `production`
- [ ] Tous les secrets sont marqués comme "Encrypt"

### 🔄 Après Configuration

1. **Redéployer** votre projet sur Vercel

   - Soit attendre le prochain commit
   - Soit aller dans **Deployments** → Cliquer sur les 3 points → **Redeploy**

2. **Tester** :
   - `/api/health` - Devrait retourner `"status": "ok"`
   - `/api/music` - Devrait fonctionner sans erreur 500
   - Connexion - Devrait fonctionner sans erreur de configuration

## 📝 Note Importante

Le fichier `schema.prisma` a été corrigé pour utiliser PostgreSQL. Après le redéploiement, Prisma va régénérer le client avec la bonne configuration.

## 🚨 Si l'erreur persiste

1. Vérifier les logs Vercel : **Deployments** → Cliquer sur le dernier déploiement → **Functions** → Voir les logs
2. Vérifier que toutes les variables sont bien dans l'environnement **Production**
3. Vérifier que `NEXTAUTH_URL` correspond exactement à votre URL Vercel (sans slash final)
