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
| Avertissements ESLint + SonarJS     | 316 (0 erreur), contre 1 483 | Deux règles seulement, voir ci-dessous  |
| Fonctions trop complexes            | 140 au-dessus du seuil de 15 | Le vrai chantier restant                |
| Tests                               | 4 507 jest, 14 Playwright    | Jest gonflé par des tests de couverture |

Note estimée : **7,5/10** (6 le 04/11/2026). Objectif : 8/10. Effets React, dépendances de hooks,
accessibilité clavier, `any`, regex à risque et code mort sont réglés, Playwright tourne en CI, et les
routes API les plus complexes sont découpées. Pour atteindre 8, il reste les 12 fonctions de 50 à 79
ci-dessous.

## Chantiers, par priorité

### 1. Fonctions géantes (complexité cognitive, seuil 15)

Répartition : 1 fonction à 80 ou plus, 12 de 50 à 79, 27 de 30 à 49, 100 de 16 à 29. Les 100 dernières
ne sont pas urgentes : viser d'abord les 12 de 50 à 79.

| Complexité | Fichier                                                                   |
| ---------- | ------------------------------------------------------------------------- |
| 79, 71     | `(home)/components/HeroSection.tsx`, `VisualizerSection.tsx`              |
| 67         | `lib/assistant/query-parser/updates/deadline-updates.ts`                  |
| 65         | `lib/assistant/parsers/status-detector.ts`                                |
| 60         | `lib/assistant/query-parser/updates.ts`                                   |
| 58         | `lib/assistant/conversational/groq-responder.ts`                          |
| 56         | `lib/utils/parseExcelData.ts`, `lib/assistant/router/handlers/update.ts`  |
| 55         | `components/projects/EditableCell.tsx`                                    |
| 52         | `lib/assistant/query-parser/updates/progress-updates.ts`                  |
| 50         | `lib/assistant/router/action-helpers.ts`, `useBatchedInventoryActions.ts` |

Cas à part : `lib/services/soundcloud/scrapeTracksPage.ts` (139). Ce code s'exécute dans le navigateur
de Puppeteer (fonctions sérialisées), n'a aucun test et dépend du HTML de SoundCloud. Il ne faut le
découper qu'avec une page de référence enregistrée pour le tester, sinon le risque dépasse le gain.

`HeroSection` et `VisualizerSection` doivent leur complexité aux variantes d'interface dans le JSX :
à traiter quand une des variantes (legacy, v2, v3) disparaîtra.

Découpés les 06/11/2026 sans changement de comportement voulu, et sous le seuil ou presque :
`actions/assistant.ts` (194), `query-parser/filters.ts` (144), `projects/batch-update` (137),
`live/inventory/batch` (106), `admin/sentry/status` (101), `memory-manager` (98),
`handleConfirmUpdate` (75), `upload` (73), `admin/inventory/batch` (72), `auth.config.ts` (72),
`query-parser/index.ts` (70), `projects/[id]` et `events/[id]` (64). Le modèle à suivre : une étape par
fonction, le gestionnaire ne fait plus que les enchaîner. `auth.config.ts` garde deux callbacks à
découper (`session` à 42, `jwt` à 24).

### 2. Assistant IA : parseur à expressions régulières

`src/lib/assistant/query-parser/` concentre encore beaucoup de fonctions complexes (`updates/*`,
`creates.ts`). Les regex à risque sont corrigées, et les messages limités à
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
- `sonarjs/no-nested-conditional` (176) : ternaires imbriqués dans le JSX, une question de lisibilité
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
