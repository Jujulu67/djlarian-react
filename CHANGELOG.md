# Changelog

Toutes les modifications notables de ce projet seront documentées dans ce fichier.

Le format est basé sur [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/),
et ce projet adhère au [Semantic Versioning](https://semver.org/lang/fr/).

## [Non versionné]

### Ajouté

- Tests de séquences réalistes (`router.sequences.test.ts`) pour valider le "working set" et la mémoire de travail dans un flux réel
- Tests garde-fous (`router.guardrail.test.ts`) pour empêcher les mutations sans scope explicite
- Fichier de mocks partagés (`router-test-mocks.ts`) pour centraliser les mocks Jest du router assistant
- Configuration Jest globale (`jest.setup.ts`) pour centraliser les mocks Next.js et APIs navigateur

### Modifié

- `test:assistant-router` : Ajout des tests `router.sequences.test.ts` et `router.guardrail.test.ts` au script de test critique
- `jest.config.cjs` : Utilise maintenant `jest.setup.ts` au lieu de `jest.setup.js`
- `router.sequences.test.ts` :
  - Utilisation des mocks partagés (suppression de la duplication)
  - Ajout de `resetTestProjectFactory()` dans `beforeEach`
  - Correction des datasets pour créer suffisamment de projets avec les bonnes propriétés
- `router.guardrail.test.ts` :
  - Utilisation des mocks partagés (suppression de la duplication)
  - Ajout de `resetTestProjectFactory()` dans `beforeEach`
  - Mise à jour des assertions pour vérifier `GENERAL` avec `scope_missing` au lieu d'`UPDATE`

### Corrigé

- Tests flaky : Les tests de séquences et garde-fous passent maintenant de manière stable et déterministe
- Duplication de mocks : Centralisation des mocks Jest dans `router-test-mocks.ts` et `jest.setup.ts`
- Datasets incorrects : Correction pour garantir que les IDs listés correspondent aux projets créés

### Performance

- Temps d'exécution `test:assistant-router` : 1.244s (Jest) - dans le sweet spot < 2s

### Tests

- ✅ `router.sequences.test.ts` : 3 tests passent
- ✅ `router.guardrail.test.ts` : 2 tests passent
- ✅ `router.mutations-after-list.test.ts` : 32 tests passent (inchangé)
- ✅ `handleConfirmUpdate.test.ts` : passe (inchangé)
- ✅ `batch-update route.test.ts` : passe (inchangé)
- ✅ Total `test:assistant-router` : 37 tests passent (5 fichiers)

### Infrastructure

- Workflow GitHub Actions `.github/workflows/test-assistant-router.yml` : Vérifié et cohérent avec le script `test:assistant-router` mis à jour
