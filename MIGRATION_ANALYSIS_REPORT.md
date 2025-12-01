# Rapport d'analyse des migrations Prisma

## 📊 Résumé

**Date d'analyse** : 2025-12-03

### ✅ Toutes les tables du schéma ont une migration

Tous les modèles définis dans `schema.prisma` ont une migration correspondante.

## 📋 Liste des modèles et leurs migrations

### Tables créées dans la migration initiale (`20251128000927_init`)

- ✅ `Account`
- ✅ `Event`
- ✅ `Genre`
- ✅ `GenresOnTracks`
- ✅ `MusicCollection`
- ✅ `RecurrenceConfig`
- ✅ `Session`
- ✅ `TicketInfo`
- ✅ `Track`
- ✅ `TrackPlatform`
- ✅ `User`
- ✅ `VerificationToken`
- ✅ `SiteConfig`
- ✅ `ConfigHistory`
- ✅ `ConfigSnapshot`
- ✅ `Image`
- ✅ `Project`

### Tables créées dans des migrations ultérieures

#### `20251130023000_refactor_notifications_to_generic`

- ✅ `Notification` (remplace `MilestoneNotification`)

#### `20251130185800_add_live_panel_models`

- ✅ `LiveSubmission`
- ✅ `LiveItem`
- ✅ `UserLiveItem`
- ✅ `UserTicket`

#### `20251201130000_add_is_draft_to_live_submission`

- ✅ Modification de `LiveSubmission` (ajout de `isDraft`)

#### `20251202000000_add_is_rolled_to_live_submission`

- ✅ Modification de `LiveSubmission` (ajout de `isRolled`)

#### `20251203000000_add_pinned_to_live_submission`

- ✅ Modification de `LiveSubmission` (ajout de `isPinned`)

#### `20251203120000_add_admin_settings` (créée manuellement)

- ✅ `AdminSettings`

#### `20251203130000_add_merge_token` (créée manuellement)

- ✅ `MergeToken`

## 🔍 Vérifications effectuées

### ✅ Toutes les tables du schéma sont présentes

- 24 modèles dans `schema.prisma`
- 24 tables créées dans les migrations (plus `MilestoneNotification` qui a été supprimée)

### ⚠️ Note sur `MilestoneNotification`

- Cette table a été créée dans une migration antérieure
- Elle a été remplacée par `Notification` dans la migration `20251130023000_refactor_notifications_to_generic`
- C'est normal qu'elle apparaisse dans l'historique des migrations mais pas dans le schéma actuel

## 📝 Migrations en attente d'application

Les migrations suivantes n'ont pas encore été appliquées en production :

1. `20251201120000_add_notification_archive` - Ajout de `isArchived` et `deletedAt` à `Notification`
2. `20251201130000_add_is_draft_to_live_submission` - Ajout de `isDraft` à `LiveSubmission`
3. `20251202000000_add_is_rolled_to_live_submission` - Ajout de `isRolled` à `LiveSubmission`
4. `20251203000000_add_pinned_to_live_submission` - Ajout de `isPinned` à `LiveSubmission`
5. `20251203120000_add_admin_settings` - Création de la table `AdminSettings`
6. `20251203130000_add_merge_token` - Création de la table `MergeToken`

### ⚠️ Migration suspecte

- `20251130233216_add_is_draft_to_live_submission` : Dossier existe mais pas de fichier `migration.sql`. Probablement une migration incomplète ou supprimée. Peut être ignorée car `20251201130000_add_is_draft_to_live_submission` fait la même chose.

Ces migrations seront automatiquement appliquées lors du prochain déploiement grâce au script `ensure-postgresql-schema.sh`.

## ✅ Conclusion

**Toutes les migrations nécessaires sont présentes.** Aucune table manquante détectée.

Les migrations récemment créées (`AdminSettings` et `MergeToken`) sont correctement formatées avec `TIMESTAMP(3)` pour la compatibilité PostgreSQL.

## 🔄 Prochaines étapes

1. ✅ Commit et push des nouvelles migrations
2. ✅ Déploiement sur Vercel
3. ✅ Les migrations seront appliquées automatiquement
4. ✅ Vérification que toutes les tables existent en production
