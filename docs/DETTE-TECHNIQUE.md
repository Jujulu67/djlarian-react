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
| Avertissements ESLint + SonarJS     | 307 (0 erreur), contre 1 483 | Deux règles seulement, voir ci-dessous  |
| Fonctions trop complexes            | 131 au-dessus du seuil de 15 | Le vrai chantier restant                |
| Tests                               | 4 507 jest, 14 Playwright    | Jest gonflé par des tests de couverture |

Note estimée : **8/10** (6 le 04/11/2026). Ce n'était qu'une estimation : la première mesure
SonarCloud (07/11/2026, `src/` hors tests) donnait maintenabilité **A** (dette 0,4 %), mais sécurité **D**
et fiabilité **D**. Corrigé le jour même (PR #55 à #58) : les 23 points de sécurité, les problèmes graves
et 382 problèmes moyens de fiabilité. 30 regex du parseur de l'assistant sont « acceptées » (entrée
bornée à 2 000 caractères, `redos.test.ts`) et 7 points de `globals.css` marqués faux positifs
(`@utility` de Tailwind v4). Tableau de bord :
https://sonarcloud.io/summary/overall?id=Jujulu67_djlarian-react. Effets React, dépendances de hooks, accessibilité clavier, `any`, regex à risque et code
mort sont réglés, Playwright tourne en CI, et il ne reste que 3 fonctions au-dessus de 50 de complexité,
laissées de côté pour des raisons précises (voir ci-dessous).

**Mesure SonarCloud du 08/11/2026** (après les PR #61 à #67) : sécurité, fiabilité et maintenabilité **A**,
dette 0,0 %, duplication 2,0 %, 2 remarques ouvertes (1 094 au début de la journée). Environ 400 remarques
sont marquées « Accepted », chacune avec sa justification en commentaire dans SonarCloud : regex du parseur
de l'assistant (entrée bornée à 2 000 caractères, `redos.test.ts`), `!important` volontaires, traitements
séquentiels voulus, listes positionnelles, cartes cliquables contenant d'autres contrôles.

Dette réelle restante : les 2 remarques de complexité de `src/lib/services/soundcloud/scrapeTracksPage.ts`
(l'une à 134). Ce code s'exécute dans le navigateur via `page.evaluate` et n'a aucun test : le découper
demande d'abord un test sur un vrai navigateur. Elles restent ouvertes volontairement.

## Chantiers, par priorité

### 1. Fonctions complexes (complexité cognitive, seuil 15)

Répartition : 1 fonction à 80 ou plus, 2 de 50 à 79, 27 de 30 à 49, 101 de 16 à 29.

Les 3 plus complexes sont laissées de côté volontairement :

- `lib/services/soundcloud/scrapeTracksPage.ts` (139) : s'exécute dans le navigateur de Puppeteer
  (fonctions sérialisées), sans aucun test, et dépend du HTML de SoundCloud. À découper seulement avec
  une page de référence enregistrée pour le tester.
- `(home)/components/HeroSection.tsx` (79) et `VisualizerSection.tsx` (71) : leur complexité vient des
  variantes d'interface (legacy, v2, v3) dans le JSX. Elle baissera quand une variante disparaîtra.

Suite logique, de 30 à 49 :

| Complexité | Fichier                                                |
| ---------- | ------------------------------------------------------ |
| 48         | `lib/assistant/query-parser/updates/status-updates.ts` |
| 46         | `admin/live/hooks/useAdminLiveActions.ts`              |
| 45         | `components/projects/ProjectNoteEditor.tsx`            |
| 44         | `query-parser/creates.ts`, `api/admin/config/history`  |
| 43         | `components/ProjectAssistant.tsx`                      |
| 42         | `auth.config.ts` (callback `session`)                  |
| 41         | `query-parser/updates/metadata-updates.ts`             |

Modèle à suivre, appliqué le 06/11/2026 à une vingtaine de fonctions (routes API, parseur de
l'assistant, Groq, import Excel) : une étape par fonction, le gestionnaire ne fait que les enchaîner.

### 2. Assistant IA : parseur à expressions régulières

`src/lib/assistant/query-parser/` garde quelques fonctions complexes (`updates/status-updates.ts`, `creates.ts`). Les regex à risque sont corrigées, et les messages limités à
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
SonarCloud analyse automatiquement chaque push sur `main` et chaque PR (périmètre :
`.sonarcloud.properties`). Pour y ajouter la couverture, passer à l'analyse par la CI : désactiver
« Automatic Analysis », puis définir le secret `SONAR_TOKEN` ; le job « Tests » utilise alors
`sonar-project.properties`.
