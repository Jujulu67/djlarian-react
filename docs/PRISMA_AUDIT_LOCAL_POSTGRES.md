# Audit Pipeline Prisma — Migration vers PostgreSQL Local

**Date**: 2025-01-XX  
**Objectif**: Cartographier le pipeline Prisma actuel et identifier les risques avant migration vers PostgreSQL local

---

## 1. État Actuel du Schéma

### 1.1 `prisma/schema.prisma`

- **Provider actuel**: `sqlite` (ligne 8)
- **Commentaires**: Indiquent que PostgreSQL est la "source de vérité" pour les migrations
- **Incohérence**: Le provider est SQLite mais les migrations sont créées pour PostgreSQL
- **Risque**: Drift entre schéma déclaré et migrations réelles

### 1.2 `prisma/migrations/migration_lock.toml`

- **Provider**: `postgresql` (ligne 6)
- **État**: Fixé sur PostgreSQL (commentaire indique "ne plus modifier")
- **Incohérence**: Le lock est en PostgreSQL mais schema.prisma est en SQLite

---

## 2. Configuration DATABASE_URL

### 2.1 Environnements

#### Production (Vercel)

- **Source**: Variable d'environnement Vercel
- **Format**: `postgresql://...` (Neon)
- **Usage**: Toujours utilisé en `NODE_ENV=production`

#### Développement Local

- **Source**: `.env.local`
- **Format actuel**: `file:./prisma/dev.db` (SQLite) OU `postgresql://...` (si switch activé)
- **Variable alternative**: `DATABASE_URL_PRODUCTION` (utilisée quand switch PostgreSQL activé)

#### Tests

- **Source**: Probablement SQLite éphemère ou `.env.test`
- **Format**: `file:./prisma/dev.db` ou base de test

### 2.2 Logique de Résolution (dans `src/lib/prisma.ts`)

```typescript
// Ordre de priorité:
1. Production: process.env.DATABASE_URL (toujours PostgreSQL)
2. Dev avec switch ON: process.env.DATABASE_URL_PRODUCTION
3. Dev par défaut: process.env.DATABASE_URL (SQLite)
```

---

## 3. Scripts Prisma Identifiés

### 3.1 Scripts de Build (`package.json`)

| Script        | Commande                             | Responsabilité                 | Risque          |
| ------------- | ------------------------------------ | ------------------------------ | --------------- |
| `dev`         | `ensure-sqlite-schema.sh && ...`     | Vérifie SQLite avant dev       | ⚠️ Force SQLite |
| `build`       | `ensure-postgresql-schema.sh && ...` | Vérifie PostgreSQL avant build | ✅ Correct      |
| `postinstall` | `prisma generate && ...`             | Génère client après install    | ✅ Correct      |

### 3.2 Scripts de Setup Base de Données

#### `scripts/setup-local-db.sh` ⚠️ **PROBLÉMATIQUE**

- **Action**: Modifie `schema.prisma` pour SQLite (lignes 47-50)
- **Action**: Modifie `migration_lock.toml` (implicite via migrations)
- **Risque**: Réécriture du schéma (interdit)
- **État**: Legacy, à supprimer/refactoriser

#### `scripts/setup-production-db.sh` ⚠️ **PROBLÉMATIQUE**

- **Action**: Modifie `schema.prisma` pour PostgreSQL (lignes 27-32)
- **Action**: Restaure migrations PostgreSQL
- **Risque**: Réécriture du schéma (interdit)
- **État**: Legacy, à supprimer/refactoriser

#### `scripts/ensure-sqlite-schema.sh` ✅ **SAFE (déjà corrigé)**

- **Action**: Vérifie seulement, ne modifie plus (lignes 38-46)
- **État**: Déjà corrigé selon commentaires

#### `scripts/ensure-postgresql-schema.sh` ⚠️ **PARTIELLEMENT PROBLÉMATIQUE**

- **Action**: Vérifie PostgreSQL en prod (lignes 29-51)
- **Action**: Corrige automatiquement les migrations SQL (lignes 84-199)
- **Action**: Utilise `db push` en fallback (lignes 458, 513, 589, 632, 651)
- **Risque**: `db push` en production (ligne 458, 513, 589, 632, 651) - **INTERDIT**
- **État**: À corriger (supprimer `db push` en prod)

### 3.3 Scripts de Migration

#### `scripts/prisma-bootstrap-local.mjs` ✅ **SAFE**

- **Action**: Applique migrations avec `migrate deploy`
- **Usage**: Bootstrap local
- **État**: Correct

#### `scripts/migrate-db-production.mjs` ✅ **SAFE**

- **Action**: `migrate deploy` sur production
- **État**: Correct

### 3.4 Scripts de Switch DB

#### `src/app/api/admin/database/switch/route.ts` ⚠️ **PROBLÉMATIQUE**

- **Action**: Modifie `schema.prisma` (lignes 38-48)
- **Action**: Modifie `migration_lock.toml` (lignes 50-82)
- **Action**: Modifie `.env.local` (lignes 84-203)
- **Risque**: Réécriture du schéma (interdit)
- **État**: À refactoriser complètement

---

## 4. Système de Switch DB Actuel

### 4.1 Fichier de Configuration

- **Fichier**: `.db-switch.json`
- **Format**: `{ "useProduction": boolean }`
- **Usage**: Lue par `src/lib/prisma.ts` et scripts

### 4.2 Flux Actuel (PROBLÉMATIQUE)

```
1. Utilisateur active switch PostgreSQL dans admin panel
2. API route modifie schema.prisma → provider = "postgresql"
3. API route modifie migration_lock.toml → provider = "postgresql"
4. API route modifie .env.local → DATABASE_URL = DATABASE_URL_PRODUCTION
5. Redémarrage serveur
```

**Problème**: Modifie `schema.prisma` et `migration_lock.toml` (interdit)

### 4.3 Flux Cible (SAFE)

```
1. Utilisateur active switch PostgreSQL dans admin panel
2. API route modifie .env.local → DATABASE_URL = DATABASE_URL_PRODUCTION
3. API route met à jour .db-switch.json
4. Redémarrage serveur
5. src/lib/prisma.ts lit .db-switch.json et utilise DATABASE_URL_PRODUCTION
```

**Avantage**: Ne modifie jamais `schema.prisma` ni `migration_lock.toml`

---

## 5. Workflows CI/Vercel

### 5.1 GitHub Actions

#### `.github/workflows/test-assistant-router.yml`

- **Action**: Tests uniquement
- **Prisma**: Aucune action Prisma
- **État**: ✅ Correct

### 5.2 Vercel Build

#### Commande Build (`package.json`)

```bash
bash scripts/ensure-postgresql-schema.sh && ...
```

**Flux Vercel**:

1. `ensure-postgresql-schema.sh` vérifie PostgreSQL
2. `prisma generate` (via postinstall)
3. `prisma migrate deploy` (dans ensure-postgresql-schema.sh, lignes 234-621)
4. `next build`

**Risques identifiés**:

- ⚠️ `db push` utilisé en fallback (lignes 458, 513, 589, 632, 651) - **INTERDIT en prod**
- ⚠️ Logique complexe de résolution de migrations (peut masquer des erreurs)

---

## 6. Migrations Existantes

### 6.1 État des Migrations

- **Dossier**: `prisma/migrations/`
- **Nombre**: ~25 migrations
- **Provider lock**: PostgreSQL (dans `migration_lock.toml`)
- **Format**: Migrations PostgreSQL standard

### 6.2 Vérification

- ✅ `migration_lock.toml` est en PostgreSQL
- ✅ Migrations sont créées pour PostgreSQL
- ⚠️ `schema.prisma` est encore en SQLite (incohérence)

---

## 7. Risques Identifiés

### 7.1 Risques Critiques 🔴

1. **Réécriture de `schema.prisma`**
   - Scripts: `setup-local-db.sh`, `setup-production-db.sh`, `switch/route.ts`
   - Impact: Perte de cohérence, drift
   - Solution: Supprimer toutes les modifications automatiques

2. **Réécriture de `migration_lock.toml`**
   - Scripts: `switch/route.ts`
   - Impact: Perte de cohérence, drift
   - Solution: Supprimer toutes les modifications automatiques

3. **`db push` en production**
   - Script: `ensure-postgresql-schema.sh` (lignes 458, 513, 589, 632, 651)
   - Impact: Risque de perte de données, pas de versioning
   - Solution: Supprimer tous les `db push` en production

### 7.2 Risques Moyens 🟡

4. **Incohérence schema.prisma vs migrations**
   - État: schema.prisma = SQLite, migrations = PostgreSQL
   - Impact: Confusion, erreurs P2021
   - Solution: Changer schema.prisma vers PostgreSQL (permanent)

5. **Switch DB modifie le schéma**
   - Script: `switch/route.ts`
   - Impact: Surprises, perte de données si mal utilisé
   - Solution: Refactoriser pour ne modifier que `.env.local`

6. **Pas de garde-fou anti-prod**
   - État: Switch peut pointer vers prod sans protection
   - Impact: Écriture accidentelle sur prod
   - Solution: Ajouter `ALLOW_PROD_DB=1` requis

### 7.3 Risques Faibles 🟢

7. **Scripts legacy non supprimés**
   - Scripts: `setup-local-db.sh`, `setup-production-db.sh`
   - Impact: Confusion, utilisation accidentelle
   - Solution: Supprimer ou marquer comme deprecated

---

## 8. Décisions Techniques

### 8.1 Provider Prisma

- **Décision**: PostgreSQL uniquement (permanent)
- **Rationale**:
  - Migrations déjà en PostgreSQL
  - Production en PostgreSQL
  - Évite drift et incohérences

### 8.2 Switch DB

- **Décision**: Switch = changement d'URL uniquement
- **Rationale**:
  - Ne modifie jamais `schema.prisma`
  - Ne modifie jamais `migration_lock.toml`
  - Simple et prévisible

### 8.3 PostgreSQL Local

- **Décision**: Docker Compose (option 1) + Postgres natif (option 2)
- **Rationale**:
  - Docker = isolation, facile à nettoyer
  - Natif = pas de dépendance Docker
  - Documenter les deux

### 8.4 Migrations

- **Décision**: `migrate deploy` uniquement (pas de `db push` en prod)
- **Rationale**:
  - Versioning explicite
  - Pas de perte de données
  - Traçabilité

### 8.5 Protection Production

- **Décision**: `ALLOW_PROD_DB=1` requis pour pointer vers prod
- **Rationale**:
  - Évite écriture accidentelle
  - Explicite et intentionnel

---

## 9. Plan d'Action

### Phase A ✅ (En cours)

- [x] Audit complet
- [x] Identification des risques
- [x] Décisions techniques

### Phase B (À faire)

- [ ] Changer `schema.prisma` → PostgreSQL (permanent)
- [ ] Créer runbook PostgreSQL local
- [ ] Créer scripts bootstrap
- [ ] Mettre à jour `.env.local.example`

### Phase C (À faire)

- [ ] Supprimer modifications `schema.prisma` des scripts
- [ ] Refactoriser switch DB (URL uniquement)
- [ ] Ajouter garde-fou anti-prod
- [ ] Supprimer scripts legacy

### Phase D (À faire)

- [ ] Vérifier workflows Vercel
- [ ] Supprimer `db push` de `ensure-postgresql-schema.sh`
- [ ] Tester build Vercel
- [ ] Tester CI

---

## 10. Fichiers à Modifier

### 10.1 Fichiers à Modifier

- `prisma/schema.prisma` (changer provider)
- `src/app/api/admin/database/switch/route.ts` (refactoriser)
- `scripts/ensure-postgresql-schema.sh` (supprimer `db push`)
- `scripts/setup-local-db.sh` (supprimer ou deprecated)
- `scripts/setup-production-db.sh` (supprimer ou deprecated)
- `package.json` (scripts npm)

### 10.2 Fichiers à Créer

- `docs/PRISMA_LOCAL_POSTGRES_RUNBOOK.md`
- `scripts/bootstrap-postgres-local.sh` (nouveau)
- `docker-compose.yml` (si Docker)
- `.env.local.example` (mise à jour)

### 10.3 Fichiers à Supprimer (optionnel)

- `scripts/setup-local-db.sh` (remplacé)
- `scripts/setup-production-db.sh` (remplacé)

---

## 11. Commandes de Vérification

### 11.1 Vérifier l'état actuel

```bash
# Vérifier provider schema.prisma
grep 'provider =' prisma/schema.prisma

# Vérifier provider migration_lock.toml
grep 'provider =' prisma/migrations/migration_lock.toml

# Vérifier migrations
pnpm prisma migrate status

# Vérifier switch DB
cat .db-switch.json 2>/dev/null || echo "Pas de switch"
```

### 11.2 Après migration

```bash
# Vérifier que schema.prisma est PostgreSQL
grep 'provider = "postgresql"' prisma/schema.prisma

# Vérifier que migrations s'appliquent
pnpm prisma migrate deploy

# Vérifier drift
pnpm prisma migrate status
```

---

**Fin de l'audit**
