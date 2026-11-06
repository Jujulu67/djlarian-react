# Dette technique : état des lieux

Mesuré le 06/11/2026 (branche `chore/debt-8`, [PR #45](https://github.com/Jujulu67/djlarian-react/pull/45)).
Relancer les mesures avec `pnpm debt` (ou une commande à la fois, voir « Outils » en bas). Mettre
ce fichier à jour quand un chantier avance.

## Vue d'ensemble

| Indicateur                          | Valeur                       | Lecture                                 |
| ----------------------------------- | ---------------------------- | --------------------------------------- |
| Code applicatif (`src`, hors tests) | ~113 000 lignes              |                                         |
| Duplication (jscpd)                 | 1,9 %                        | Bon (alerte au-delà de 5 %)             |
| Imports circulaires (madge)         | 0                            | Bloqué en CI                            |
| Fichiers / dépendances morts (knip) | 0                            | Bloqué en CI                            |
| Exports jamais utilisés (knip)      | 35 exports, 22 types         | Petit nettoyage                         |
| Avertissements ESLint + SonarJS     | 329 (0 erreur), contre 1 483 | Deux règles seulement, voir ci-dessous  |
| Fonctions trop complexes            | 146 au-dessus du seuil de 15 | Le vrai chantier restant                |
| Tests                               | 4 495 jest, 14 Playwright    | Jest gonflé par des tests de couverture |

Note estimée : **7/10** (6 le 04/11/2026). Objectif : 8/10. Effets React, dépendances de hooks,
accessibilité clavier, `any`, regex à risque et code mort sont réglés, et Playwright tourne en CI.
Pour atteindre 8, il reste à réduire les fonctions très complexes, surtout le parseur de l'assistant.

## Chantiers, par priorité

### 1. Fonctions géantes (complexité cognitive, seuil 15)

Répartition : 2 fonctions à 80 ou plus, 19 de 50 à 79, 27 de 30 à 49, 98 de 16 à 29. Les 98 dernières
ne sont pas urgentes : viser d'abord les 21 au-dessus de 50.

| Complexité | Fichier                                                               |
| ---------- | --------------------------------------------------------------------- |
| 144        | `src/lib/assistant/query-parser/filters.ts`                           |
| 139        | `src/lib/services/soundcloud/scrapeTracksPage.ts`                     |
| 79         | `src/app/(routes)/(home)/components/HeroSection.tsx`                  |
| 75         | `src/components/assistant/handlers/handleConfirmUpdate.ts`            |
| 72–73      | `upload/route.ts`, `admin/inventory/batch/route.ts`, `auth.config.ts` |
| 71         | `src/app/(routes)/(home)/components/VisualizerSection.tsx`            |
| 70         | `src/lib/assistant/query-parser/index.ts`                             |

Découpés le 06/11/2026 sans changement de comportement : `actions/assistant.ts` (194),
`projects/batch-update/route.ts` (137), `live/inventory/batch/route.ts` (106),
`admin/sentry/status/route.ts` (101), `conversational/memory-manager.ts` (98). Le modèle à suivre :
une étape par fonction, le gestionnaire ne fait plus que les enchaîner.

`admin/inventory/batch/route.ts` ressemble à la route du live : réutiliser le même découpage.

### 2. Assistant IA : parseur à expressions régulières

`src/lib/assistant/query-parser/` concentre encore les fonctions les plus complexes (`filters.ts`,
`index.ts`, `updates/*`, `creates.ts`). Les regex à risque sont corrigées, et les messages limités à
2 000 caractères (`src/lib/assistant/security/input-limits.ts`). À plus long terme, se demander si ce
parseur reste utile à côté du modèle (Groq), qui sait déjà extraire filtres et mises à jour.

### 3. Tests

- Une partie des tests jest a été écrite pour la couverture, pas pour le comportement (25 fichiers
  testaient du code mort, supprimés le 04/11/2026). La couverture surestime donc la solidité réelle.
- Les tests Playwright (`e2e/`) couvrent les parcours de connexion et les pages publiques, et tournent
  en CI contre une base PostgreSQL jetable. À ajouter : création de projet, admin musique, live,
  boutique.

### Exceptions assumées

- `react-hooks/set-state-in-effect` est désactivée pour les jeux et les lecteurs iframe : ces effets
  lancent des animations minutées ou pilotent un système externe (raison dans `eslint.config.mjs`).
- `sonarjs/pseudo-random` est désactivée pour les jeux et animations, sans enjeu de sécurité.
- `sonarjs/no-nested-conditional` (183) : ternaires imbriqués dans le JSX, une question de lisibilité
  plus que de bugs. À traiter au passage quand on découpe le composant, pas en chantier séparé.

## Outils

| Commande           | Outil            | Ce qu'il mesure                                 |
| ------------------ | ---------------- | ----------------------------------------------- |
| `pnpm debt`        | tous             | Les quatre ci-dessous à la suite                |
| `pnpm debt:dead`   | knip             | Fichiers, exports et dépendances inutilisés     |
| `pnpm debt:dup`    | jscpd            | Code copié-collé                                |
| `pnpm debt:cycles` | madge            | Imports circulaires                             |
| `pnpm debt:lint`   | ESLint + SonarJS | Bugs probables, complexité, regex, hooks, a11y  |
| `pnpm test:e2e`    | Playwright       | Parcours réels dans un navigateur (base locale) |

En CI : knip (fichiers et dépendances) et madge bloquent ; SonarJS reste en avertissement.
SonarCloud tourne dans le job « Tests » dès que le secret `SONAR_TOKEN` existe (voir
`sonar-project.properties`).
