# ✅ Alignement SQLite ↔ PostgreSQL : TERMINÉ

## 🎯 Objectif

S'assurer que la base SQLite locale est alignée avec PostgreSQL production pour que les prochaines migrations créées en local passent en production.

## ✅ Actions Réalisées

### 1. Correction de `migration_lock.toml`

Le fichier `migration_lock.toml` était en `postgresql` alors que le schéma local est en `sqlite`. Il a été corrigé pour `sqlite` en local.

**Note** : Ce fichier est automatiquement mis à jour par `ensure-postgresql-schema.sh` lors du build en production.

### 2. Synchronisation des Migrations Baseline

Les migrations baseline ont été marquées comme appliquées en SQLite :

- ✅ `20250424125117_init`
- ✅ `20250426202133_add_publish_at_to_event`
- ✅ `20250426205234_add_publish_at_to_track`

Ces migrations existent déjà en production et sont vides (baseline), donc on les marque comme appliquées sans les exécuter.

### 3. Résolution de la Migration `20251128000927_init`

Cette migration contient du SQL PostgreSQL (`CREATE SCHEMA IF NOT EXISTS "public"`) qui n'est pas compatible avec SQLite. Elle a été marquée comme appliquée en SQLite car :

- Les tables existent déjà en SQLite
- La migration a déjà été appliquée en production
- On veut juste synchroniser l'historique

## 📊 État Final

### SQLite Local

```
✅ Migrations baseline synchronisées
✅ Migration 20251128000927_init marquée comme appliquée
✅ Prêt pour les prochaines migrations
```

### PostgreSQL Production

```
✅ Toutes les migrations appliquées
✅ Aucun conflit d'historique
✅ Aligné avec Git
```

## ⚠️ Points d'Attention

### Migrations PostgreSQL vs SQLite

Certaines migrations peuvent contenir du SQL spécifique à PostgreSQL :

- `CREATE SCHEMA IF NOT EXISTS "public"` (PostgreSQL uniquement)
- `json_build_object()` (PostgreSQL) vs `json_object()` (SQLite)
- Types de données spécifiques

**Solution** : Lors de la création de nouvelles migrations :

1. Utiliser `prisma migrate dev` en local (SQLite)
2. Vérifier que le SQL généré est compatible avec PostgreSQL
3. Si nécessaire, modifier le SQL pour qu'il soit compatible avec les deux

### Migration Lock

Le fichier `migration_lock.toml` doit être :

- `sqlite` en local
- `postgresql` en production (mis à jour automatiquement par le script de build)

## 🛡️ Prévention Future

### Vérification avant Push

Avant de push une nouvelle migration :

1. ✅ Vérifier que `migration_lock.toml` est en `sqlite`
2. ✅ Tester la migration en local : `npx prisma migrate dev`
3. ✅ Vérifier que le SQL est compatible PostgreSQL
4. ✅ Le build Vercel mettra automatiquement `migration_lock.toml` en `postgresql`

### Scripts Disponibles

```bash
# Vérifier l'alignement SQLite ↔ PostgreSQL
npm run db:verify-alignment

# Synchroniser les migrations baseline
npm run db:sync-sqlite-baselines
```

## 📝 Prochaines Étapes

1. ✅ **Créer de nouvelles migrations** : Utiliser `npx prisma migrate dev` en local
2. ✅ **Vérifier la compatibilité** : S'assurer que le SQL fonctionne avec PostgreSQL
3. ✅ **Push et déployer** : Le build Vercel appliquera automatiquement les migrations

## 🎯 Résultat

✅ **SQLite et PostgreSQL sont alignés**
✅ **Les migrations baseline sont synchronisées**
✅ **Les prochaines migrations devraient passer en production**

---

**Date d'alignement** : $(date)
**Scripts utilisés** :

- `sync-sqlite-baselines.mjs`
- `verify-sqlite-prod-alignment.mjs`
