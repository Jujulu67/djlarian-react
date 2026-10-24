# Hot Swap de Base de Données - Implémentation

## 🎯 Objectif

Pouvoir faire "Local ↔ Prod" **sans redémarrage**, sans lock `.next/dev/lock`, sans ports, sans Docker qui se réveille quand tu touches prod.

## ✅ Implémentation

### Étape 1: Système DatabaseTarget avec persistance

**Fichier**: `src/lib/database-target.ts`

- Type `DatabaseTarget = 'local' | 'production'`
- État global serveur (`global.__activeDatabaseTarget`)
- Persistance dans `.runtime/db-target.json`
- Fonctions:
  - `getActiveDatabaseTarget()`: Récupère la cible active
  - `setActiveDatabaseTarget(target, userId)`: Change la cible (avec mutex)
  - `getDatabaseUrlForTarget(target)`: Récupère l'URL selon la cible
  - `getBlobTokenForTarget(target)`: Récupère le token Blob selon la cible

### Étape 2: Prisma Hot Swap

**Fichier**: `src/lib/prisma.ts`

- Cache de clients Prisma par URL (`global.__prismaClients`)
- Fonction `getPrismaClient()` qui retourne le client pour la cible active
- Fonction `updateDefaultPrismaClient()` qui met à jour le client par défaut lors d'un switch
- Export par défaut avec proxy pour compatibilité avec le code existant
- Mutex pour éviter les race conditions

**Fonctionnement**:

1. Au premier appel, crée un client pour la cible active
2. Lors d'un switch, déconnecte l'ancien client et crée un nouveau pour la nouvelle cible
3. Le cache évite les reconnexions inutiles si on revient à une cible précédente

### Étape 3: API Switch simplifiée

**Fichier**: `src/app/api/admin/database/switch/route.ts`

**Avant**:

- Écriture dans `.env.local`
- Création de marqueur de redémarrage
- Lancement du script de redémarrage

**Après**:

- Appel à `setActiveDatabaseTarget()`
- Appel à `updateDefaultPrismaClient()`
- Test de connexion avec `prisma.$queryRaw\`SELECT 1\``
- Retour immédiat (pas de redémarrage)

### Étape 4: Initialisation

**Fichier**: `src/app/layout.tsx`

- Appel à `initializePrisma()` au démarrage (dev uniquement)
- Charge la cible depuis `.runtime/db-target.json`
- Précharge le client Prisma pour la cible active

## 🔧 Variables d'environnement requises

Dans `.env.local` (ou variables d'environnement):

```bash
# URLs de base de données
DATABASE_URL_LOCAL=postgresql://djlarian:<DEV_DB_PASSWORD>@localhost:5433/djlarian_dev?sslmode=disable
DATABASE_URL_PRODUCTION=postgresql://neondb_owner:****@ep-xxx.neon.tech/neondb

# Tokens Blob (optionnel)
BLOB_READ_WRITE_TOKEN_LOCAL=...
BLOB_READ_WRITE_TOKEN_PRODUCTION=...
```

**⚠️ IMPORTANT**: Ne plus utiliser `DATABASE_URL` directement. Le système utilise `DATABASE_URL_LOCAL` et `DATABASE_URL_PRODUCTION`.

## 📁 Fichiers créés/modifiés

### Nouveaux fichiers:

- `src/lib/database-target.ts`: Système de gestion de la cible DB
- `.runtime/db-target.json`: Persistance de la cible (créé automatiquement)

### Fichiers modifiés:

- `src/lib/prisma.ts`: Hot swap avec cache de clients
- `src/app/api/admin/database/switch/route.ts`: Switch simplifié (plus d'écriture .env.local)
- `src/app/layout.tsx`: Initialisation du système Prisma

## 🚀 Utilisation

### Switch via l'UI Admin

1. Aller sur `/admin/configuration`
2. Cliquer sur le switch DB
3. ✅ **Pas de redémarrage** - le switch est instantané

### Switch via API

```typescript
// POST /api/admin/database/switch
{
  "useProduction": true  // ou false pour local
}
```

### Utilisation dans le code

**Option 1: Export par défaut (compatibilité)**

```typescript
import prisma from '@/lib/prisma';

// Le client est automatiquement mis à jour lors d'un switch
const users = await prisma.user.findMany();
```

**Option 2: getPrismaClient() (recommandé pour nouvelles routes)**

```typescript
import { getPrismaClient } from '@/lib/prisma';

// Garantit d'utiliser toujours la bonne cible
const prisma = await getPrismaClient();
const users = await prisma.user.findMany();
```

## 🔒 Sécurité

- Vérification admin requise pour le switch
- Protection anti-prod (vérifie si URL pointe vers prod)
- Logging de chaque switch avec userId
- Mutex pour éviter les race conditions

## 🧹 Nettoyage à faire (étape 5)

Une fois le hot swap stable, supprimer:

- `scripts/restart-dev-server.sh` (plus nécessaire)
- Mécanisme "restart-check" dans l'UI
- Écriture `.env.local` dans le switch
- Marqueurs `.db-restart-required.json`

## ⚠️ Limitations actuelles

1. **Export par défaut**: L'export par défaut `prisma` utilise un proxy qui peut avoir un léger overhead. Pour les nouvelles routes, préférez `getPrismaClient()`.

2. **Edge Runtime**: Le hot swap ne fonctionne que dans le runtime Node.js. Les routes Edge ne peuvent pas utiliser Prisma de toute façon.

3. **Tests**: Les tests doivent être mis à jour pour utiliser `getPrismaClient()` ou mocker le système de DatabaseTarget.

## 🧪 Tests

Pour tester le hot swap:

1. Lancer `pnpm run dev`
2. Aller sur `/admin/configuration`
3. Faire plusieurs switchs Local ↔ Prod
4. Vérifier:
   - ✅ Pas de redémarrage
   - ✅ Pas d'erreur de lock
   - ✅ Pas d'erreur de port
   - ✅ Les données changent selon la cible

## 📝 Notes

- Le système persiste la cible dans `.runtime/db-target.json` pour survivre aux redémarrages du dev server
- Le cache de clients Prisma évite les reconnexions inutiles
- Le mutex garantit qu'un seul switch peut se faire à la fois
- En production, la cible est toujours "production" (pas de switch possible)
