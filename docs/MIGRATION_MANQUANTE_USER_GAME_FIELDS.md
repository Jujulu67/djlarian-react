# Migration manquante : Colonnes User (gameHighScore, hasDiscoveredCasino)

## Problème identifié

Lors de la vérification des migrations, il a été détecté que deux colonnes présentes dans le schéma Prisma (`schema.prisma`) n'avaient pas de migration correspondante :

1. **`User.gameHighScore`** (Int @default(0))
2. **`User.hasDiscoveredCasino`** (Boolean @default(false))

Ces colonnes sont utilisées par le système de jeu (casino, high score) mais n'ont jamais été créées en production.

## Migration créée

**Fichier** : `prisma/migrations/20251210000000_add_user_game_fields/migration.sql`

```sql
-- AlterTable
-- Ajout des colonnes gameHighScore et hasDiscoveredCasino à la table User
-- Ces colonnes sont utilisées pour le système de jeu (casino, high score)
-- Migration sans perte de données (ALTER TABLE ADD COLUMN avec valeurs par défaut)

ALTER TABLE "User" ADD COLUMN "gameHighScore" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN "hasDiscoveredCasino" BOOLEAN NOT NULL DEFAULT false;
```

## Application en production

Pour appliquer cette migration en production :

```bash
# Option 1: Utiliser le script de migration production
pnpm run db:migrate:production

# Option 2: Appliquer manuellement avec Prisma
pnpm prisma migrate deploy
```

## Vérification

Après application, vérifier que les colonnes existent :

```sql
-- PostgreSQL
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'User'
AND column_name IN ('gameHighScore', 'hasDiscoveredCasino');
```

## Script d'analyse

Un script d'analyse a été créé pour détecter automatiquement ce type de problème à l'avenir :

```bash
node scripts/compare-schema-migrations.mjs
```

Ce script compare le schéma Prisma avec toutes les migrations existantes et identifie les colonnes, tables et index manquants.

## Notes

- ✅ Migration sans perte de données (valeurs par défaut définies)
- ✅ Compatible SQLite et PostgreSQL
- ✅ Les valeurs par défaut garantissent que les utilisateurs existants ont des valeurs valides
