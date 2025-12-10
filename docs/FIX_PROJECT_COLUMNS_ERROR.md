# 🔧 Fix : Erreur Prisma P2022 - Colonnes `progress` et `note` manquantes

> ✅ **RÉSOLU AUTOMATIQUEMENT** : Le script de build a été amélioré pour garantir la synchronisation automatique du schéma. Voir [FIX_AUTO_MIGRATION_SYNC.md](./FIX_AUTO_MIGRATION_SYNC.md) pour les détails.

## 🐛 Problème

Erreur en production :

```
Invalid `prisma.project.findMany()` invocation:
The column `(not available)` does not exist in the current database.
Error [PrismaClientKnownRequestError]: code: 'P2022'
```

## 🔍 Cause

**Désynchronisation entre le schéma Prisma et la base de données de production :**

1. ✅ Le schéma Prisma (`schema.prisma`) inclut les colonnes `progress` et `note` dans le modèle `Project`
2. ✅ La migration `20251210133500_add_progress_and_note_to_projects` existe et devrait ajouter ces colonnes
3. ❌ **La migration n'a pas été appliquée en production**
4. ❌ Le client Prisma a été généré avec le schéma actuel (qui inclut ces colonnes)
5. ❌ Quand Prisma exécute `project.findMany()`, il essaie d'accéder à des colonnes qui n'existent pas dans la DB

## ✅ Solution Automatique (Déploiement Futur)

Le script de build Vercel (`ensure-postgresql-schema.sh`) a été amélioré pour **garantir automatiquement la synchronisation du schéma**. Lors du prochain déploiement, le schéma sera automatiquement synchronisé et cette erreur ne se reproduira plus.

Voir [FIX_AUTO_MIGRATION_SYNC.md](./FIX_AUTO_MIGRATION_SYNC.md) pour les détails.

## 🔧 Solution Manuelle (Pour Corriger Maintenant)

Si vous avez cette erreur **maintenant** et ne pouvez pas attendre le prochain déploiement :

### Option 1 : Appliquer la migration manquante (Recommandé)

```bash
# Vérifier l'état des migrations
npx prisma migrate status

# Appliquer les migrations manquantes
npm run db:migrate:production
```

Ou directement :

```bash
npx prisma migrate deploy
```

### Option 2 : Si la migration échoue (conflit d'historique)

Si vous obtenez une erreur de drift ou de conflit d'historique :

```bash
# 1. Vérifier l'état
npx prisma migrate status

# 2. Si la migration est marquée comme "failed", la résoudre
npx prisma migrate resolve --applied 20251210133500_add_progress_and_note_to_projects

# 3. Réessayer
npx prisma migrate deploy
```

### Option 3 : Appliquer manuellement la migration SQL

Si les options précédentes ne fonctionnent pas, vous pouvez exécuter directement le SQL :

```sql
-- Ajouter les colonnes manquantes
ALTER TABLE "Project" ADD COLUMN "progress" INTEGER;
ALTER TABLE "Project" ADD COLUMN "note" TEXT;
```

Puis marquer la migration comme appliquée :

```bash
npx prisma migrate resolve --applied 20251210133500_add_progress_and_note_to_projects
```

## 🔍 Vérification

Après avoir appliqué la migration, vérifiez que les colonnes existent :

```bash
# Via Prisma Studio
npx prisma studio

# Ou via SQL direct
# Dans votre console Neon ou psql
\d "Project"
```

Vous devriez voir les colonnes `progress` et `note` dans la table `Project`.

## 📋 Prévention

Pour éviter ce problème à l'avenir :

1. **Toujours vérifier que les migrations sont appliquées après un déploiement**

   ```bash
   npx prisma migrate status
   ```

2. **Le script de build Vercel (`ensure-postgresql-schema.sh`) applique automatiquement les migrations**, mais il peut échouer silencieusement si :
   - Il y a un timeout de connexion
   - Il y a un conflit d'historique non résolu
   - La base de données est temporairement inaccessible

3. **Surveiller les logs de build Vercel** pour détecter les échecs de migration

## 🚨 Impact

- **Avant le fix** : Toutes les requêtes `prisma.project.findMany()` échouent
- **Après le fix** : Les requêtes fonctionnent normalement avec les nouvelles colonnes

## 📝 Notes

- Les colonnes `progress` et `note` sont **optionnelles** (`Int?` et `String?`), donc l'ajout ne cassera pas les données existantes
- La migration est **idempotente** : si les colonnes existent déjà, l'erreur sera différente (colonne déjà existante)
- Si vous obtenez une erreur "column already exists", c'est que la migration a déjà été appliquée partiellement
