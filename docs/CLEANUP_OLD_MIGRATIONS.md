# 🗑️ Nettoyage Automatique des Migrations Obsolètes

## 🎯 Problème

Certaines migrations anciennes existent dans la base de données de production mais ne sont plus dans le repo Git. Cela crée un conflit d'historique qui empêche l'application des nouvelles migrations.

## ✅ Solution : Nettoyage Automatique

Au lieu de créer des migrations baseline vides, on peut **nettoyer automatiquement** les migrations obsolètes de la table `_prisma_migrations`.

### 🔒 Sécurité

- ✅ **Aucune perte de données** : Le script ne supprime QUE les entrées de la table `_prisma_migrations`
- ✅ **Pas de modification du schéma** : Les tables et données réelles ne sont jamais touchées
- ✅ **Mode dry-run par défaut** : Le script affiche ce qui sera supprimé sans rien modifier

## 📋 Utilisation

### 1. Vérifier les migrations obsolètes (dry-run)

```bash
npm run db:cleanup-migrations
```

Affiche les migrations qui seront supprimées **sans rien modifier**.

### 2. Nettoyer les migrations obsolètes

```bash
npm run db:cleanup-migrations:execute
```

Supprime automatiquement les entrées de `_prisma_migrations` qui n'existent plus localement.

## 🔄 Intégration Automatique

Le script `ensure-postgresql-schema.sh` **nettoie automatiquement** les migrations obsolètes lors du build :

1. Détecte les migrations obsolètes
2. Les supprime automatiquement de `_prisma_migrations`
3. Si nécessaire, crée des baselines pour les migrations restantes

## 📊 Exemple de Sortie

### Mode Dry-Run

```
🔍 MODE DRY-RUN - Aucune modification ne sera effectuée

🔍 Analyse des migrations...

📋 Migrations locales: 5
   ✅ 20251128000927_init
   ✅ 20251130021226_add_streams_j180_j365
   ✅ 20251130022530_add_milestone_notifications
   ✅ 20251130023000_refactor_notifications_to_generic
   ✅ 20251201120000_add_notification_archive

📋 Migrations en base de données: 8
   ✅ 20250424125117_init
   ⚠️  20250426202133_add_publish_at_to_event
   ⚠️  20250426205234_add_publish_at_to_track
   ✅ 20251128000927_init
   ✅ 20251130021226_add_streams_j180_j365
   ✅ 20251130022530_add_milestone_notifications
   ✅ 20251130023000_refactor_notifications_to_generic
   ✅ 20251201120000_add_notification_archive

⚠️  Migrations obsolètes détectées (3):
   🗑️  20250424125117_init
   🗑️  20250426202133_add_publish_at_to_event
   🗑️  20250426205234_add_publish_at_to_track

🔍 MODE DRY-RUN (aucune modification)
   Pour supprimer ces migrations, exécutez:
   node scripts/cleanup-old-migrations.mjs --execute
```

### Mode Exécution

```
⚠️  MODE EXÉCUTION - Les migrations obsolètes seront supprimées

🗑️  Suppression des migrations obsolètes...
   ✅ Supprimée: 20250424125117_init
   ✅ Supprimée: 20250426202133_add_publish_at_to_event
   ✅ Supprimée: 20250426205234_add_publish_at_to_track

✅ Nettoyage terminé !
   Les migrations obsolètes ont été supprimées de la table _prisma_migrations.
   Aucune donnée réelle n'a été affectée.
```

## 🔍 Comment ça fonctionne ?

1. **Lit les migrations locales** : Liste tous les dossiers dans `prisma/migrations/` qui contiennent un fichier `migration.sql`
2. **Lit les migrations en DB** : Interroge la table `_prisma_migrations` pour obtenir toutes les migrations appliquées
3. **Compare** : Identifie les migrations en DB mais absentes localement
4. **Supprime** : Supprime uniquement les entrées de `_prisma_migrations` (pas les tables ni les données)

## ⚠️ Important

- **Ne supprime jamais de données** : Seule la table `_prisma_migrations` est modifiée
- **Idempotent** : Peut être exécuté plusieurs fois sans problème
- **Sécurisé** : Mode dry-run par défaut pour vérifier avant d'exécuter

## 🚀 Avantages vs Migrations Baseline

| Approche      | Avantages                                                        | Inconvénients                                          |
| ------------- | ---------------------------------------------------------------- | ------------------------------------------------------ |
| **Nettoyage** | ✅ Plus propre<br>✅ Pas de fichiers vides<br>✅ Historique réel | ⚠️ Supprime l'historique des anciennes migrations      |
| **Baseline**  | ✅ Conserve l'historique<br>✅ Traçabilité                       | ⚠️ Crée des fichiers vides<br>⚠️ Historique artificiel |

**Recommandation** : Utiliser le nettoyage pour les migrations vraiment obsolètes, et les baselines uniquement si nécessaire.

---

**Script** : `scripts/cleanup-old-migrations.mjs`
**Commandes** : `npm run db:cleanup-migrations` (dry-run) | `npm run db:cleanup-migrations:execute` (exécution)
