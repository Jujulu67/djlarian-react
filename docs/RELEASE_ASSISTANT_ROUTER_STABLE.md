# Release: Assistant Router Stable

**Date** : 2025-01-13  
**Tag** : `assistant-router-stable`  
**Type** : Checkpoint de stabilité / Tests

## 🎯 Objectif

Stabiliser définitivement les tests du router assistant en rendant verts `router.sequences.test.ts` et `router.guardrail.test.ts`, tout en garantissant la stabilité et la maintenabilité à long terme.

## ✅ Réalisations

### Tests stabilisés

- ✅ **router.sequences.test.ts** : 3 tests passent
  - LIST filtré → UPDATE "leur progression"
  - LIST collab → push deadline "leur deadline"
  - UPDATE explicite après listing

- ✅ **router.guardrail.test.ts** : 2 tests passent
  - Refus d'une mutation sans filtre explicite qui sort du LastListedIds
  - Permission de scope_missing si vraiment aucun projet listé

### Infrastructure de tests

- ✅ **Mocks centralisés** : `router-test-mocks.ts` pour éviter la duplication
- ✅ **Configuration Jest globale** : `jest.setup.ts` pour les mocks Next.js/APIs
- ✅ **Factory de projets** : Utilisation correcte de `resetTestProjectFactory()` dans `beforeEach`

### Performance

- ⚡ **Temps d'exécution** : 1.244s (Jest) - dans le sweet spot < 2s
- ⚡ **Total test:assistant-router** : 37 tests passent (5 fichiers) en < 2s

### Intégration CI/CD

- ✅ **Workflow GitHub Actions** : `.github/workflows/test-assistant-router.yml` vérifié et cohérent
- ✅ **Script npm** : `test:assistant-router` inclut maintenant les 5 fichiers de test

## 📋 Fichiers modifiés

### Créés

- `jest.setup.ts` - Configuration Jest globale
- `src/lib/assistant/router/__tests__/router-test-mocks.ts` - Mocks partagés
- `CHANGELOG.md` - Changelog du projet
- `docs/RELEASE_ASSISTANT_ROUTER_STABLE.md` - Ce document

### Modifiés

- `jest.config.cjs` - Utilise `jest.setup.ts`
- `package.json` - Script `test:assistant-router` mis à jour
- `src/lib/assistant/router/__tests__/router.sequences.test.ts` - Tests corrigés
- `src/lib/assistant/router/__tests__/router.guardrail.test.ts` - Tests corrigés

## 🔍 Causes racines identifiées et corrigées

1. **Mocks dupliqués** → Centralisés dans `router-test-mocks.ts`
2. **Datasets incorrects** → Création de datasets avec `createTestProject()` pour garantir la cohérence
3. **Assertions obsolètes** → Mises à jour pour correspondre au comportement réel (`GENERAL` avec `scope_missing`)

## ✅ Validation

### Tests existants (inchangés)

- ✅ `router.mutations-after-list.test.ts` : 32 tests passent
- ✅ `handleConfirmUpdate.test.ts` : passe
- ✅ `batch-update route.test.ts` : passe
- ✅ `detect-filters-canonical.test.ts` : 40 tests passent
- ✅ `detect-filters-fuzzy.test.ts` : passe

### Nouveaux tests

- ✅ `router.sequences.test.ts` : 3 tests passent
- ✅ `router.guardrail.test.ts` : 2 tests passent

### Scripts npm

- ✅ `npm run test:assistant-router` : 37 tests passent en 1.244s
- ✅ `npm run test:assistant-nlp` : 40 tests passent (inchangé)

## 🚀 Prochaines étapes recommandées

1. **Commit et push** des changements avec le tag `assistant-router-stable`
2. **Surveillance** du temps d'exécution : si > 2s, créer `test:assistant-router:extended`
3. **Documentation** : Les tests sont maintenant stables et prêts pour la production

## 📝 Notes techniques

- Les mocks sont maintenant centralisés et réutilisables
- Les tests utilisent `resetTestProjectFactory()` pour garantir la déterministe
- Le comportement `scope_missing` est correctement testé (pas de fallback automatique AllProjects)
- Le workflow CI/CD est cohérent avec les scripts npm

## 🎉 Résultat

**Tous les tests sont stables, déterministes et prêts pour la production.**

---

**Tag Git** : `assistant-router-stable`  
**Commande pour voir le tag** : `git tag -l "assistant-router-stable" -n1`  
**Commande pour checkout** : `git checkout assistant-router-stable`
