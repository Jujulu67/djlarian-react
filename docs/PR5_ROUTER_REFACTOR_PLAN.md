# PR5: Découpage de `src/lib/assistant/router/router.ts`

## Contexte

Le fichier `router.ts` fait actuellement **1452 lignes** et contient plusieurs responsabilités distinctes qui devraient être séparées pour améliorer la maintenabilité.

## Structure Actuelle (fonctions)

| Fonction                     | Lignes   | Responsabilité                        |
| ---------------------------- | -------- | ------------------------------------- |
| `applyProjectFilterAndSort`  | 31-72    | Filtrage et tri des projets           |
| `calculateAffectedProjects`  | 74-80    | Calcul des projets affectés           |
| `isFilterEmpty`              | 82-124   | Validation des filtres                |
| `isScopingFilter`            | 126-187  | Validation des filtres scoping        |
| `summarizeFilter`            | 189-215  | Résumé des filtres pour logs          |
| `generateActionId`           | 217-222  | Génération d'ID                       |
| `callGroqApi`                | 224-289  | Appel API Groq                        |
| `generateProjectPreviewDiff` | 291-385  | Génération de diff                    |
| `buildActionDescription`     | 387-448  | Construction de description           |
| `routeProjectCommand`        | 450-1452 | **Logique principale (~1000 lignes)** |

## Plan de Découpage

### 1. `filter-helpers.ts` (~160 lignes)

Fonctions de manipulation de filtres:

- `applyProjectFilterAndSort`
- `calculateAffectedProjects`
- `isFilterEmpty`
- `isScopingFilter` (exportée)
- `summarizeFilter`

### 2. `action-helpers.ts` (~170 lignes)

Fonctions d'aide aux actions:

- `generateActionId`
- `generateProjectPreviewDiff`
- `buildActionDescription`

### 3. `groq-client.ts` (~70 lignes)

Client API Groq:

- `callGroqApi`

### 4. `router.ts` révisé (~1000 lignes → objectif ~500 lignes)

Découper `routeProjectCommand` en sous-fonctions:

- `handleListCommand` - Logique de listing
- `handleCreateCommand` - Logique de création
- `handleUpdateCommand` - Logique de modification
- `handleDetailsRequest` - Logique de détails
- `handleConversationalQuery` - Logique conversationnelle
- `determineScope` - Détermination du scope d'action

## Étapes d'Implémentation

1. **Créer `filter-helpers.ts`**
   - Extraire les 5 fonctions
   - Mettre à jour les exports
   - Mettre à jour les imports dans router.ts

2. **Créer `action-helpers.ts`**
   - Extraire les 3 fonctions
   - Mettre à jour les exports
   - Mettre à jour les imports dans router.ts

3. **Créer `groq-client.ts`**
   - Extraire `callGroqApi`
   - Mettre à jour les imports dans router.ts

4. **Découper `routeProjectCommand`**
   - Identifier les blocs logiques
   - Extraire en sous-fonctions
   - Maintenir l'API publique inchangée

5. **Validation**
   - `npm test` - Tous les 4323 tests doivent passer
   - `npx tsc --noEmit` - Pas d'erreurs TypeScript
   - `npm run check:boundaries` - Pas de violations de layering

## Constraints

- **API publique inchangée**: `routeProjectCommand` et `isScopingFilter` doivent garder la même signature
- **Tests non modifiés**: Les tests existants doivent continuer à fonctionner
- **Imports à jour**: Les tests qui mockent des modules doivent être mis à jour

## Priorité

Cette PR est **P1** (priorité 1 mais pas critique). Elle peut être effectuée après vérification que toutes les autres PRs sont stables.
