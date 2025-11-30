# 🔧 Fix : Table Notification Manquante en Production

## 🎯 Problème

La table `Notification` n'existe pas en production alors que la migration a été marquée comme "applied". Cela se produit quand :

- La migration échoue avec une erreur SQL (ex: `json_object` n'existe pas en PostgreSQL)
- La migration est marquée comme "applied" pour éviter que le build échoue
- Mais la table n'a jamais été réellement créée

## ✅ Solution : Script de Correction

Un script a été créé pour vérifier et créer la table `Notification` si elle n'existe pas :

```bash
npm run db:fix-notification-table
```

## 🔍 Ce que fait le script

1. **Vérifie si la table existe** : Interroge la base de données
2. **Crée la table si nécessaire** : Utilise `CREATE TABLE IF NOT EXISTS`
3. **Migre les données** : Si `MilestoneNotification` existe encore, migre les données
4. **Ajoute les colonnes d'archive** : Vérifie et ajoute `isArchived` et `deletedAt` si nécessaire
5. **Crée les index** : Crée tous les index nécessaires

## 📋 Utilisation

### En Production (Vercel)

1. **Via Vercel CLI** (recommandé) :

   ```bash
   vercel env pull .env.local
   npm run db:fix-notification-table
   ```

2. **Via Vercel Dashboard** :
   - Aller dans les fonctions serverless
   - Créer une fonction temporaire qui exécute le script
   - Ou utiliser Vercel CLI en local avec les variables d'environnement

### En Local

```bash
# S'assurer que DATABASE_URL pointe vers la prod
export DATABASE_URL="votre-connection-string-production"

# Exécuter le script
npm run db:fix-notification-table
```

## 🔒 Sécurité

- ✅ **Idempotent** : Peut être exécuté plusieurs fois sans problème
- ✅ **Sûr** : Utilise `IF NOT EXISTS` pour éviter les erreurs
- ✅ **Vérifications** : Vérifie l'état avant chaque opération

## 🎯 Après Correction

Une fois la table créée :

- ✅ Les endpoints `/api/notifications` fonctionneront
- ✅ Les notifications pourront être créées et lues
- ✅ Le système de notifications sera opérationnel

## ⚠️ Prévention

Pour éviter ce problème à l'avenir :

- ✅ Ne pas marquer automatiquement les migrations comme "applied" si elles ont vraiment échoué
- ✅ Vérifier que les migrations utilisent la syntaxe PostgreSQL correcte
- ✅ Tester les migrations en local avant de push

---

**Script** : `scripts/fix-notification-table.mjs`
**Commande** : `npm run db:fix-notification-table`
