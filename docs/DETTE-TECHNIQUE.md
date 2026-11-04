# Dette technique : état des lieux

Mesuré le 04/11/2026. Relancer les mesures avec `pnpm debt` (ou une commande à la fois, voir
« Outils » en bas). Mettre ce fichier à jour quand un chantier avance.

## Vue d'ensemble

| Indicateur                          | Valeur                       | Lecture                                 |
| ----------------------------------- | ---------------------------- | --------------------------------------- |
| Code applicatif (`src`, hors tests) | ~118 000 lignes              |                                         |
| Duplication (jscpd)                 | 2,0 %                        | Bon (alerte au-delà de 5 %)             |
| Imports circulaires (madge)         | 0                            | Bloqué en CI                            |
| Fichiers / dépendances morts (knip) | 0                            | Bloqué en CI                            |
| Exports jamais utilisés (knip)      | 22 exports, 9 types          | Petit nettoyage                         |
| Avertissements ESLint + SonarJS     | 1 483 (0 erreur)             | Voir le détail ci-dessous               |
| Fonctions trop complexes            | 151 au-dessus du seuil de 15 | Le vrai chantier                        |
| Tests                               | 4 456 jest, 14 Playwright    | Jest gonflé par des tests de couverture |

Note estimée : **6/10** (5,5 avant les nettoyages du 04/11/2026). Base saine (types, sécurité,
routes API, pas de cycles, peu de duplication), mais des fichiers géants et très complexes, et
un assistant IA dont le parseur à regex est la plus grosse source de dette.

## Chantiers, par priorité

### 1. Assistant IA : parseur à expressions régulières (risque + complexité)

- `src/lib/assistant/query-parser/` concentre l'essentiel des alertes : 70 regex au coût
  super-linéaire (ReDoS possible), 92 classes de caractères en double, 128 regex trop
  complexes, et les fichiers les plus complexes du dépôt (`filters.ts`, `classifier.ts`,
  `creates.ts`, `updates/*`).
- Atténué le 04/11/2026 : messages limités à 2 000 caractères côté serveur
  (`src/lib/assistant/security/input-limits.ts`) et dans le champ de saisie.
- À faire : simplifier les regex signalées (`sonarjs/super-linear-regex`,
  `duplicates-in-character-class`), puis découper les fonctions géantes. À plus long terme, se
  demander si ce parseur reste utile à côté du modèle (Groq), qui sait déjà extraire filtres et
  mises à jour.

### 2. Fonctions géantes (complexité cognitive, seuil 15)

| Complexité | Fichier                                                               |
| ---------- | --------------------------------------------------------------------- |
| 193        | `src/app/actions/assistant.ts`                                        |
| 144        | `src/lib/assistant/query-parser/filters.ts`                           |
| 139        | `src/lib/services/soundcloud/scrapeTracksPage.ts`                     |
| 137        | `src/app/api/projects/batch-update/route.ts`                          |
| 106        | `src/app/api/live/inventory/batch/route.ts`                           |
| 101        | `src/app/api/admin/sentry/status/route.ts`                            |
| 98         | `src/lib/assistant/conversational/memory-manager.ts`                  |
| 79         | `src/app/(routes)/(home)/components/HeroSection.tsx`                  |
| 76         | `src/components/assistant/handlers/handleConfirmUpdate.ts`            |
| 72–73      | `upload/route.ts`, `admin/inventory/batch/route.ts`, `auth.config.ts` |

Plus gros fichiers : `LiveSubmissionForm.tsx` (952 lignes), `ProjectsClient.tsx` (798),
`batch-update/route.ts` (756), `gallery/page.tsx` (731). Découper en commençant par les routes
API (plus faciles à tester que les composants).

### 3. Effets React fragiles

- 51 `setState` appelés directement dans un `useEffect` (`react-hooks/set-state-in-effect`) :
  rendus en cascade, et souvent un état qui devrait être calculé plutôt que stocké.
- 22 dépendances d'effet manquantes (`react-hooks/exhaustive-deps`) : risque de valeurs
  périmées, comme le bug de pagination des images corrigé le 04/11/2026.
- Restent quelques minuteries « au jugé » (animations de mise en avant de 2 s côté projets, roue
  du live, machine à sous) : acceptables pour des animations, à surveiller ailleurs.

### 4. Code inutile mais inoffensif

- 446 variables ou imports inutilisés (`no-unused-vars`, `sonarjs/unused-import`) et 68
  affectations jamais lues (`no-dead-store`) : nettoyage mécanique, fichier par fichier.
- 22 exports et 9 types jamais utilisés : `pnpm debt:dead` les liste.
- 19 `catch` vides (`no-ignored-exceptions`) : au minimum un `logger.warn`.
- 15 `TODO` dans le code.

### 5. Accessibilité

58 éléments cliquables sans clavier ni rôle (`jsx-a11y/no-static-element-interactions`,
`click-events-have-key-events`), surtout des `div` avec `onClick` dans l'admin et les
mini-jeux. Les remplacer par des `button`.

### 6. Tests

- Une partie des tests jest a été écrite pour la couverture, pas pour le comportement (25
  fichiers testaient du code mort, supprimés le 04/11/2026). La couverture surestime donc la
  solidité réelle.
- Les tests Playwright (`e2e/`) couvrent maintenant les parcours de connexion et les pages
  publiques. À ajouter : création de projet, admin musique, live, boutique. Ils ne tournent pas
  encore en CI (il faudrait un service PostgreSQL dans le workflow).

### Bruit connu (à ne pas corriger)

- `sonarjs/pseudo-random` (83) : `Math.random()` dans les jeux et animations, sans enjeu de
  sécurité.
- `sonarjs/no-nested-conditional` (192) : ternaires imbriqués dans le JSX, une question de
  lisibilité plus que de bugs.

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
