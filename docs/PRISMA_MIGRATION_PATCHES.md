# Patchs Migration Prisma — 5 Lignes Avant/Après

**Format**: Patchs "5 lignes avant/après" pour les changements clés

---

## 1. `prisma/schema.prisma`

### Avant (lignes 7-13)

```prisma
datasource db {
  provider = "sqlite"
  // PostgreSQL est la source de vérité pour toutes les migrations
  // Les migrations sont créées et appliquées uniquement sur PostgreSQL
  // En développement local, utilisez DATABASE_URL_PRODUCTION pour pointer vers PostgreSQL
  // Pour les tests, SQLite peut être utilisé avec db push (sans migrations)
}
```

### Après (lignes 7-13)

```prisma
datasource db {
  provider = "postgresql"
  // PostgreSQL est la source de vérité unique pour toutes les migrations
  // Les migrations sont créées et appliquées uniquement sur PostgreSQL
  // En développement local, utilisez DATABASE_URL pour pointer vers PostgreSQL local
  // Pour les tests, utilisez une base PostgreSQL de test (pas SQLite)
  url      = env("DATABASE_URL")
}
```

---

## 2. `src/app/api/admin/database/switch/route.ts`

### Avant (lignes 35-82)

```typescript
// Chemin vers les fichiers
const configPath = path.join(process.cwd(), '.db-switch.json');
const schemaPath = path.join(process.cwd(), 'prisma', 'schema.prisma');
const envLocalPath = path.join(process.cwd(), '.env.local');
const envBackupPath = path.join(process.cwd(), '.env.local.backup');

// Lire le schéma actuel
let schemaContent = await fs.readFile(schemaPath, 'utf-8');

// Modifier le provider selon le switch
if (useProduction) {
  // Changer vers PostgreSQL
  schemaContent = schemaContent.replace(/provider\s*=\s*"sqlite"/, 'provider = "postgresql"');
} else {
  // Changer vers SQLite
  schemaContent = schemaContent.replace(/provider\s*=\s*"postgresql"/, 'provider = "sqlite"');
}

// Sauvegarder le schéma modifié
await fs.writeFile(schemaPath, schemaContent, 'utf-8');

// Mettre à jour migration_lock.toml pour correspondre au provider
const migrationLockPath = path.join(process.cwd(), 'prisma', 'migrations', 'migration_lock.toml');
try {
  if (
    await fs
      .access(migrationLockPath)
      .then(() => true)
      .catch(() => false)
  ) {
    let lockContent = await fs.readFile(migrationLockPath, 'utf-8');

    if (useProduction) {
      // Changer vers PostgreSQL
      lockContent = lockContent.replace(/provider\s*=\s*"sqlite"/, 'provider = "postgresql"');
    } else {
      // Changer vers SQLite
      lockContent = lockContent.replace(/provider\s*=\s*"postgresql"/, 'provider = "sqlite"');
    }

    await fs.writeFile(migrationLockPath, lockContent, 'utf-8');
    logger.info(
      `[DB SWITCH] migration_lock.toml mis à jour vers ${useProduction ? 'postgresql' : 'sqlite'}`
    );
  }
} catch (error) {
  logger.warn('[DB SWITCH] Impossible de mettre à jour migration_lock.toml', error);
  // Ne pas bloquer, mais avertir
}
```

### Après (lignes 29-33)

```typescript
// Chemin vers les fichiers
const configPath = path.join(process.cwd(), '.db-switch.json');
const envLocalPath = path.join(process.cwd(), '.env.local');
const envBackupPath = path.join(process.cwd(), '.env.local.backup');

// ⚠️ IMPORTANT: Ne plus modifier schema.prisma ni migration_lock.toml
// PostgreSQL est maintenant la source de vérité unique
// Le switch ne modifie que DATABASE_URL dans .env.local
```

---

## 3. `src/app/api/admin/database/switch/route.ts` — Protection Anti-Prod

### Avant (lignes 131-142)

```typescript
      if (useProduction) {
        // Utiliser DATABASE_URL_PRODUCTION ou demander à l'utilisateur
        if (prodDbUrl) {
          // Remplacer ou ajouter DATABASE_URL
          if (envContent.match(/^DATABASE_URL=/m)) {
            envContent = envContent.replace(/^DATABASE_URL=.*$/m, `DATABASE_URL=${prodDbUrl}`);
          } else {
            envContent += `\nDATABASE_URL=${prodDbUrl}\n`;
          }
        } else {
          throw new Error("DATABASE_URL_PRODUCTION n'est pas définie dans .env.local");
        }
```

### Après (lignes 131-165)

```typescript
      if (useProduction) {
        // Protection anti-prod: vérifier ALLOW_PROD_DB
        const allowProdDb = process.env.ALLOW_PROD_DB === '1' || process.env.ALLOW_PROD_DB === 'true';

        // Vérifier si l'URL pointe vers un environnement de production
        // (détection basique: contient "neon.tech", "vercel", "production", etc.)
        const isProdUrl = prodDbUrl && (
          prodDbUrl.includes('neon.tech') ||
          prodDbUrl.includes('vercel') ||
          prodDbUrl.includes('production') ||
          prodDbUrl.includes('prod')
        );

        if (isProdUrl && !allowProdDb) {
          throw new Error(
            "⚠️  PROTECTION: Tentative de pointer vers une base de données de production.\n" +
            "   Pour autoriser, définissez ALLOW_PROD_DB=1 dans .env.local\n" +
            "   Cette protection évite les écritures accidentelles sur la production."
          );
        }

        // Utiliser DATABASE_URL_PRODUCTION ou demander à l'utilisateur
        if (prodDbUrl) {
          // Remplacer ou ajouter DATABASE_URL
          if (envContent.match(/^DATABASE_URL=/m)) {
            envContent = envContent.replace(/^DATABASE_URL=.*$/m, `DATABASE_URL=${prodDbUrl}`);
          } else {
            envContent += `\nDATABASE_URL=${prodDbUrl}\n`;
          }

          if (isProdUrl) {
            logger.warn('[DB SWITCH] ⚠️  Switch vers base de production (ALLOW_PROD_DB requis)');
          }
        } else {
          throw new Error("DATABASE_URL_PRODUCTION n'est pas définie dans .env.local");
        }
```

---

## 4. `src/lib/prisma.ts` — Suppression Synchronisation Auto

### Avant (lignes 67-181)

```typescript
// Vérification de cohérence schema.prisma vs switch et correction de databaseUrl si nécessaire
// IMPORTANT: Cette vérification doit être faite AVANT la création de l'adaptateur
if (process.env.NODE_ENV !== 'production') {
  try {
    const schemaPath = path.join(process.cwd(), 'prisma', 'schema.prisma');
    const switchPath = path.join(process.cwd(), '.db-switch.json');

    if (fs.existsSync(schemaPath)) {
      const schemaContent = fs.readFileSync(schemaPath, 'utf-8');
      const isPostgreSQL = schemaContent.includes('provider = "postgresql"');
      const isSQLite = schemaContent.includes('provider = "sqlite"');

      // Lire le switch pour déterminer le provider attendu
      let expectedProvider: 'postgresql' | 'sqlite' = 'sqlite'; // Par défaut SQLite
      if (fs.existsSync(switchPath)) {
        try {
          const switchConfig = JSON.parse(fs.readFileSync(switchPath, 'utf-8'));
          expectedProvider = switchConfig.useProduction ? 'postgresql' : 'sqlite';
        } catch (error) {
          // Si erreur de lecture, utiliser SQLite par défaut
          logger.warn('Erreur lors de la lecture du switch, utilisation de SQLite par défaut');
        }
      }

      // Vérifier la cohérence et synchroniser si nécessaire
      const actualProvider = isPostgreSQL ? 'postgresql' : 'sqlite';

      if (actualProvider !== expectedProvider) {
        logger.warn(
          `⚠️  Incohérence détectée: schema.prisma est en ${actualProvider} mais le switch indique ${expectedProvider}. Synchronisation automatique...`
        );

        // Synchroniser automatiquement le schéma
        try {
          let newSchemaContent = schemaContent;
          if (expectedProvider === 'sqlite') {
            newSchemaContent = newSchemaContent.replace(
              /provider\s*=\s*"postgresql"/,
              'provider = "sqlite"'
            );
          } else {
            newSchemaContent = newSchemaContent.replace(
              /provider\s*=\s*"sqlite"/,
              'provider = "postgresql"'
            );
          }

          fs.writeFileSync(schemaPath, newSchemaContent, 'utf-8');
          logger.info(`✅ Schema.prisma synchronisé vers ${expectedProvider}`);
        } catch (error) {
          logger.error('Erreur lors de la synchronisation automatique du schéma', error);
        }
      }
      // ... (suite du code)
    }
  } catch (error) {
    // ...
  }
}
```

### Après (lignes 67-95)

```typescript
// ⚠️ IMPORTANT: schema.prisma est maintenant toujours PostgreSQL (source de vérité unique)
// Plus de synchronisation automatique nécessaire - le switch ne modifie que DATABASE_URL
// Vérification simple: s'assurer que DATABASE_URL pointe vers PostgreSQL si le switch est activé
if (process.env.NODE_ENV !== 'production') {
  try {
    const switchPath = path.join(process.cwd(), '.db-switch.json');
    const isSQLiteUrl = databaseUrl.startsWith('file:');
    const isPostgreSQLUrl =
      databaseUrl.startsWith('postgresql://') || databaseUrl.startsWith('postgres://');

    // Si le switch indique PostgreSQL mais que l'URL est SQLite, utiliser DATABASE_URL_PRODUCTION
    if (fs.existsSync(switchPath)) {
      try {
        const switchConfig = JSON.parse(fs.readFileSync(switchPath, 'utf-8'));
        if (switchConfig.useProduction && isSQLiteUrl) {
          if (process.env.DATABASE_URL_PRODUCTION) {
            logger.warn(
              '⚠️  Switch PostgreSQL activé mais DATABASE_URL pointe vers SQLite. Utilisation de DATABASE_URL_PRODUCTION...'
            );
            databaseUrl = process.env.DATABASE_URL_PRODUCTION;
          } else {
            logger.error(
              "⚠️  ERREUR: Switch PostgreSQL activé mais DATABASE_URL pointe vers SQLite et DATABASE_URL_PRODUCTION n'est pas défini."
            );
            throw new Error(
              'Switch PostgreSQL activé mais DATABASE_URL_PRODUCTION non défini. Définissez DATABASE_URL_PRODUCTION dans .env.local.'
            );
          }
        }
      } catch (error) {
        // Si erreur de lecture du switch, ignorer (non-bloquant)
        if (error instanceof Error && error.message.includes('Switch PostgreSQL')) {
          throw error;
        }
        logger.warn('Erreur lors de la lecture du switch (non-bloquant):', error);
      }
    }

    // Supprimer le marqueur de redémarrage requis au démarrage
    const restartMarkerPath = path.join(process.cwd(), '.db-restart-required.json');
    if (fs.existsSync(restartMarkerPath)) {
      // Le marqueur peut être supprimé maintenant que le schéma est toujours PostgreSQL
      try {
        fs.unlinkSync(restartMarkerPath);
        logger.debug('PRISMA - Marqueur de redémarrage supprimé');
      } catch {
        // Ignorer les erreurs de suppression
      }
    }
  } catch (error) {
    // Si c'est une erreur critique de configuration, la propager
    if (error instanceof Error && error.message.includes('Switch PostgreSQL')) {
      throw error;
    }
    // Sinon, ignorer les erreurs de nettoyage
    logger.warn('Erreur lors de la vérification (non-bloquante):', error);
  }
}
```

---

## 5. `package.json` — Scripts

### Avant (ligne 10)

```json
    "dev": "bash scripts/ensure-sqlite-schema.sh && npx tsx scripts/update-hero-title.ts && NODE_OPTIONS='--import tsx' next dev",
```

### Après (ligne 10)

```json
    "dev": "npx tsx scripts/update-hero-title.ts && NODE_OPTIONS='--import tsx' next dev",
```

---

### Avant (lignes 30-34)

```json
    "db:setup:local": "bash scripts/setup-local-db.sh",
    "db:local": "bash scripts/setup-local-db.sh",
    "db:production": "bash scripts/setup-production-db.sh",
    "db:setup:production-url": "bash scripts/setup-database-url-production.sh",
    "db:reset:local": "rm -f prisma/dev.db && npm run db:setup:local",
```

### Après (lignes 30-36)

```json
    "db:setup:local": "bash scripts/bootstrap-postgres-local.sh",
    "db:local": "bash scripts/bootstrap-postgres-local.sh",
    "db:bootstrap": "bash scripts/bootstrap-postgres-local.sh",
    "db:use:local": "echo 'DATABASE_URL_LOCAL doit être défini dans .env.local' && echo 'Utilisez le switch DB dans l\\'admin panel ou modifiez .env.local manuellement'",
    "db:use:test": "echo 'Pour les tests, utilisez une base PostgreSQL de test' && echo 'Configurez DATABASE_URL dans votre environnement de test'",
    "db:use:prod": "echo '⚠️  PROTECTION: Pour pointer vers prod, définissez ALLOW_PROD_DB=1 dans .env.local' && echo 'Utilisez le switch DB dans l\\'admin panel'",
    "db:reset:local": "echo '⚠️  Pour reset PostgreSQL local:' && echo '  Docker: docker-compose down -v && docker-compose up -d && npm run db:bootstrap' && echo '  Natif: dropdb -U djlarian djlarian_dev && createdb -U djlarian djlarian_dev && npm run db:bootstrap'",
```

---

### Avant (lignes 57-59)

```json
    "prisma:bootstrap:local": "node scripts/prisma-bootstrap-local.mjs",
    "prisma:fix:schema": "sed -i '' 's/provider = \"sqlite\"/provider = \"postgresql\"/' prisma/schema.prisma || sed -i 's/provider = \"sqlite\"/provider = \"postgresql\"/' prisma/schema.prisma",
    "prisma:fix:migration-lock": "sed -i '' 's/provider = \"sqlite\"/provider = \"postgresql\"/' prisma/migrations/migration_lock.toml || sed -i 's/provider = \"sqlite\"/provider = \"postgresql\"/' prisma/migrations/migration_lock.toml",
```

### Après (ligne 57)

```json
    "prisma:bootstrap:local": "node scripts/prisma-bootstrap-local.mjs",
```

---

## Commandes Exactes à Exécuter

### Setup Initial (Docker)

```bash
# 1. Démarrer PostgreSQL
docker-compose up -d

# 2. Configurer .env.local
cat >> .env.local << 'EOF'
DATABASE_URL="postgresql://djlarian:djlarian_dev_password@127.0.0.1:5433/djlarian_dev?sslmode=disable"
EOF

# 3. Bootstrap
npm run db:bootstrap
```

### Vérification

```bash
# Vérifier provider
grep 'provider =' prisma/schema.prisma
# Attendu: provider = "postgresql"

# Vérifier migrations
npx prisma migrate status
# Attendu: "Database schema is up to date"

# Lancer l'app
npm run dev
```

---

**Fin des patchs**
