# Correction des migrations SQLite/PostgreSQL

## Problèmes identifiés

### 1. ✅ CORRIGÉ : Type DATETIME dans les migrations

**Problème** : La migration `20251130185800_add_live_panel_models` utilisait `DATETIME` (type SQLite) au lieu de `TIMESTAMP(3)` (compatible avec les deux).

**Erreur en production** :

```
ERROR: type "datetime" does not exist
```

**Solution** : Tous les `DATETIME` ont été remplacés par `TIMESTAMP(3)` dans cette migration.

### 2. ✅ CORRIGÉ : CREATE SCHEMA dans la migration initiale

**Problème** : La migration `20251128000927_init` contenait `CREATE SCHEMA IF NOT EXISTS "public";` qui n'est pas supporté par SQLite.

**Solution** : Supprimé de la migration (PostgreSQL ignore cette commande si le schéma existe déjà).

### 3. ⚠️ PROBLÈME RESTANT : ALTER TABLE ... ADD CONSTRAINT

**Problème** : La migration initiale utilise `ALTER TABLE ... ADD CONSTRAINT` pour les foreign keys, ce qui n'est pas supporté par SQLite.

**Erreur SQLite** :

```
SQLite database error
near "CONSTRAINT": syntax error in ALTER TABLE ... ADD CONSTRAINT
```

**Explication** : SQLite nécessite que les foreign keys soient définies directement dans le `CREATE TABLE`, pas ajoutées après avec `ALTER TABLE`.

**Impact** :

- ✅ **Production (PostgreSQL)** : Fonctionne correctement maintenant (après correction de DATETIME)
- ⚠️ **Développement (SQLite)** : La migration initiale ne peut pas être appliquée avec `prisma migrate dev`

## Solutions

### Pour la production (PostgreSQL)

Les migrations devraient maintenant fonctionner après les corrections :

- ✅ `DATETIME` → `TIMESTAMP(3)`
- ✅ `CREATE SCHEMA` supprimé

### Pour le développement (SQLite)

**Option 1 : Utiliser `prisma db push`** (recommandé pour SQLite)

```bash
npx prisma db push
```

Cette commande synchronise le schéma sans utiliser les migrations, ce qui évite les problèmes de compatibilité.

**Option 2 : Réinitialiser les migrations SQLite**
Si vous voulez utiliser `prisma migrate dev` avec SQLite, il faudrait :

1. Supprimer la base SQLite locale
2. Réinitialiser les migrations pour SQLite
3. Créer de nouvelles migrations compatibles SQLite

**Option 3 : Utiliser PostgreSQL en développement**
Activer le switch PostgreSQL en développement :

```bash
echo '{"useProduction": true}' > .db-switch.json
```

## Script de correction

Un script a été créé pour corriger automatiquement les migrations :

```bash
node scripts/fix-migrations-compatibility.mjs
```

Ce script corrige :

- Supprime `CREATE SCHEMA`
- Remplace `DATETIME` par `TIMESTAMP(3)`

## Recommandations

1. **Pour la production** : Les migrations sont maintenant corrigées et devraient fonctionner avec PostgreSQL.

2. **Pour le développement** :
   - Utiliser `prisma db push` avec SQLite (plus simple)
   - Ou utiliser PostgreSQL en développement avec le switch activé

3. **Pour les futures migrations** :
   - Toujours utiliser `TIMESTAMP(3)` au lieu de `DATETIME`
   - Ne pas inclure `CREATE SCHEMA` dans les migrations
   - Si possible, définir les foreign keys directement dans `CREATE TABLE` plutôt qu'avec `ALTER TABLE`

## État actuel

- ✅ Migration `20251130185800_add_live_panel_models` corrigée (DATETIME → TIMESTAMP(3))
- ✅ Migration `20251128000927_init` corrigée (CREATE SCHEMA supprimé)
- ⚠️ Migration `20251128000927_init` : ALTER TABLE ... ADD CONSTRAINT reste incompatible avec SQLite (mais fonctionne avec PostgreSQL)
