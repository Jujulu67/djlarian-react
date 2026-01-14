# Audit Qualité Global - dj-larian

**Date**: 2025-12-16  
**Auteur**: Audit automatisé (post PR1–PR5)  
**Version**: 2.2

---

## 1) Résumé Exécutif

### Forces du projet

1. **Architecture assistant bien structurée** : La séparation mémoire étanche (ConversationMemory vs ActionMemory) est un pattern avancé correctement implémenté avec des invariants documentés (I1-I5).
2. **Couverture de tests solide** : 317 suites de tests, 4323 tests passants, couverture ~67% des lignes.
3. **Gestion des erreurs centralisée** : `errorHandler.ts` + `responseHelpers.ts` dans `/lib/api` forment une base cohérente pour les réponses API.
4. **TypeScript strict activé** : `"strict": true` dans tsconfig.json, seulement 8 occurrences de `: any` et 35 suppressions TypeScript.
5. **Outillage CI complet** : Jest, ESLint, Husky, coverage thresholds, scripts de migration DB.
6. **Documentation inline** : Les fichiers critiques (router.ts, memory/, auth.config.ts) contiennent des commentaires explicatifs.
7. **✅ Layering 100% respecté (post PR1-PR2)** : Aucune violation `lib → app` ou `lib → components` dans le code applicatif.
8. **✅ Domain layer créé (PR2)** : `src/lib/domain/projects` centralise les types et la logique métier projets.
9. **✅ Scripts de validation (PR3)** : `npm run check:boundaries` et `npm run check:all` automatisent les vérifications.
10. **✅ Base env centralisée (PR4)** : `src/lib/env/server.ts` avec validation Zod au démarrage.
11. **🟡 Migration process.env progressive** : ~455 occurrences hors `src/lib/env/**` à migrer.

### Faiblesses majeures (mises à jour)

1. **Logger non respecté** : 593 `console.*` direct malgré `logger.ts` (134 imports mais pas utilisé partout). Risque PII hors assistant.
2. ~~**Imports cross-layer**~~ ✅ **RÉSOLU** : PR1 et PR2 ont corrigé toutes les violations.
3. ~~**Factory.ts cycle inversé**~~ ✅ **RÉSOLU** : PR1 a corrigé ce cycle.
4. **Duplication config env** 🟡 **EN COURS** : PR4 a créé `src/lib/env/server.ts` (base). Migration progressive des ~455 `process.env` restants hors `src/lib/env/**`.
5. ~~**Router monolithique**~~ ✅ **Orchestrateur allégé (PR5)** : `router.ts` passé de 1114 à 238 lignes. 🟡 **Hotspot** : `router-handlers.ts` (964 lignes) → découpage prévu en PR6.
6. **TODO orphelins** : 15 TODO non résolus, dont des stubs Redis.

### Niveau de risque "multiprise"

**Évaluation : BAS** ⬇️ (était MOYEN avant PR1–PR4)

**Justification** :

- ✅ Pas de cycles npm visibles, layering 100% respecté
- ✅ Mémoire assistant isolée avec tests d'invariants
- ✅ 0 import interdit lib→app (vérifié par `npm run check:boundaries` via ESLint)
- ✅ 0 import lib→components (re-exports depuis domain layer)
- ✅ Base env centralisée via Zod validation (`src/lib/env/server.ts`)
- 🟡 Migration process.env progressive (~455 restants hors env module)
- (-) Console logging anarchique (amélioration P2)
- ~~(-) Router monolithe (PR5 planifié)~~ ✅ **décomposé (PR5)**

---

## 2) État des PRs Architecturales

| PR      | Priorité | Statut      | Description                                                                              |
| ------- | -------- | ----------- | ---------------------------------------------------------------------------------------- |
| **PR1** | P0       | ✅ Mergée   | 0 dépendance `src/lib/**` → `src/app/**`                                                 |
| **PR2** | P0       | ✅ Mergée   | 0 dépendance `src/lib/**` → `src/components/**`, création de `src/lib/domain/projects/*` |
| **PR3** | P1       | ✅ Mergée   | Règles ESLint `import/no-restricted-paths` + scripts `check:boundaries` et `check:all`   |
| **PR4** | P1       | ✅ Mergée   | Création de `src/lib/env/server.ts` (validation Zod) + barrel `src/lib/env/index.ts`     |
| **PR5** | P1       | ✅ Terminée | Découpage de `router.ts` (1114 → 238 lignes) — 4 modules extraits                        |
| **PR6** | P2       | ✅ Terminée | Découpage de `router-handlers.ts` (964 → 32 lignes) → 7 handlers individuels             |

---

## 3) Structure Canonique du Projet

### Domain Layer (PR2)

```
src/lib/domain/projects/
├── index.ts          # Barrel exports
├── types.ts          # Project, ProjectStatus, LabelStatus, EditableField, CellType
├── filters.ts        # QueryFilters type
└── filter-projects.ts # filterProjects function + FilterResult type
```

**Exports principaux** :

```typescript
// Types
export type { Project, ProjectStatus, LabelStatus, EditableField, CellType } from './types';
export { PROJECT_STATUSES, LABEL_OPTIONS } from './types';

// Filters
export type { QueryFilters } from './filters';

// Filter logic
export { filterProjects } from './filter-projects';
export type { FilterResult } from './filter-projects';
```

### Re-exports UI (compatibilité)

Les fichiers suivants font un re-export depuis le domain layer pour maintenir la compatibilité :

| Fichier UI                                         | Re-exporte depuis                      |
| -------------------------------------------------- | -------------------------------------- |
| `src/components/projects/types.ts`                 | `@/lib/domain/projects`                |
| `src/components/assistant/types.ts`                | `@/lib/domain/projects` (QueryFilters) |
| `src/components/assistant/utils/filterProjects.ts` | `@/lib/domain/projects`                |

### Module Env (PR4)

```
src/lib/env/
├── index.ts    # Barrel: export { serverEnv, isConfigured, type ServerEnv }
└── server.ts   # Validation Zod + serverEnv singleton + isConfigured helpers
```

**Usage** :

```typescript
import { serverEnv, isConfigured } from '@/lib/env';

// Accès typé et validé
const dbUrl = serverEnv.DATABASE_URL;
const isDebug = serverEnv.ASSISTANT_DEBUG;

// Vérification de configuration optionnelle
if (isConfigured.groq()) {
  // API Groq disponible
}
```

---

## 4) Scripts de Validation (PR3)

### Scripts package.json

```json
{
  "scripts": {
    "check:boundaries": "node scripts/check-layer-boundaries.mjs",
    "check:all": "npm run type-check && npm run lint && npm run test:no-skips && npm run check:boundaries"
  }
}
```

> **Note v2.2** : Le script `check:boundaries` exécute `check-layer-boundaries.mjs` qui lance ESLint avec la règle `import/no-restricted-paths` et échoue si des violations sont détectées.

### Exécution recommandée

```bash
# Vérification rapide des boundaries
npm run check:boundaries

# Vérification complète (avant PR/commit)
npm run check:all

# TypeScript seul
npx tsc --noEmit --skipLibCheck
```

---

## 5) Carte du Produit

| Domaine             | Pages/Routes               | API Routes                                            | Modèles DB                                                             | Intégrations                                    |
| ------------------- | -------------------------- | ----------------------------------------------------- | ---------------------------------------------------------------------- | ----------------------------------------------- |
| **Auth**            | `/auth/*`                  | `/api/auth/*` (13 fichiers)                           | `User`, `Account`, `Session`, `VerificationToken`, `MergeToken`        | NextAuth v5, Google OAuth, Twitch OAuth, bcrypt |
| **Projets**         | `/projects/*`              | `/api/projects/*` (13 sous-routes)                    | `Project`, `Notification`                                              | Assistant IA, Excel export                      |
| **Admin**           | `/admin/*` (110 fichiers!) | `/api/admin/*` (43 fichiers)                          | `SiteConfig`, `ConfigHistory`, `AdminSettings`                         | -                                               |
| **Assistant IA**    | Composant flottant         | `/api/assistant/groq`                                 | `AssistantConfirmation`                                                | Groq LLM API (Llama 3.3)                        |
| **Live Panel**      | `/live/*`                  | `/api/live/*` (24 fichiers)                           | `LiveSubmission`, `LiveItem`, `UserLiveItem`, `UserTicket`             | Twitch                                          |
| **Musique**         | `/music/*`                 | `/api/music/*`, `/api/spotify/*`, `/api/soundcloud/*` | `Track`, `Genre`, `GenresOnTracks`, `MusicCollection`, `TrackPlatform` | Spotify, SoundCloud, Last.fm, MusicBrainz       |
| **Events**          | `/events/*`                | `/api/events/*`                                       | `Event`, `RecurrenceConfig`, `TicketInfo`                              | -                                               |
| **Profile**         | `/profile/*`               | `/api/profile/*`, `/api/friends/*`                    | `User`, `Friendship`                                                   | -                                               |
| **Casino/Games**    | `/casino/*`, `/games/*`    | `/api/slot-machine/*`, `/api/minigames/*`             | `UserSlotMachineTokens`                                                | -                                               |
| **Notifications**   | `/notifications/*`         | `/api/notifications/*` (17 fichiers)                  | `Notification`                                                         | -                                               |
| **Galerie/Contact** | `/gallery/*`, `/contact/*` | `/api/images/*`, `/api/upload/*`                      | `Image`                                                                | Vercel Blob                                     |

### État management côté client

- **Zustand** : 1 store seulement (`src/stores/useConfigs.ts`)
- **SWR** : Utilisé via hooks (`useNotifications`, `useFriends`)
- **useState local** : Pattern dominant (pas de global state abusif ✓)

---

## 6) Carte des Modules et Boundaries

### Modules techniques

| Module                                                           | Responsabilité                     | API publique                           | Dépendances clés                      | Anti-patterns                                         |
| ---------------------------------------------------------------- | ---------------------------------- | -------------------------------------- | ------------------------------------- | ----------------------------------------------------- |
| **UI Components** (`src/components/`)                            | Composants React                   | Exports par sous-dossier               | Hooks, types                          | `ProjectAssistant.tsx` (682 lignes) encore volumineux |
| **Pages/Routes** (`src/app/(routes)/`)                           | Pages Next.js                      | RSC exports                            | Composants, actions                   | Admin = 110 fichiers (fragmentation excessive?)       |
| **API Routes** (`src/app/api/`)                                  | Endpoints REST                     | GET/POST/PUT/DELETE                    | Prisma, responseHelpers, errorHandler | Pas de couche repository                              |
| **Server Actions** (`src/app/actions/`)                          | Mutations serveur                  | `processProjectCommand()`              | Groq, Prisma, tools                   | Action unique monolithique (530 lignes)               |
| **Domain Logic** (`src/lib/assistant/`)                          | Logique métier assistant           | Router, Memory, Parser, Responder      | -                                     | ✅ router.ts refactoré (PR5) : 1114 → 238 lignes      |
| **Domain Projects** (`src/lib/domain/projects/`)                 | Types et logique projets           | Project, QueryFilters, filterProjects  | -                                     | ✅ Nouveau module (PR2)                               |
| **Environment** (`src/lib/env/`)                                 | Config env validée                 | serverEnv, isConfigured                | Zod                                   | ✅ Nouveau module (PR4)                               |
| **Data Access** (`src/lib/prisma.ts`)                            | ORM singleton                      | `prisma` export default                | @prisma/client, adapters              | Hot swap complexe                                     |
| **Infra** (`src/lib/api/`, `src/lib/twitch/`, `src/lib/blob.ts`) | Services externes                  | Functions                              | fetch, SDKs                           | rateLimiter peu utilisé                               |
| **Shared Utils** (`src/lib/utils/`)                              | Helpers partagés                   | 30+ fichiers                           | -                                     | Pas de "god utils" ✓                                  |
| **Services** (`src/lib/services/`)                               | Intégrations (Spotify, SoundCloud) | Client classes                         | fetch                                 | soundcloud.ts = 41KB (monolithe)                      |
| **Observabilité** (`src/lib/logger.ts`)                          | Logging centralisé                 | `logger.*`                             | console                               | Sous-utilisé (593 console.\* directs)                 |
| **Security** (`src/lib/assistant/security/`)                     | PII redaction, permissions         | `PiiRedactor`, `createGetTargetUserId` | -                                     | ✓ Bien isolé                                          |
| **Tests** (`__tests__/`)                                         | Tests unitaires/intégration        | Jest                                   | -                                     | 317 suites, bonne couverture                          |

### Règles de layering (Clean Architecture)

```
┌─────────────────────────────────────────────────────────────┐
│                          UI Layer                            │
│  src/app/(routes)/ → src/components/ → src/hooks/           │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     Application Layer                        │
│  src/app/actions/ → src/app/api/ → src/lib/assistant/router │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                       Domain Layer                           │
│  src/lib/domain/projects/ → src/lib/assistant/memory/       │
│  → query-parser/ → conversational/                          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Infrastructure Layer                      │
│  src/lib/prisma.ts → src/lib/api/ → src/lib/services/       │
│  src/lib/env/                                                │
└─────────────────────────────────────────────────────────────┘
```

**Règles strictes** :

1. UI → Application ✓ (autorisé)
2. Application → Domain ✓ (autorisé)
3. Domain → Infra ✓ (autorisé)
4. ~~Domain → UI ✗~~ ✅ **RÉSOLU (PR1-PR2)** — 0 violation
5. Infra → Domain ✗ (INTERDIT)
6. ~~lib/_ → app/_ ✗~~ ✅ **RÉSOLU (PR1)** — 0 violation

---

## 7) Graphe des Dépendances et Hotspots

### Cycles détectés

| Chemin                                                      | Impact                              | Priorité | Statut              |
| ----------------------------------------------------------- | ----------------------------------- | -------- | ------------------- |
| ~~`lib/assistant/factory.ts` → `app/actions/assistant.ts`~~ | ~~Inversion de dépendance lib→app~~ | ~~P0~~   | ✅ **RÉSOLU (PR1)** |

### Imports cross-layer interdits détectés

| Fichier source                                  | Import interdit                                                   | Type de violation    | Statut        |
| ----------------------------------------------- | ----------------------------------------------------------------- | -------------------- | ------------- |
| ~~`src/lib/assistant/factory.ts:8`~~            | ~~`@/app/actions/assistant`~~                                     | ~~lib → app~~        | ✅ **RÉSOLU** |
| ~~`src/lib/assistant/router/router.ts:12`~~     | ~~`@/components/projects/types`~~                                 | ~~lib → components~~ | ✅ **RÉSOLU** |
| ~~`src/lib/assistant/router/router.ts:13`~~     | ~~`@/components/assistant/types`~~                                | ~~lib → components~~ | ✅ **RÉSOLU** |
| ~~`src/lib/assistant/router/router.ts:27`~~     | ~~`@/components/assistant/utils/filterProjects`~~                 | ~~lib → components~~ | ✅ **RÉSOLU** |
| ~~`src/lib/assistant/router/types.ts:6-7`~~     | ~~`@/components/projects/types`, `@/components/assistant/types`~~ | ~~lib → components~~ | ✅ **RÉSOLU** |
| ~~`src/lib/assistant/tools/tool-helpers.ts:7`~~ | ~~`@/components/projects/types`~~                                 | ~~lib → components~~ | ✅ **RÉSOLU** |

**Vérification automatisée** :

```bash
$ npm run check:boundaries
✅ No layer boundary violations
```

### Top 20 fichiers les plus importés

| Rank | Path                        | Count | Rôle                                         |
| ---- | --------------------------- | ----- | -------------------------------------------- |
| 1    | `@/lib/logger`              | 134   | Logging                                      |
| 2    | `@/lib/prisma`              | 117   | Data access                                  |
| 3    | `@/lib/api/responseHelpers` | 58    | API responses                                |
| 4    | `@/lib/api/errorHandler`    | 58    | Error handling                               |
| 5    | `@/lib/utils/types`         | 34    | Types partagés                               |
| 6    | `@/lib/domain/projects`     | 34+   | **Types projet (nouvelle source canonique)** |
| 7    | `@/lib/api/fetchWithAuth`   | 27    | HTTP client                                  |
| 8    | `@/components/ui/Button`    | 23    | UI component                                 |
| 9    | `@/lib/utils/cn`            | 17    | Class names                                  |
| 10   | `@/lib/utils/arrayHelpers`  | 17    | Array utils                                  |

### Top 10 fichiers qui importent le plus

| Rank | Path                    | Lines        | Imports estimés | Analyse                         |
| ---- | ----------------------- | ------------ | --------------- | ------------------------------- |
| 1    | ~~`router.ts`~~         | ~~1114~~ 238 | ~5              | ✅ Refactoré (PR5)              |
| 2    | `assistant.ts` (action) | 530          | ~15             | Monolithe - à découper          |
| 3    | `auth.config.ts`        | 505          | ~10             | Callbacks complexes             |
| 4    | `ProjectAssistant.tsx`  | 682          | ~12             | Déjà refactoré mais encore gros |
| 5    | `useAssistantChat.ts`   | 416          | ~10             | Hook complexe                   |
| 6    | `soundcloud.ts`         | 1200+        | ~8              | Service monolithe               |

---

## 8) PR5 — Découpage du Router ✅ TERMINÉ

**Fichier de référence** : [`docs/PR5_ROUTER_REFACTOR_PLAN.md`](./PR5_ROUTER_REFACTOR_PLAN.md)

### Résultat Final

Le fichier `src/lib/assistant/router/router.ts` a été refactoré de **1114 lignes à 238 lignes** :

> **Note métrique** : La baseline « 1114 lignes » correspond à l'état juste avant PR5 (post PR1–PR4). Le fichier avait historiquement atteint ~1450 lignes sur une version antérieure.

| Module créé                 | Lignes | Fonctions extraites                                                                                                                                                       |
| --------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `filter-helpers.ts`         | 200    | `applyProjectFilterAndSort`, `calculateAffectedProjects`, `isFilterEmpty`, `isScopingFilter`, `summarizeFilter`                                                           |
| `action-helpers.ts`         | 178    | `generateActionId`, `generateProjectPreviewDiff`, `buildActionDescription`                                                                                                |
| `groq-client.ts`            | 87     | `callGroqApi`                                                                                                                                                             |
| `router-handlers.ts`        | 964    | `handleListCommand`, `handleCreateCommand`, `handleUpdateCommand`, `handleDetailIntent`, `handleConversationalQuery`, `isCapabilitiesQuestion`, `getCapabilitiesResponse` |
| `router.ts` (orchestrateur) | 238    | `routeProjectCommand` (réduit)                                                                                                                                            |

### Tests (74 tests, 7 suites) ✅

```
src/lib/assistant/router/__tests__/
├── router.test.ts                    # Tests principaux
├── router.conflict-detection.test.ts # Détection de conflits
├── router.details-after-list.test.ts # Détails après listing
├── router.guardrail.test.ts          # Guardrails de sécurité
├── router.mutations-after-list.test.ts # Mutations après listing
├── router.sequences.test.ts          # Séquences de commandes
└── isScopingFilter.test.ts           # Tests isScopingFilter
```

### Validation

| Critère                | Statut       |
| ---------------------- | ------------ |
| Tests passent          | ✅ 4323/4323 |
| TypeScript compile     | ✅           |
| Layer boundaries       | ✅           |
| API publique préservée | ✅           |

---

## 9) PR6 — Découpage de router-handlers.ts 📋 PLANIFIÉ

### Objectif

Réduire `router-handlers.ts` de **964 lignes à ~100 lignes** (barrel + types partagés).

### Structure Cible

```
src/lib/assistant/router/handlers/
├── index.ts              # Barrel exports
├── types.ts              # RouterHandlerContext, ScopeResult, etc.
├── list.ts               # handleListCommand (~100 lignes)
├── update.ts             # handleUpdateCommand (~500 lignes)
├── create.ts             # handleCreateCommand (~60 lignes)
├── details.ts            # handleDetailIntent (~110 lignes)
├── conversational.ts     # handleConversationalQuery (~30 lignes)
└── capabilities.ts       # isCapabilitiesQuestion, getCapabilitiesResponse (~60 lignes)
```

### Mapping Fonctions → Fichiers

| Fonction                                                       | Lignes Source | Destination                  |
| -------------------------------------------------------------- | ------------- | ---------------------------- |
| `ScopeResult`, `DetailIntentResult`, `DETAILED_FIELDS_TO_SHOW` | 42-70         | `handlers/types.ts`          |
| `handleDetailIntent`                                           | 79-188        | `handlers/details.ts`        |
| `isCapabilitiesQuestion`                                       | 193-222       | `handlers/capabilities.ts`   |
| `getCapabilitiesResponse`                                      | 227-253       | `handlers/capabilities.ts`   |
| `handleConversationalQuery`                                    | 258-288       | `handlers/conversational.ts` |
| `handleCreateCommand`                                          | 293-356       | `handlers/create.ts`         |
| `handleListCommand`                                            | 361-461       | `handlers/list.ts`           |
| `handleUpdateCommand`                                          | 466-964       | `handlers/update.ts`         |

### Invariants Préservés

1. **API publique inchangée**: Toutes les fonctions gardent la même signature
2. **Tests existants passent**: Aucun mock à modifier (re-exports conservés)
3. **Layering respecté**: Pas de nouveaux imports lib→app

---

## 10) Problèmes Restants (avec preuves)

### P1-1: Console logging anarchique

**Preuve** :

```bash
$ grep -rn "console\." src --include="*.ts" | grep -v eslint-disable | wc -l
593
```

**Impact** : Logs non structurés, pas de niveaux, fuites PII potentielles, pas de corrélation.

**Solution** : Script de migration `console.*` → `logger.*`. Ajouter lint rule `no-console`.

---

### P1-2b: Process.env hors lib/env

**Preuve** :

```bash
$ grep -rn "process\.env\." src --include="*.ts" | grep -v "src/lib/env/" | wc -l
455
```

**Impact** : Configuration éparpillée, pas de validation centralisée.

**Solution** : Migration progressive vers `serverEnv` par module.

---

### P1-3: TODO orphelins non résolus

**Preuve** :

```typescript
// src/lib/assistant/memory/stores/StoreFactory.ts:79
// TODO: Implémenter RedisConversationMemoryStore

// src/lib/assistant/rate-limit/SessionRateLimiter.ts:231
// TODO: Implémenter avec Redis INCR + EXPIRE
```

**Impact** : Features annoncées mais pas implémentées, fallback non testé.

**Solution** : Tracker en issues GitHub ou supprimer si non prioritaire.

---

### P2-1: SoundCloud service monolithe

**Preuve** :

```bash
$ wc -c src/lib/services/soundcloud.ts
41312
```

**Impact** : Difficile à maintenir, test coverage potentiellement faible.

**Solution** : Découper en modules (auth, player, search, embed).

---

## 11) Plan de Refactor Priorisé (mis à jour)

### P0: Risques prod / Couplage dangereux

| ID   | Action                          | ROI | Risque | Effort | Statut              |
| ---- | ------------------------------- | --- | ------ | ------ | ------------------- |
| P0-1 | Supprimer/déplacer `factory.ts` | ★★★ | Faible | 1h     | ✅ **RÉSOLU (PR1)** |
| P0-2 | Déplacer types vers lib         | ★★★ | Moyen  | 2h     | ✅ **RÉSOLU (PR2)** |

### P1: Simplification structure / Boundaries

| ID    | Action                         | ROI | Risque | Effort | Statut                          |
| ----- | ------------------------------ | --- | ------ | ------ | ------------------------------- |
| P1-1  | Migration console._ → logger._ | ★★☆ | Faible | 4h     | 🔴 À faire                      |
| P1-2  | Centraliser env vars (base)    | ★★★ | Moyen  | 3h     | ✅ **Base créée (PR4)**         |
| P1-2b | Migration process.env restants | ★★☆ | Faible | 4h     | 🟡 **En cours (~455 restants)** |
| P1-3  | Découper router.ts             | ★★☆ | Moyen  | 8h     | ✅ **RÉSOLU (PR5)**             |
| P1-4  | ESLint boundaries + scripts    | ★★★ | Faible | 2h     | ✅ **RÉSOLU (PR3)**             |
| P1-5  | Résoudre TODOs                 | ★☆☆ | Faible | 2h     | 🔴 À faire                      |

### P2: Qualité long terme

| ID       | Action                                | ROI | Risque | Effort | Statut          |
| -------- | ------------------------------------- | --- | ------ | ------ | --------------- |
| P2-1     | Découper soundcloud.ts                | ★☆☆ | Faible | 4h     | 🔴 À faire      |
| P2-2     | Documentation ADR                     | ★★☆ | Nul    | 2h     | 🔴 À faire      |
| **P2-3** | **Découper router-handlers.ts (PR6)** | ★★☆ | Faible | 4h     | 📋 **Planifié** |

---

## 12) Checklist PR "Anti-Multiprise"

Avant chaque merge, vérifier :

- [x] **1. Pas d'import lib → app** : `npm run check:boundaries` (ESLint) = ✅
- [x] **2. Pas d'import lib → components (sauf re-exports)** : Vérifié via ESLint `import/no-restricted-paths`
- [ ] **3. Nouveaux console._ → logger._** : `git diff --name-only | xargs grep "console\." | wc -l`
- [ ] **4. Types explicites** : Pas de `: any` ajouté sans `eslint-disable` justifié
- [ ] **5. Tests ajoutés** : Coverage ne baisse pas
- [x] **6. Env vars centralisées (nouvelles)** : Nouvelles vars ajoutées dans `lib/env/server.ts`
- [ ] **6b. Migration process.env** : Réduire les `process.env` directs hors `src/lib/env/**`
- [ ] **7. Pas de TODO sans ticket** : Tous les TODO ont une issue GitHub liée
- [ ] **8. Fichiers < 500 lignes** : Nouveaux fichiers ne dépassent pas 500 LOC
- [ ] **9. Pas de @ts-ignore** : Utiliser `@ts-expect-error` avec commentaire
- [x] **10. Build + Tests passent** : `npm run check:all` success

---

## 13) Commandes de Validation

```bash
# TypeScript compilation
npx tsc --noEmit --skipLibCheck

# Layer boundaries
npm run check:boundaries

# Suite complète (lint + typecheck + tests + boundaries)
npm run check:all

# Tests spécifiques router
npm run test -- --testPathPattern="src/lib/assistant/router"
```

---

## Annexes

### A. Statistiques du codebase

| Métrique              | Valeur  |
| --------------------- | ------- |
| Fichiers TypeScript   | 874     |
| Lignes de code (src/) | 178,454 |
| Tests                 | 4,323   |
| Suites de tests       | 317     |
| Coverage (statements) | 66.41%  |
| Coverage (branches)   | 54.57%  |
| Coverage (functions)  | 60.50%  |
| Coverage (lines)      | 67.08%  |
| Modèles Prisma        | 24      |
| API routes            | ~100+   |

### B. Dépendances critiques

| Package        | Version        | Usage            |
| -------------- | -------------- | ---------------- |
| next           | ^16.0.7        | Framework        |
| next-auth      | ^5.0.0-beta.30 | Auth (BETA!)     |
| @prisma/client | ^7.0.1         | ORM              |
| ai             | ^5.0.110       | AI SDK           |
| zod            | ^3.24.3        | Validation       |
| zustand        | ^4.5.7         | State management |

### C. Risque next-auth beta

⚠️ **next-auth v5 est en beta** - Risque de breaking changes. Surveiller les releases.

### D. Fichiers clés créés/modifiés par PR1–PR5

| PR      | Fichiers créés/modifiés                                                                                                                             |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| **PR1** | Suppression/refactoring de `factory.ts` et imports lib→app                                                                                          |
| **PR2** | `src/lib/domain/projects/{index,types,filters,filter-projects}.ts`                                                                                  |
| **PR2** | Mise à jour re-exports: `src/components/projects/types.ts`, `src/components/assistant/types.ts`, `src/components/assistant/utils/filterProjects.ts` |
| **PR3** | `package.json` (scripts check:boundaries, check:all)                                                                                                |
| **PR4** | `src/lib/env/server.ts`, `src/lib/env/index.ts`                                                                                                     |
| **PR5** | `src/lib/assistant/router/{filter-helpers,action-helpers,groq-client,router-handlers}.ts`                                                           |
| **PR5** | Refactoring `router.ts` (1114 → 238 lignes)                                                                                                         |

---

### E. Hotspots actuels (post-PR5)

| Fichier                 | Lignes | Priorité | Action recommandée                      |
| ----------------------- | ------ | -------- | --------------------------------------- |
| `router-handlers.ts`    | 964    | P2       | PR6 : découpage en handlers individuels |
| `assistant.ts` (action) | 530    | P2       | Découpage futur                         |
| `ProjectAssistant.tsx`  | 682    | P3       | Extraction composants                   |
| `soundcloud.ts`         | 1200+  | P3       | Découpage modules                       |

### F. Prochaines PRs recommandées

1. **P1-1** : Migration `console.*` → `logger.*`
2. **P1-2b** : Migration `process.env` restants (~455)
3. **PR6** : Découpage `router-handlers.ts` en handlers individuels
