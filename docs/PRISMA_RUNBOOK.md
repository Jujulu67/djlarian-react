# 📘 Runbook Prisma - Guide Complet

**Version**: 1.0  
**Date**: 2025-01-14  
**Source de vérité**: PostgreSQL

---

## 🎯 Principes Fondamentaux

### Source de Vérité Unique: PostgreSQL

- ✅ **`schema.prisma`**: Toujours en PostgreSQL (ne plus modifier)
- ✅ **`migration_lock.toml`**: Toujours en PostgreSQL (ne plus modifier)
- ✅ **Migrations**: Créées et appliquées uniquement sur PostgreSQL
- ✅ **Production**: PostgreSQL (Neon via Vercel)
- ✅ **Développement local**: PostgreSQL (via `DATABASE_URL_PRODUCTION`) OU SQLite pour tests uniquement

### ⚠️ Interdictions

- ❌ **Ne plus réécrire** `schema.prisma` ou `migration_lock.toml` automatiquement
- ❌ **Ne plus utiliser** `db push` comme solution principale (uniquement pour tests SQLite)
- ❌ **Ne plus créer** de migrations SQLite (toutes les migrations sont PostgreSQL)

---

## 🚀 Workflows Standards

### 1. Ajouter un Nouveau Modèle

#### Étape 1: Modifier `schema.prisma`

```prisma
// Ajouter votre modèle dans schema.prisma
model NouveauModele {
  id        String   @id @default(cuid())
  nom       String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

#### Étape 2: Créer la Migration

```bash
# Créer une migration avec un nom descriptif
npm run prisma:migrate:dev -- --name add_nouveau_modele
```

**Important**:

- La migration est créée pour PostgreSQL
- Le nom doit être descriptif (ex: `add_user_preferences`, `add_project_tags`)

#### Étape 3: Vérifier la Migration

```bash
# Vérifier que la migration a été créée
ls -la prisma/migrations/

# Vérifier le contenu de la migration
cat prisma/migrations/YYYYMMDDHHMMSS_add_nouveau_modele/migration.sql
```

#### Étape 4: Appliquer en Local (si nécessaire)

```bash
# Si la migration n'a pas été appliquée automatiquement
npm run prisma:bootstrap:local
```

#### Étape 5: Générer le Client Prisma

```bash
# Le client est généré automatiquement après migrate dev
# Mais vous pouvez le régénérer manuellement si besoin
npm run prisma:generate
```

#### Étape 6: Vérifier le Drift

```bash
# Vérifier qu'il n'y a pas de drift
npm run prisma:check:drift
```

#### Étape 7: Commit

```bash
# Commiter schema.prisma ET la migration
git add prisma/schema.prisma
git add prisma/migrations/YYYYMMDDHHMMSS_add_nouveau_modele/
git commit -m "feat: add NouveauModele model"
```

---

### 2. Modifier un Modèle Existant

#### Étape 1: Modifier `schema.prisma`

```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  // Ajouter une nouvelle colonne
  phone     String?  // Nouvelle colonne optionnelle
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

#### Étape 2: Créer la Migration

```bash
npm run prisma:migrate:dev -- --name add_user_phone
```

#### Étape 3: Vérifier et Appliquer

Suivre les étapes 3-7 du workflow "Ajouter un Nouveau Modèle"

---

### 3. Déployer en Production

#### Automatique (Vercel)

Les migrations sont appliquées automatiquement lors du build via `ensure-postgresql-schema.sh`:

1. ✅ Vérifie que `schema.prisma` est en PostgreSQL
2. ✅ Applique les migrations avec `prisma migrate deploy`
3. ✅ Génère le client Prisma

#### Manuel (si nécessaire)

```bash
# Se connecter à la DB de production (read-only recommandé pour vérification)
npm run db:diagnose-prod

# Appliquer les migrations manuellement (si le build échoue)
npm run prisma:migrate:deploy
```

---

### 4. Bootstrap de la DB Locale

#### Première Installation

```bash
# 1. Configurer DATABASE_URL_PRODUCTION dans .env.local
# Format: DATABASE_URL_PRODUCTION="postgresql://user:password@host/database?sslmode=require"

# 2. Bootstrap la DB locale
npm run prisma:bootstrap:local
```

#### Réparer une DB Locale Cassée

```bash
# Si vous avez des erreurs P2021 (table manquante) ou P3006 (migrations)
npm run prisma:bootstrap:local
```

Ce script:

- ✅ Crée un backup automatique (SQLite) ou vous donne la commande (PostgreSQL)
- ✅ Applique les migrations manquantes
- ✅ Vérifie la synchronisation
- ✅ Génère le client Prisma

---

## 🔧 Commandes Utiles

### Vérifications

```bash
# Vérifier l'état des migrations
npx prisma migrate status

# Vérifier le drift (schéma vs DB)
npm run prisma:check:drift

# Valider le schéma
npx prisma validate

# Vérifier que le client peut être généré
npm run prisma:check:client
```

### Génération

```bash
# Générer le client Prisma
npm run prisma:generate

# Créer une migration (dev)
npm run prisma:migrate:dev -- --name nom_migration

# Appliquer les migrations (production)
npm run prisma:migrate:deploy
```

### Réparation

```bash
# Fixer schema.prisma sur PostgreSQL
npm run prisma:fix:schema

# Fixer migration_lock.toml sur PostgreSQL
npm run prisma:fix:migration-lock

# Bootstrap complet de la DB locale
npm run prisma:bootstrap:local
```

### Exploration

```bash
# Ouvrir Prisma Studio
npm run db:studio

# Diagnostiquer la DB locale
npm run db:diagnose

# Diagnostiquer la DB de production
npm run db:diagnose-prod
```

---

## 🐛 Résolution de Problèmes

### Erreur P2021: "Table does not exist"

**Symptôme**:

```
P2021: The table `main.AssistantConfirmation` does not exist.
```

**Causes possibles**:

1. Migration non appliquée
2. Client Prisma désynchronisé
3. DB locale non synchronisée

**Solution**:

```bash
# 1. Vérifier l'état des migrations
npx prisma migrate status

# 2. Si des migrations sont en attente, les appliquer
npm run prisma:bootstrap:local

# 3. Vérifier que le client est à jour
npm run prisma:generate

# 4. Si le problème persiste, vérifier le drift
npm run prisma:check:drift
```

---

### Erreur P3006: "Migration failed to apply"

**Symptôme**:

```
P3006: Migration `20251214140000_add_assistant_confirmation` failed to apply.
```

**Causes possibles**:

1. Migration partiellement appliquée
2. Conflit avec l'état de la DB
3. Migration mal formée

**Solution**:

```bash
# 1. Vérifier l'état de la migration
npx prisma migrate status

# 2. Résoudre la migration échouée
# Si la migration a partiellement réussi:
npx prisma migrate resolve --applied 20251214140000_add_assistant_confirmation

# Si la migration doit être rollback:
npx prisma migrate resolve --rolled-back 20251214140000_add_assistant_confirmation

# 3. Réappliquer les migrations
npm run prisma:migrate:deploy
```

---

### Drift Détecté

**Symptôme**:

```
❌ Drift détecté entre le schéma et la base de données
```

**Causes possibles**:

1. Modifications manuelles de la DB
2. Migrations non appliquées
3. Schema.prisma modifié sans migration

**Solution**:

```bash
# 1. Vérifier le drift exact
npx prisma migrate diff \
  --from-schema-datamodel prisma/schema.prisma \
  --to-schema-datasource prisma/schema.prisma \
  --script

# 2. Si le drift est attendu (modifications manuelles), créer une migration
npm run prisma:migrate:dev -- --name fix_drift

# 3. Si le drift est une erreur, synchroniser manuellement
# ATTENTION: Ne faites cela qu'en local, jamais en production
npm run prisma:bootstrap:local
```

---

### Schema.prisma en SQLite (Erreur CI)

**Symptôme**:

```
❌ ERREUR: schema.prisma est en SQLite
```

**Cause**: Le fichier `schema.prisma` a été modifié pour utiliser SQLite

**Solution**:

```bash
# Fixer automatiquement
npm run prisma:fix:schema

# Vérifier
grep 'provider =' prisma/schema.prisma
# Doit afficher: provider = "postgresql"
```

---

### Migration Lock en SQLite (Erreur CI)

**Symptôme**:

```
❌ ERREUR: migration_lock.toml est en SQLite
```

**Cause**: Le fichier `migration_lock.toml` a été modifié pour utiliser SQLite

**Solution**:

```bash
# Fixer automatiquement
npm run prisma:fix:migration-lock

# Vérifier
grep 'provider =' prisma/migrations/migration_lock.toml
# Doit afficher: provider = "postgresql"
```

---

## 🧪 Tests avec SQLite

### Tests Unitaires (Mocks)

Les tests unitaires doivent utiliser des mocks Prisma, pas de DB réelle:

```typescript
// src/__mocks__/@prisma/client.ts
// Mock Prisma Client pour les tests
```

### Tests d'Intégration (SQLite)

Pour les tests d'intégration nécessitant une DB réelle:

```bash
# Utiliser SQLite avec db push (sans migrations)
DATABASE_URL="file:./prisma/test.db" npx prisma db push --accept-data-loss

# Exécuter les tests
DATABASE_URL="file:./prisma/test.db" npm test

# Nettoyer après les tests
rm -f prisma/test.db
```

**Important**:

- ✅ SQLite uniquement pour tests isolés
- ✅ Ne pas créer de migrations SQLite
- ✅ Utiliser `db push` uniquement pour les tests

---

## 📋 Checklist Avant Commit

Avant de commiter des changements Prisma:

- [ ] `schema.prisma` est en PostgreSQL
- [ ] `migration_lock.toml` est en PostgreSQL
- [ ] Migration créée avec `prisma migrate dev`
- [ ] Migration testée en local
- [ ] Client Prisma généré (`prisma generate`)
- [ ] Aucun drift détecté (`prisma:check:drift`)
- [ ] Tests passent
- [ ] `schema.prisma` ET la migration sont commitées ensemble

---

## 🚨 Procédures d'Urgence

### Production: Table Manquante

**Si une table est manquante en production après déploiement:**

1. **Ne pas paniquer** - Les migrations sont idempotentes
2. Vérifier l'état: `npx prisma migrate status` (sur la DB de prod)
3. Si migration en attente: `npx prisma migrate deploy`
4. Si migration échouée: Résoudre avec `prisma migrate resolve`
5. Si problème persiste: Créer une migration de réparation

### Production: Migration Échouée

**Si une migration échoue en production:**

1. Vérifier les logs Vercel pour l'erreur exacte
2. Se connecter à la DB (read-only si possible)
3. Vérifier l'état: `npx prisma migrate status`
4. Résoudre la migration:
   - `--applied` si partiellement réussie
   - `--rolled-back` si complètement échouée
5. Réappliquer: `npx prisma migrate deploy`

### Local: DB Complètement Cassée

**Si la DB locale est dans un état incohérent:**

```bash
# Option 1: Bootstrap (recommandé - préserve les données si possible)
npm run prisma:bootstrap:local

# Option 2: Reset complet (⚠️ PERTE DE DONNÉES)
# Pour SQLite:
rm -f prisma/dev.db
npm run prisma:bootstrap:local

# Pour PostgreSQL:
# Supprimer et recréer la DB, puis:
npm run prisma:bootstrap:local
```

---

## 📚 Ressources

### Documentation Officielle

- [Prisma Migrate](https://www.prisma.io/docs/concepts/components/prisma-migrate)
- [Prisma Schema](https://www.prisma.io/docs/concepts/components/prisma-schema)
- [Prisma Client](https://www.prisma.io/docs/concepts/components/prisma-client)

### Scripts Internes

- `scripts/prisma-check-drift.mjs`: Vérification du drift
- `scripts/prisma-bootstrap-local.mjs`: Bootstrap de la DB locale
- `scripts/ensure-postgresql-schema.sh`: Vérification en build (production)
- `scripts/ensure-sqlite-schema.sh`: Vérification en dev (déprécié)

### Audit et Diagnostics

- `docs/AUDIT_PRISMA_PIPELINE.md`: Audit complet du pipeline
- `npm run db:diagnose`: Diagnostiquer la DB locale
- `npm run db:diagnose-prod`: Diagnostiquer la DB de production

---

## ✅ Critères de Succès

Un pipeline Prisma sain doit:

1. ✅ **Aucun drift** entre `schema.prisma` et la DB
2. ✅ **Toutes les migrations appliquées** (prod et local)
3. ✅ **Client Prisma à jour** (généré après chaque changement)
4. ✅ **CI passe** (garde-fous activés)
5. ✅ **Pas d'erreurs P2021/P3006** en runtime
6. ✅ **Source de vérité unique** (PostgreSQL partout)

---

**Dernière mise à jour**: 2025-01-14  
**Maintenu par**: Équipe de développement
