# 🔄 Redéploiement Vercel - Activer Vercel Blob

## ✅ État Actuel

- ✅ **Blob Store créé** : `larian-uploads`
- ✅ **BLOB_READ_WRITE_TOKEN** : Créé par Vercel
- ⚠️ **Déploiement actuel** : Fait avant la création du Blob Store
- ⚠️ **`/api/health`** : Dit toujours "not_configured"

## 🎯 Solution : Redéployer

Le token `BLOB_READ_WRITE_TOKEN` est injecté **au moment du build/déploiement**. Comme votre déploiement actuel a été fait **avant** la création du Blob Store, il faut redéployer.

## 📝 Méthodes de Redéploiement

### Méthode 1 : Redéploiement Manuel (Rapide) ✅

1. Allez dans votre projet Vercel
2. Onglet **"Deployments"**
3. Trouvez le dernier déploiement (celui qui fonctionne)
4. Cliquez sur les **3 points** (⋯) à droite
5. Sélectionnez **"Redeploy"**
6. Confirmez

**Temps** : ~2-3 minutes

### Méthode 2 : Push Git (Automatique)

Si vous avez des changements à commit :

```bash
# Faire un petit changement (ou juste un commit vide)
git commit --allow-empty -m "chore: Trigger redeploy for Vercel Blob"
git push
```

Vercel redéploiera automatiquement.

**Temps** : ~3-5 minutes (incluant le push)

### Méthode 3 : Vérifier les Variables d'Environnement

Avant de redéployer, vérifiez que le token est bien présent :

1. Dashboard Vercel → **Settings** → **Environment Variables**
2. Cherchez `BLOB_READ_WRITE_TOKEN`
3. Il devrait être présent (créé automatiquement par Vercel)

## ✅ Après le Redéploiement

Une fois redéployé, testez :

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

## 🔍 Dépannage

### Blob toujours "not_configured" après redéploiement

1. **Vérifier les variables d'environnement** :
   - Dashboard → Settings → Environment Variables
   - `BLOB_READ_WRITE_TOKEN` doit être présent
   - Vérifiez qu'il est disponible pour **Production** (et Preview si nécessaire)

2. **Vérifier les logs de déploiement** :
   - Dashboard → Deployments → Votre déploiement → Logs
   - Cherchez des erreurs liées à Blob

3. **Vérifier que le Blob Store est bien créé** :
   - Dashboard → Storage
   - Votre store `larian-uploads` doit être visible

### Le token n'apparaît pas dans les variables

Parfois, il faut attendre quelques secondes après la création du Blob Store pour que le token soit disponible.

**Solution** : Attendez 1-2 minutes, puis vérifiez à nouveau les variables d'environnement.

## 📝 Note

Le token `BLOB_READ_WRITE_TOKEN` est :

- ✅ **Créé automatiquement** par Vercel quand vous créez un Blob Store
- ✅ **Injecté automatiquement** dans votre code au moment du build
- ✅ **Disponible** dans `process.env.BLOB_READ_WRITE_TOKEN`
- ❌ **Ne doit PAS** être ajouté manuellement (Vercel le gère)

## ✅ Checklist

- [ ] Blob Store créé dans Vercel Dashboard
- [ ] `BLOB_READ_WRITE_TOKEN` visible dans Environment Variables
- [ ] Redéploiement effectué
- [ ] `/api/health` retourne `"status": "configured"` pour blob

---

**Une fois le redéploiement terminé, tout devrait fonctionner !** 🎉
