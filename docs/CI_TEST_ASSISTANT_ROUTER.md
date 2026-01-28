# Tests Assistant Router - CI Ready

## Script de test

```bash
pnpm run test:assistant-router
```

## Temps d'exécution

- **Temps moyen** : ~0.8-1.0 secondes
- **Temps maximum observé** : ~1.2 secondes
- **Nombre de tests** : 28 tests (3 suites)

## Suites de tests incluses

1. `router.mutations-after-list.test.ts` (17 tests)
   - Matrice complète de tests pour mutations après LIST filtré
   - Vérifie que les filtres explicites priment sur LastListedIds
   - Tests pour Progress, Statut, Labels, Style/Collab, Notes, Deadline

2. `handleConfirmUpdate.test.ts` (7 tests)
   - Tests d'intégration pour la persistance des mutations
   - Vérifie que projectIds vs filters sont utilisés correctement selon scopeSource

3. `batch-update/route.test.ts` (4 tests)
   - Tests de sécurité de l'API batch-update
   - Vérifie que l'API refuse les requêtes sans scope

## Recommandation CI

✅ **Prêt pour CI obligatoire**

- Temps d'exécution très bas (< 1.5s)
- Tests critiques pour le cœur "routing + scope + persist contract"
- Pas de dépendances externes (mocks complets)
- Tests déterministes (pas de flakiness observée)

### Exemple d'intégration CI

```yaml
# GitHub Actions
- name: Test Assistant Router (must pass)
  run: pnpm run test:assistant-router
  timeout-minutes: 2

# GitLab CI
test:assistant-router:
  script:
    - pnpm run test:assistant-router
  timeout: 2m
```

## Tests supplémentaires (optionnels)

### Test de snapshot NLP

```bash
pnpm test -- src/lib/assistant/query-parser/__tests__/detect-filters-canonical.test.ts
```

- **Temps d'exécution** : ~0.6 secondes
- **Nombre de tests** : 33 tests
- **Objectif** : Empêcher les régressions linguistiques dans `detectFilters()`
- **Recommandation** : Peut être ajouté en CI si nécessaire (non bloquant)

### Test de garde-fou

```bash
pnpm test -- src/lib/assistant/router/__tests__/router.guardrail.test.ts
```

- **Temps d'exécution** : ~0.7 secondes
- **Nombre de tests** : 3 tests
- **Objectif** : Vérifier que le routeur gère correctement les cas edge (LastListedIds vide)
- **Recommandation** : Peut être inclus dans `test:assistant-router` si souhaité

## Maintenance

Ces tests doivent passer à chaque PR. Si un test échoue :

1. **Ne pas skip le test** - corriger la cause racine
2. **Vérifier les logs** - les messages d'erreur sont détaillés
3. **Utiliser ASSISTANT_TEST_DEBUG=true** pour diagnostiquer :
   ```bash
   ASSISTANT_TEST_DEBUG=true pnpm run test:assistant-router
   ```

## Historique

- **Créé** : 2025-01-13
- **Dernière mise à jour** : 2025-01-13
- **Statut** : ✅ Production ready
