# Résumé du Rapatriement - Version OLD Assistant

## ✅ Fichiers Rapatriés

### Fichiers Principaux

- ✅ `OLD/src/app/actions/assistant.ts` (875 lignes - version monolithique)
- ✅ `OLD/src/components/ProjectAssistant.tsx` (1949 lignes - version monolithique)

### Tests

- ✅ `OLD/src/app/actions/__tests__/assistant.test.ts`
- ✅ `OLD/src/app/actions/__tests__/integration-routing.test.ts`
- ✅ `OLD/src/app/actions/__tests__/integration-routing-complete.test.ts`
- ✅ `OLD/src/app/actions/__tests__/ASSISTANT_TEST_CASES.md`

### Modules lib/assistant (tous les fichiers du commit)

- ✅ `OLD/src/lib/assistant/config.ts`
- ✅ `OLD/src/lib/assistant/types.ts`
- ✅ `OLD/src/lib/assistant/conversational/` (3 fichiers)
- ✅ `OLD/src/lib/assistant/parsers/` (7 fichiers + tests)
- ✅ `OLD/src/lib/assistant/query-parser/` (6 fichiers + tests)
- ✅ `OLD/src/lib/assistant/security/` (1 fichier)
- ✅ `OLD/src/lib/assistant/tools/` (3 fichiers)
- ✅ `OLD/src/lib/assistant/prompts/` (1 fichier)

**Total:** ~35 fichiers récupérés depuis le commit `cfe65e49c1007631965a8b6c1719db9c5f3ed519`

## 📍 Emplacement du Toggle UI

Le bouton de bascule OLD/NEW est situé dans:

- **Fichier:** `src/components/ProjectAssistant.tsx`
- **Position:** Dans le header de la modal assistant, à droite, juste avant les boutons de contrôle (plein écran, effacer, fermer)
- **Style:** Badge coloré (orange pour OLD, vert pour NEW) avec tooltip explicatif
- **Fonctionnalité:**
  - Cliquer pour basculer entre OLD et NEW
  - Le choix est sauvegardé dans `localStorage` (clé: `assistant-version`)
  - Par défaut: **NEW** (version refactorée)

## 🔧 Mécanisme de Switch (Factory Pattern)

### Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    UI (ProjectAssistant)                │
│  ┌──────────────────────────────────────────────────┐  │
│  │  useAssistantChat hook                           │  │
│  │  └─> getAssistantService()                      │  │
│  └──────────────────────────────────────────────────┘  │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│              Factory (getAssistantService)               │
│  ┌──────────────────┐      ┌──────────────────┐      │
│  │ OldAssistantService│      │NewAssistantService│      │
│  │ (monolithique)    │      │ (refactorée)      │      │
│  └────────┬──────────┘      └────────┬──────────┘      │
└───────────┼──────────────────────────┼──────────────────┘
            │                          │
            ▼                          ▼
┌──────────────────┐      ┌──────────────────────────┐
│ assistant-old-   │      │ src/app/actions/         │
│ adapter.ts       │      │ assistant.ts            │
│                  │      │ (version refactorée)     │
│ └─> OLD/src/app/│      │                         │
│     actions/     │      │                         │
│     assistant.ts │      │                         │
└──────────────────┘      └──────────────────────────┘
```

### Fichiers Clés

1. **Interface commune:** `src/lib/assistant/interface.ts`
   - Définit `IAssistantService` avec la méthode `processProjectCommand(userInput: string): Promise<string>`

2. **Factory:** `src/lib/assistant/factory.ts`
   - `getAssistantService()`: Retourne l'instance OLD ou NEW selon `localStorage`
   - Cache les instances pour éviter de les recréer
   - `resetAssistantServiceCache()`: Réinitialise le cache après changement de version

3. **Sélecteur de version:** `src/lib/assistant/version-selector.ts`
   - `getAssistantVersion()`: Lit depuis `localStorage` (défaut: 'new')
   - `setAssistantVersion()`: Sauvegarde le choix dans `localStorage`
   - `resetAssistantVersion()`: Réinitialise à 'new'

4. **Adapter OLD:** `src/app/actions/assistant-old-adapter.ts`
   - Charge dynamiquement la version OLD depuis `OLD/src/app/actions/assistant.ts`
   - Gère les erreurs d'import/compatibilité
   - Retourne des messages d'erreur explicites si l'OLD ne peut pas être chargé

5. **Hook modifié:** `src/components/assistant/hooks/useAssistantChat.ts`
   - Utilise `getAssistantService()` au lieu de l'import direct
   - Appelle `assistantService.processProjectCommand(currentInput)`

## 🚀 Comment Utiliser

### Basculer entre OLD et NEW

1. Ouvrir l'assistant (bouton en bas à droite)
2. Dans le header, cliquer sur le badge "OLD" ou "NEW"
3. Le badge change de couleur (orange = OLD, vert = NEW)
4. Le choix est sauvegardé automatiquement dans `localStorage`
5. Tester une commande pour voir la différence

### Comparer les Résultats

1. Tester une commande avec la version NEW (ex: "liste mes projets")
2. Noter la réponse
3. Basculer vers OLD (cliquer sur le badge)
4. Tester la même commande
5. Comparer les réponses

### Voir les Logs

Les logs sont dans la console du navigateur:

- `[Assistant] 📝 Question reçue:` - Input utilisateur
- `[OldAssistantService] Erreur:` - Erreurs de la version OLD
- `[OLD Adapter] Erreur:` - Erreurs de chargement de l'OLD

## ⚠️ Limitations Connues

### Imports Incompatibles

Les fichiers OLD utilisent des imports avec `@/lib/assistant/...` qui pointent vers les modules actuels (`src/lib/assistant/`), pas vers `OLD/src/lib/assistant/`.

**Impact:** Si les modules dans `src/lib/assistant/` ont changé de signature ou n'existent plus, la version OLD peut ne pas fonctionner correctement.

**Solution:** L'adapter retourne une erreur explicite si l'OLD ne peut pas être chargé.

### Compilation

Les fichiers OLD peuvent ne pas compiler si:

- Des dépendances ont changé
- Des types ont changé
- Des modules ont été supprimés

**Action:** Documenter les erreurs dans `OLD/README.md` et ne pas corriger les fichiers OLD (sauf si bloquant).

## 📊 Prochaines Étapes

1. ✅ Rapatriement des fichiers OLD
2. ✅ Création de l'interface commune
3. ✅ Création du factory et du sélecteur de version
4. ✅ Ajout du toggle UI
5. ⏳ Écrire une batterie de tests unitaires qui garantissent que le refactor conserve 100% du comportement

## 🔍 Fichiers Modifiés (Version Refactorée)

Les fichiers suivants ont été modifiés pour supporter le toggle:

- ✅ `src/components/assistant/hooks/useAssistantChat.ts` - Utilise le factory
- ✅ `src/components/ProjectAssistant.tsx` - Ajout du toggle UI

## 📝 Fichiers Créés

- ✅ `src/lib/assistant/interface.ts` - Interface commune
- ✅ `src/lib/assistant/factory.ts` - Factory pattern
- ✅ `src/lib/assistant/version-selector.ts` - Gestion localStorage
- ✅ `src/app/actions/assistant-old-adapter.ts` - Adapter pour OLD
- ✅ `OLD/README.md` - Documentation OLD
- ✅ `OLD/SUMMARY.md` - Ce fichier

## 🎯 Objectif Atteint

✅ Tous les fichiers monolithiques ont été rapatriés dans `OLD/`  
✅ Un mécanisme de bascule OLD/NEW a été créé sans modifier la version refactorée  
✅ Un toggle UI permet de basculer facilement entre les deux versions  
✅ Le choix est persisté dans `localStorage`  
✅ L'architecture permet d'ajouter facilement des tests de comparaison
