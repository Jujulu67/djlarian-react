# 🗄️ Configuration Vercel Blob Storage

## ✅ État Actuel

- ✅ **Déploiement Vercel** : Fonctionne
- ✅ **Base de données** : Connectée
- ⚠️ **Vercel Blob** : Non configuré (`"status": "not_configured"`)

## 🎯 Activer Vercel Blob

Vercel Blob n'est **pas automatiquement activé**. Il faut l'activer manuellement dans le dashboard.

### Étape 1 : Aller dans le Dashboard Vercel

1. Allez sur [vercel.com](https://vercel.com)
2. Connectez-vous
3. Sélectionnez votre projet `larian-react`

### Étape 2 : Activer Vercel Blob

**Option A : Via Storage (Recommandé)**

1. Dans votre projet Vercel, allez dans l'onglet **"Storage"** (dans le menu de gauche)
2. Cliquez sur **"Create Database"** ou **"Add Storage"**
3. Sélectionnez **"Blob"**
4. Donnez un nom à votre store (ex: `larian-uploads`)
5. Cliquez sur **"Create"**

**Option B : Via Variables d'Environnement**

1. Allez dans **Settings** → **Environment Variables**
2. Vercel devrait automatiquement créer `BLOB_READ_WRITE_TOKEN` après activation

### Étape 3 : Vérifier l'Activation

Après activation, Vercel va :

- ✅ Créer automatiquement `BLOB_READ_WRITE_TOKEN`
- ✅ L'injecter dans vos variables d'environnement
- ✅ Le rendre disponible dans votre code

### Étape 4 : Redéployer (si nécessaire)

1. Vercel redéploie automatiquement après activation
2. OU allez dans **Deployments** → Cliquez sur **"Redeploy"** sur le dernier déploiement

### Étape 5 : Vérifier

Testez l'endpoint `/api/health` :

```bash
curl https://votre-projet.vercel.app/api/health
```

Vous devriez voir :

```json
{
  "checks": {
    "blob": {
      "status": "configured",
      "message": "Vercel Blob is configured"
    }
  }
}
```

## 📋 Plan Gratuit Vercel Blob

- ✅ **5 GB** de stockage
- ✅ **100 GB** de bande passante/mois
- ✅ **Gratuit** sur le plan Hobby

## 🔍 Dépannage

### Blob toujours "not_configured" après activation

1. **Vérifier les variables d'environnement** :
   - Dashboard Vercel → Settings → Environment Variables
   - Cherchez `BLOB_READ_WRITE_TOKEN`
   - Il devrait être présent automatiquement

2. **Redéployer** :
   - Settings → Deployments → Redeploy

3. **Vérifier les logs** :
   - Dashboard → Deployments → Votre déploiement → Logs
   - Cherchez des erreurs liées à Blob

### Erreur "BLOB_READ_WRITE_TOKEN is required"

Cela signifie que Vercel Blob n'est pas encore activé ou que le token n'est pas disponible.

**Solution** : Suivez les étapes ci-dessus pour activer Vercel Blob.

## 📝 Notes

- **Pas besoin de configurer manuellement** `BLOB_READ_WRITE_TOKEN` - Vercel le fait automatiquement
- **Le token est injecté** automatiquement dans votre code
- **Pas de bucket à créer** - Vercel gère tout automatiquement
- **Les fichiers sont publics** par défaut (avec `access: 'public'`)

## ✅ Après Activation

Une fois activé, vous pourrez :

- ✅ Uploader des images via `/api/upload`
- ✅ Lister les images via `/api/images`
- ✅ Supprimer des images via `/api/images?url=...`
- ✅ Utiliser Vercel Blob pour tous vos uploads

---

**Félicitations ! Votre migration vers Vercel est presque terminée !** 🎉

Il ne reste plus qu'à activer Vercel Blob et tout sera opérationnel.
