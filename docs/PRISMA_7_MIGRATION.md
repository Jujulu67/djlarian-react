# Migration vers Prisma 7 - Guide Complet

## ✅ Migration Complétée

### Modifications Effectuées

#### 1. Configuration ESM

- ✅ `package.json` : `"type": "module"` ajouté
- ✅ `tsconfig.json` : Configuration ESM (module: "ESNext", moduleResolution: "node", target: "ES2023")
- ✅ `dotenv` installé et configuré

#### 2. Dépendances Prisma 7

- ✅ `@prisma/client@7.0.0`
- ✅ `prisma@7.0.0`
- ✅ `@prisma/adapter-better-sqlite3@7.0.0`
- ✅ `@prisma/adapter-pg@7.0.0`
- ✅ `@prisma/adapter-neon@7.0.0`

#### 3. Configuration Prisma

- ✅ `prisma/schema.prisma` : Provider changé de `prisma-client-js` → `prisma-client`
- ✅ `prisma.config.ts` : Nouveau fichier de configuration avec `env()` helper

#### 4. Code Source

- ✅ `src/lib/prisma.ts` : Migration vers les adaptateurs Prisma 7
  - Utilisation de `PrismaBetterSqlite3` pour SQLite
  - Utilisation de `PrismaPg` pour PostgreSQL
  - Utilisation de `PrismaNeon` pour Neon
  - Instanciation du PrismaClient avec l'adaptateur approprié

#### 5. Configuration Jest

- ✅ `jest.config.cjs` : Configuration pour ESM
- ✅ Mock Prisma créé dans `src/__mocks__/@prisma/client.ts`

#### 6. Scripts Automatiques

- ✅ `scripts/fix-prisma-types.mjs` : Script pour créer les fichiers de types manquants
- ✅ `package.json` : Script `postinstall` et intégration dans `build`

## ✅ Problème Résolu : Next.js/Turbopack avec Prisma 7

### Problème Initial

**Symptôme** : Erreur `Cannot find module './client.js'` lors du build

**Cause** : Prisma 7 génère des fichiers `.ts` dans `node_modules/.prisma/client`, mais :

- `default.mjs` essaie d'importer `client.js` qui n'existe pas (seulement `client.ts`)
- Node.js ne peut pas charger directement les fichiers `.ts` à l'exécution

### Solution Finale : Utilisation de `tsx`

**`tsx`** est un exécuteur TypeScript qui permet à Node.js de charger directement les fichiers `.ts` sans compilation préalable.

**Solution Appliquée** :

1. ✅ Installation de `tsx` comme dépendance de production
2. ✅ Configuration des scripts avec `NODE_OPTIONS='--import tsx'`
3. ✅ Script `fix-prisma-types.mjs` corrige `default.mjs` pour pointer vers `client.ts`
4. ✅ **Turbopack réactivé** (plus rapide que webpack)
5. ✅ Tous les tests passent (170/170)
6. ✅ Build fonctionne en ~5.8s avec Turbopack

**Résultat** : Migration réussie sans régression. Voir `PRISMA_7_SOLUTION_FINALE.md` pour les détails complets.

## 📋 Nouvelles Règles Prisma 7

### 1. Configuration du Client Prisma

**Avant (Prisma 6)** :

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: { url: process.env.DATABASE_URL },
  },
});
```

**Après (Prisma 7)** :

```typescript
import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaNeon } from '@prisma/adapter-neon';

// Créer l'adaptateur approprié
const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL || 'file:./dev.db',
});

const prisma = new PrismaClient({ adapter });
```

### 2. Configuration Prisma (prisma.config.ts)

**Nouveau fichier requis** :

```typescript
import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
});
```

### 3. Schema Prisma

**Changements** :

- Provider : `prisma-client-js` → `prisma-client`
- Suppression de `engineType` (plus nécessaire)
- `url`, `directUrl`, `shadowDatabaseUrl` déplacés vers `prisma.config.ts`

### 4. Middleware et Metrics Supprimés

**Middleware** (supprimé) :

```typescript
// ❌ Ne fonctionne plus
prisma.$use(async (params, next) => {
  return next(params);
});
```

**Remplacé par** (Client Extensions) :

```typescript
// ✅ Utiliser des extensions
const prisma = new PrismaClient().$extends({
  query: {
    user: {
      async findMany({ args, query }) {
        return query(args);
      },
    },
  },
});
```

**Metrics** (supprimé) :

- La fonctionnalité Metrics a été supprimée
- Utiliser Client Extensions si nécessaire

### 5. Variables d'Environnement Supprimées

Les variables suivantes ont été supprimées :

- `PRISMA_CLI_QUERY_ENGINE_TYPE`
- `PRISMA_CLIENT_ENGINE_TYPE`
- `PRISMA_QUERY_ENGINE_BINARY`
- `PRISMA_QUERY_ENGINE_LIBRARY`
- `PRISMA_GENERATE_SKIP_AUTOINSTALL`
- `PRISMA_SKIP_POSTINSTALL_GENERATE`
- `PRISMA_GENERATE_IN_POSTINSTALL`
- `PRISMA_GENERATE_DATAPROXY`
- `PRISMA_GENERATE_NO_ENGINE`
- `PRISMA_CLIENT_NO_RETRY`
- `PRISMA_MIGRATE_SKIP_GENERATE`
- `PRISMA_MIGRATE_SKIP_SEED`

### 6. Types TypeScript

**Changements dans les types** :

- Les types sont maintenant générés dans `node_modules/.prisma/client`
- Utiliser `@prisma/client` pour les imports (fonctionne toujours)
- Les types `Awaited<ReturnType<typeof prisma.model.findMany>>` fonctionnent toujours

**Exemple** :

```typescript
// ✅ Fonctionne toujours
import { PrismaClient, Prisma, User, Event } from '@prisma/client';

// ✅ Pour les types avec relations
type UserWithPosts = Awaited<
  ReturnType<
    typeof prisma.user.findFirst<{
      include: { posts: true };
    }>
  >
>;
```

## 🧪 Tests

### Configuration Jest

Le mock Prisma a été créé dans `src/__mocks__/@prisma/client.ts` pour les tests.

**Utilisation** :

```typescript
import { PrismaClient } from '@prisma/client';

// Jest utilisera automatiquement le mock
const prisma = new PrismaClient();
```

## 📦 Dépendances Mises à Jour

### Dépendances Principales

- `@prisma/client`: `^7.0.0`
- `prisma`: `^7.0.0` (devDependency)
- `@prisma/adapter-better-sqlite3`: `^7.0.0`
- `@prisma/adapter-pg`: `^7.0.0`
- `@prisma/adapter-neon`: `^7.0.0`

### Dépendances Compatibles

- `@auth/prisma-adapter`: `^2.11.1` (compatible avec Prisma 7)
- `dotenv`: `^17.2.3` (requis pour Prisma 7)

## 🚀 Commandes

### Génération du Client

```bash
pnpm prisma generate
```

### Migrations

```bash
pnpm prisma migrate dev
pnpm prisma migrate deploy
```

### Studio

```bash
pnpm prisma studio
```

## 📝 Notes Importantes

1. **Node.js Version** : Minimum Node.js 20.19.0, recommandé 22.x
2. **TypeScript Version** : Minimum TypeScript 5.4.0, recommandé 5.9.x
3. **ESM Requis** : Prisma 7 nécessite ESM (`"type": "module"` dans package.json)
4. **Adaptateurs Requis** : Un adaptateur de base de données est maintenant obligatoire
5. **Scripts Automatiques** : Le script `fix-prisma-types.mjs` s'exécute automatiquement après `prisma generate`

## 🔗 Références

- [Guide de migration Prisma 7](https://www.prisma.io/docs/orm/more/upgrade-guides/upgrading-versions/upgrading-to-prisma-7)
- [Prisma 7 Release Notes](https://github.com/prisma/prisma/releases)
- [Prisma 7 Breaking Changes](https://www.prisma.io/docs/orm/reference/prisma-schema-reference#breaking-changes)
