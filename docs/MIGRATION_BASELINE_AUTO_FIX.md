# 🔧 Fix Automatique : Migrations Baseline pour la Production

## 🎯 Problème Résolu

**Pourquoi ça marchait en test mais pas en prod ?**

- **En test** : La base de données est propre, pas de migrations anciennes
- **En prod** : Il y a des migrations anciennes dans la DB (ex: `20250424125117_init`) qui ne sont **pas** dans le repo Git
- **Résultat** : Prisma détecte un conflit d'historique et refuse d'appliquer les nouvelles migrations

## ✅ Solution Implémentée

Le script `ensure-postgresql-schema.sh` **résout automatiquement** ce problème en :

1. **Détectant les migrations manquantes** : Identifie les migrations qui sont dans la DB de prod mais pas dans le repo
2. **Créant des migrations baseline** : Crée automatiquement des migrations vides avec le même nom
3. **Marquant comme appliquées** : Utilise `prisma migrate resolve --applied` pour synchroniser l'historique
4. **Appliquant les nouvelles migrations** : Une fois l'historique synchronisé, applique les migrations en attente

## 🔄 Processus Automatique

### Étape 1 : Détection

```
⚠️  Conflit d'historique des migrations détecté
   ℹ️  Certaines migrations sont dans la DB mais pas localement
   🔧 Résolution automatique : création de migrations baseline...
```

### Étape 2 : Création des Baselines

```
   📋 Migrations baseline détectées dans la DB:
      - 20250424125117_init
      - 20250426202133_add_publish_at_to_event
      - 20250426205234_add_publish_at_to_track
   🔧 Création des migrations baseline...
      📝 Création de la migration baseline: 20250424125117_init
      ✅ Migration baseline créée et marquée comme appliquée: 20250424125117_init
```

### Étape 3 : Synchronisation

```
   ✅ Migrations baseline créées, l'historique devrait maintenant être synchronisé
   🔄 Baselines créées, nouvelle tentative de synchronisation...
```

### Étape 4 : Application des Migrations

```
✅ Migrations Prisma appliquées avec succès
```

## 📁 Structure des Migrations Baseline

Les migrations baseline créées sont des fichiers SQL vides avec des commentaires :

```sql
-- Baseline migration: Cette migration existe déjà dans la base de données de production
-- Elle est marquée comme baseline pour synchroniser l'historique des migrations
-- Aucune modification SQL n'est nécessaire, le schéma est déjà à jour
```

Ces migrations sont créées dans `prisma/migrations/[nom_migration]/migration.sql`

## 🚀 Avantages

1. **Automatique** : Plus besoin d'intervention manuelle
2. **Sûr** : Les migrations baseline sont vides, elles ne modifient pas la DB
3. **Synchronisé** : L'historique est maintenant cohérent entre le repo et la prod
4. **Réutilisable** : Les migrations baseline sont commitées dans Git

## 📝 Notes Importantes

- ⚠️ **Les migrations baseline sont créées automatiquement** lors du build
- ✅ **Elles sont vides** : Aucun SQL n'est exécuté, juste pour synchroniser l'historique
- 🔄 **Elles sont commitées** : Une fois créées, elles doivent être ajoutées au repo
- 🎯 **L'historique est synchronisé** : Les nouvelles migrations peuvent maintenant être appliquées

## 🔍 Vérification

Après le premier build qui crée les baselines, vous pouvez vérifier :

```bash
# Voir les migrations baseline créées
ls -la prisma/migrations/

# Vérifier l'état des migrations
pnpm prisma migrate status
```

## 🎯 Prochaines Étapes

1. **Commit les migrations baseline** : Une fois créées, elles doivent être ajoutées au repo
2. **Vérifier le build** : Le build suivant devrait appliquer les nouvelles migrations sans problème
3. **Synchroniser l'historique** : L'historique est maintenant cohérent entre repo et prod

---

**Date de modification** : $(date)
**Script modifié** : `scripts/ensure-postgresql-schema.sh`
