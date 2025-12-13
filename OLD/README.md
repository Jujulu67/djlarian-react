# Version OLD - Assistant Monolithique

Ce dossier contient la version monolithique de l'assistant récupérée depuis le commit `cfe65e49c1007631965a8b6c1719db9c5f3ed519`.

## 📁 Structure

```
OLD/
  src/
    app/
      actions/
        assistant.ts                    # Version monolithique (875 lignes)
        __tests__/
          assistant.test.ts             # Tests unitaires
          integration-routing.test.ts   # Tests d'intégration
          integration-routing-complete.test.ts
          ASSISTANT_TEST_CASES.md       # Cas de test documentés
    components/
      ProjectAssistant.tsx              # Version monolithique (1949 lignes)
    lib/
      assistant/
        config.ts
        conversational/
          groq-responder.ts
          memory-manager.ts
          mode-inference.ts
        parsers/
          date-parser.ts
          deadline-detector.ts
          note-generator.ts
          progress-detector.ts
          status-detector.ts
          style-matcher.ts
          user-extractor.ts
        query-parser/
          classifier.ts
          creates.ts
          filters.ts
          index.ts
          updates.ts
          validation.ts
        security/
          user-permissions.ts
        tools/
          get-projects-tool.ts
          tool-helpers.ts
          update-projects-tool.ts
        types.ts
        prompts/
          system-discipline-prompt.ts
```

## 🎯 Objectif

Ces fichiers permettent de comparer le comportement de la version monolithique (OLD) avec la version refactorée (NEW) pour s'assurer que le refactor conserve 100% du comportement.

## ⚠️ Important

- **NE PAS MODIFIER** les fichiers dans OLD/ sauf si absolument nécessaire pour la compilation
- Les fichiers OLD sont des **snapshots** de l'ancien commit
- Si des corrections sont nécessaires, les documenter dans ce README
- Les imports dans OLD pointent vers `@/lib/assistant/...` qui résout vers `src/lib/assistant/`, pas `OLD/src/lib/assistant/`
  - Cela peut causer des problèmes si les modules ont changé
  - L'adapter `src/app/actions/assistant-old-adapter.ts` gère ces cas

## 🔄 Utilisation

### Basculer entre OLD et NEW

1. Ouvrir l'assistant dans l'UI
2. Cliquer sur le bouton "OLD" ou "NEW" dans le header de l'assistant
3. Le choix est sauvegardé dans `localStorage` (clé: `assistant-version`)
4. Par défaut: **NEW** (version refactorée)

### Tester les deux versions

Pour comparer le comportement:

1. Tester une commande avec la version NEW
2. Basculer vers OLD
3. Tester la même commande
4. Comparer les résultats

## 🐛 Problèmes connus

### Imports incompatibles

Les fichiers OLD utilisent des imports avec `@/` qui pointent vers les modules actuels (`src/lib/assistant/`), pas vers `OLD/src/lib/assistant/`.

**Impact:** Si les modules dans `src/lib/assistant/` ont changé de signature ou n'existent plus, la version OLD peut ne pas fonctionner correctement.

**Exemple d'erreur observée:**

```
tool call validation failed: parameters for tool updateProjects did not match schema:
errors: [additionalProperties 'progression', 'status', 'projets' not allowed]
```

Cette erreur se produit parce que:

- La version OLD charge `@/lib/assistant/tools/update-projects-tool` (version actuelle)
- Le schéma de `updateProjects` a changé entre OLD et NEW
- L'IA dans OLD essaie d'utiliser l'ancien format qui n'est plus valide

**Solution actuelle:** L'adapter `src/app/actions/assistant-old-adapter.ts` tente de charger la version OLD et retourne une erreur explicite si cela échoue.

**Solution complète (non implémentée):** Pour que l'OLD fonctionne vraiment indépendamment, il faudrait:

1. Modifier les imports dans OLD pour pointer vers `@old/lib/assistant/...` au lieu de `@/lib/assistant/...`
2. OU créer des wrappers qui redirigent les imports OLD vers les modules OLD
3. OU accepter que l'OLD ne fonctionne que si les modules n'ont pas changé de manière incompatible

**Recommandation:** Pour comparer OLD vs NEW, utiliser la version NEW qui fonctionne correctement. La version OLD sert principalement de référence pour le code monolithique, pas pour l'exécution.

### Compilation

Les fichiers OLD peuvent ne pas compiler si:

- Des dépendances ont changé
- Des types ont changé
- Des modules ont été supprimés

**Action:** Documenter les erreurs ici et ne pas corriger les fichiers OLD (sauf si bloquant pour l'exécution).

## 📝 Fichiers récupérés

### Fichiers principaux

- `src/app/actions/assistant.ts` (875 lignes)
- `src/components/ProjectAssistant.tsx` (1949 lignes)

### Tests

- `src/app/actions/__tests__/assistant.test.ts`
- `src/app/actions/__tests__/integration-routing.test.ts`
- `src/app/actions/__tests__/integration-routing-complete.test.ts`
- `src/app/actions/__tests__/ASSISTANT_TEST_CASES.md`

### Modules lib/assistant

Tous les fichiers présents dans `src/lib/assistant/` au moment du commit `cfe65e49c1007631965a8b6c1719db9c5f3ed519` ont été copiés dans `OLD/src/lib/assistant/`.

## 🔍 Comparaison

Pour comparer les deux versions:

1. **Interface commune:** `src/lib/assistant/interface.ts`
2. **Factory:** `src/lib/assistant/factory.ts`
3. **Sélecteur de version:** `src/lib/assistant/version-selector.ts`
4. **Adapter OLD:** `src/app/actions/assistant-old-adapter.ts`

## 📊 Tests

Les tests OLD sont disponibles dans `OLD/src/app/actions/__tests__/` mais peuvent ne pas fonctionner directement car ils pointent vers les modules actuels.

Pour exécuter les tests OLD:

1. Adapter les imports si nécessaire
2. Ou créer des tests de comparaison qui testent OLD vs NEW avec les mêmes inputs

## 🚀 Prochaines étapes

1. ✅ Rapatriement des fichiers OLD
2. ✅ Création de l'interface commune
3. ✅ Création du factory et du sélecteur de version
4. ✅ Ajout du toggle UI
5. ⏳ Écrire une batterie de tests unitaires qui garantissent que le refactor conserve 100% du comportement
