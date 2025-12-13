# Problèmes Connus - Version OLD

## ⚠️ Erreur: Schema Validation Failed

### Symptôme

Quand on utilise la version OLD avec une commande comme "ajoute le projet titi", on obtient:

```
tool call validation failed: parameters for tool updateProjects did not match schema:
errors: [additionalProperties 'progression', 'status', 'projets' not allowed]
```

### Cause

La version OLD charge les outils depuis `@/lib/assistant/tools/...` qui pointent vers les modules **actuels** (refactorés), pas vers les modules OLD.

**Problème de dépendance:**

- `OLD/src/app/actions/assistant.ts` importe: `@/lib/assistant/tools/update-projects-tool`
- Cet import résout vers: `src/lib/assistant/tools/update-projects-tool.ts` (version actuelle)
- Le schéma de `updateProjects` a changé entre OLD et NEW
- L'IA dans OLD génère des paramètres selon l'ancien schéma, mais l'outil actuel rejette ces paramètres

### Impact

- ❌ La version OLD ne peut pas créer de projets (erreur de schéma)
- ❌ La version OLD ne peut pas mettre à jour de projets si le schéma a changé
- ✅ La version OLD peut toujours lire des projets (si `getProjects` n'a pas changé)

### Solutions possibles

#### Option 1: Modifier les imports OLD (non recommandé)

Modifier tous les imports dans `OLD/src/app/actions/assistant.ts`:

```typescript
// Avant
import { createUpdateProjectsTool } from '@/lib/assistant/tools/update-projects-tool';

// Après
import { createUpdateProjectsTool } from '@old/lib/assistant/tools/update-projects-tool';
```

**Problème:** Cela nécessite de modifier OLD, ce qui va à l'encontre de l'objectif de conserver un snapshot.

#### Option 2: Créer des wrappers/adapter pour chaque outil

Créer des adapters qui redirigent les imports OLD vers les modules OLD:

- `src/lib/assistant/tools/update-projects-tool-old-adapter.ts`
- `src/lib/assistant/tools/get-projects-tool-old-adapter.ts`
- etc.

**Problème:** Complexe et nécessite de maintenir des adapters pour chaque module.

#### Option 3: Accepter la limitation (recommandé)

Accepter que la version OLD ne peut pas s'exécuter complètement si les modules ont changé. L'objectif principal est de:

- ✅ Conserver le code monolithique pour référence
- ✅ Comparer la structure du code (pas l'exécution)
- ✅ Utiliser la version NEW pour les tests fonctionnels

### Recommandation

**Pour comparer OLD vs NEW:**

1. Utiliser la version NEW pour les tests fonctionnels
2. Comparer le code source OLD vs NEW pour vérifier la logique
3. Écrire des tests unitaires qui garantissent que le refactor conserve le comportement

**Pour exécuter l'OLD:**

- Seulement si les modules `src/lib/assistant/tools/` n'ont pas changé de schéma
- Ou modifier temporairement les imports OLD pour pointer vers `@old/` (mais ne pas commiter ces modifications)

## 📝 Autres problèmes potentiels

### Imports manquants

Si des modules ont été supprimés ou renommés, l'OLD ne pourra pas se charger.

**Exemple:** Si `src/lib/assistant/parsers/status-detector.ts` a été supprimé, l'OLD ne pourra pas l'importer.

### Types incompatibles

Si les types TypeScript ont changé, l'OLD peut avoir des erreurs de compilation.

**Solution:** Documenter dans ce fichier et ne pas corriger (sauf si bloquant pour la compilation).

## 🔍 Comment vérifier si l'OLD fonctionne

1. Basculer vers OLD dans l'UI
2. Tester une commande simple: "liste mes projets"
3. Si ça fonctionne, les outils de lecture sont compatibles
4. Tester une création: "ajoute le projet test"
5. Si ça échoue avec une erreur de schéma, c'est le problème documenté ci-dessus
