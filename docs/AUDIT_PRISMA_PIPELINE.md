# 🔍 Audit Complet du Pipeline Prisma

**Date**: 2025-01-XX  
**Contexte**: Dérives entre environnements (prod PostgreSQL vs local SQLite) causant des erreurs P2021 (table AssistantConfirmation manquante)

---

## 📊 État Actuel des Environnements

### 1. Bases de Données Utilisées

#### Production (Vercel)

- **Provider**: PostgreSQL (Neon)
- **DATABASE_URL**: Variable d'environnement Vercel (`postgresql://...`)
- **Source de vérité**: PostgreSQL
- **Migrations**: Appliquées via `prisma migrate deploy` dans `ensure-postgresql-schema.sh`

#### Développement Local

- **Provider**: SQLite (par défaut) OU PostgreSQL (si switch activé)
- **DATABASE_URL**: `file:./prisma/dev.db` (SQLite) ou `DATABASE_URL_PRODUCTION` (PostgreSQL)
- **Switch**: `.db-switch.json` contrôle le provider utilisé
- **Problème**: Le schema.prisma est **réécrit dynamiquement** par les scripts

#### Tests

- **Provider**: SQLite (via `DATABASE_URL="file:./prisma/dev.db"`)
- **Problème**: Pas de séparation claire entre tests unitaires (mock) et tests d'intégration (DB réelle)

---

## 🔴 Problèmes Identifiés

### 1. **Réécriture Dynamique de `schema.prisma`** ⚠️ CRITIQUE

**Scripts coupables**:

- `scripts/ensure-sqlite-schema.sh` (lignes 47-63, 87-103)
- `scripts/ensure-postgresql-schema.sh` (lignes 30-46, 755-790)

**Impact**:

- Le fichier `schema.prisma` est modifié à chaque exécution de `npm run dev` ou `npm run build`
- Les migrations créées en dev peuvent ne pas correspondre à la prod
- Drift silencieux entre les environnements

**Preuve**:

```bash
# ensure-sqlite-schema.sh ligne 47-63
if grep -q 'provider = "postgresql"' "$SCHEMA_PATH"; then
  sed -i '' 's/provider = "postgresql"/provider = "sqlite"/' "$SCHEMA_PATH"
fi
```

### 2. **Réécriture de `migration_lock.toml`** ⚠️ CRITIQUE

**Scripts coupables**:

- `scripts/ensure-sqlite-schema.sh` (lignes 65-84, 105-124)
- `scripts/ensure-postgresql-schema.sh` (lignes 48-67, 771-790)

**Impact**:

- L'historique des migrations est corrompu
- Les migrations PostgreSQL peuvent être marquées comme SQLite et vice-versa
- `prisma migrate status` peut donner des résultats incorrects

### 3. **Modèle `AssistantConfirmation` Sans Table** ⚠️ SYMPTÔME

**État**:

- ✅ Modèle présent dans `schema.prisma` (ligne 423-434)
- ❌ Table absente de la DB locale SQLite
- ✅ Migration manuelle créée: `prisma/migrations/manual_add_assistant_confirmation.sql`
- ❌ Migration Prisma officielle manquante

**Cause racine**:

- Le modèle a été ajouté au schema.prisma
- `prisma generate` a été exécuté (client généré avec le modèle)
- Mais `prisma migrate dev` n'a jamais été exécuté pour créer la migration
- OU la migration a été créée mais jamais appliquée en local

**Preuve**:

```bash
$ npx prisma migrate status
Following migrations have not yet been applied:
20251206000000_add_slot_machine_tokens
20251210000000_add_user_game_fields
20251210133500_add_progress_and_note_to_projects
```

### 4. **Génération Prisma Client**

**Où**:

- `package.json` → `postinstall`: `prisma generate` (ligne 13)
- `scripts/ensure-sqlite-schema.sh`: `npx prisma generate` (ligne 193)
- `scripts/ensure-postgresql-schema.sh`: `npx prisma generate` (lignes 224, 692, 818)
- `src/lib/prisma.ts`: Pas de génération, utilise le client généré

**Problème**:

- Le client est généré avec le provider actuel du schema.prisma
- Si le schema change entre générations, le client peut être incohérent

### 5. **Migrations Non Appliquées en Local**

**État actuel**:

- 3 migrations en attente:
  - `20251206000000_add_slot_machine_tokens`
  - `20251210000000_add_user_game_fields`
  - `20251210133500_add_progress_and_note_to_projects`

**Cause**:

- `npm run dev` exécute `ensure-sqlite-schema.sh` qui ne vérifie pas/applique pas les migrations
- Les développeurs doivent manuellement exécuter `prisma migrate dev`

### 6. **Utilisation de `db push` comme Fallback** ⚠️ DANGEREUX

**Où**:

- `scripts/ensure-postgresql-schema.sh` (lignes 474, 529, 605, 648, 667)

**Impact**:

- `db push` peut masquer des problèmes de migrations
- Pas de traçabilité des changements (pas d'historique dans `_prisma_migrations`)
- Risque de divergence entre environnements

### 7. **Absence de Garde-fous CI**

**État**:

- ❌ Pas de vérification de drift avant merge
- ❌ Pas de vérification que les migrations sont appliquées
- ❌ Pas de vérification que le client Prisma est à jour

**Workflow CI actuel**:

- `.github/workflows/test-assistant-router.yml`: Tests uniquement, pas de vérification Prisma

---

## 📋 Scripts "Dangereux" Identifiés

| Script                        | Action Dangereuse                                | Impact                             |
| ----------------------------- | ------------------------------------------------ | ---------------------------------- |
| `ensure-sqlite-schema.sh`     | Réécrit `schema.prisma` et `migration_lock.toml` | Drift entre environnements         |
| `ensure-postgresql-schema.sh` | Réécrit `schema.prisma` et `migration_lock.toml` | Drift entre environnements         |
| `setup-local-db.sh`           | Modifie `schema.prisma` pour SQLite              | Perte de cohérence avec prod       |
| `ensure-postgresql-schema.sh` | Utilise `db push` comme fallback                 | Masque les problèmes de migrations |

---

## 🔍 Détection de Drift

### Différences Entre Environnements

#### Schema.prisma vs DB Locale (SQLite)

```bash
# À exécuter pour vérifier
npx prisma migrate diff \
  --from-schema-datamodel prisma/schema.prisma \
  --to-schema-datasource prisma/schema.prisma \
  --script
```

**Résultat attendu**: Différences détectées (table AssistantConfirmation manquante)

#### Schema.prisma vs DB Production (PostgreSQL)

- **Non vérifié** (nécessite accès read-only à la prod)
- **Recommandation**: Ajouter un script de vérification avec connexion read-only

#### Migrations vs DB Locale

```bash
$ npx prisma migrate status
# Résultat: 3 migrations non appliquées
```

#### Migrations vs DB Production

- **Non vérifié** (nécessite accès à la prod)
- **Recommandation**: Vérifier dans le script de build

---

## 🎯 Stratégie de Réparation Recommandée

### Option Choisie: **PostgreSQL comme Source de Vérité Unique**

**Justification**:

1. ✅ Production utilise déjà PostgreSQL
2. ✅ Migrations Prisma sont conçues pour PostgreSQL
3. ✅ Évite les problèmes de compatibilité SQLite/PostgreSQL
4. ✅ Un seul workflow de migrations

**Approche**:

1. **Schema.prisma**: Toujours PostgreSQL (plus de réécriture)
2. **Dev local**: PostgreSQL (via `DATABASE_URL_PRODUCTION`) OU SQLite éphemère pour tests uniquement
3. **Tests**:
   - Tests unitaires: Mocks Prisma (pas de DB réelle)
   - Tests d'intégration: PostgreSQL éphemère (Docker) OU SQLite isolé avec `db push` uniquement

---

## 📝 Plan d'Action

### Phase 1: Stabilisation Immédiate

1. ✅ Arrêter la réécriture de `schema.prisma` et `migration_lock.toml`
2. ✅ Fixer `schema.prisma` sur PostgreSQL
3. ✅ Créer une migration officielle pour `AssistantConfirmation`
4. ✅ Appliquer les migrations en attente en local

### Phase 2: Workflow Stable

1. ✅ Scripts npm clairs pour chaque environnement
2. ✅ Documentation du workflow
3. ✅ Garde-fous CI

### Phase 3: Tests

1. ✅ Tests existants passent
2. ✅ Nouveau test pour détecter "table manquante"

---

## 🔧 Commandes de Vérification

### Vérifier l'état des migrations

```bash
npx prisma migrate status
```

### Vérifier le drift

```bash
npx prisma migrate diff \
  --from-schema-datamodel prisma/schema.prisma \
  --to-schema-datasource prisma/schema.prisma \
  --script
```

### Vérifier que le client est à jour

```bash
npx prisma validate
npx prisma generate
```

### Lister les tables en DB locale

```bash
# SQLite
sqlite3 prisma/dev.db ".tables"

# PostgreSQL
psql $DATABASE_URL -c "\dt"
```

---

## 📊 Résumé des Problèmes

| Problème                              | Criticité   | Impact                     | Solution                    |
| ------------------------------------- | ----------- | -------------------------- | --------------------------- |
| Réécriture schema.prisma              | 🔴 CRITIQUE | Drift entre environnements | Fixer sur PostgreSQL        |
| Réécriture migration_lock.toml        | 🔴 CRITIQUE | Historique corrompu        | Ne plus modifier            |
| Table AssistantConfirmation manquante | 🟡 SYMPTÔME | Erreur P2021               | Créer migration + appliquer |
| Migrations non appliquées             | 🟡 MOYEN    | Schéma désynchronisé       | Workflow automatique        |
| db push comme fallback                | 🟠 ÉLEVÉ    | Masque les problèmes       | Utiliser uniquement migrate |
| Pas de garde-fous CI                  | 🟠 ÉLEVÉ    | Regressions possibles      | Ajouter checks CI           |

---

**Prochaine étape**: Implémentation de la solution (voir `PRISMA_RUNBOOK.md`)
