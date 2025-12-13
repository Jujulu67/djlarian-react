# Correction des Imports OLD

## ✅ Modifications effectuées

Tous les imports `@/lib/assistant/*` dans les fichiers OLD ont été remplacés par `@old/lib/assistant/*` pour que la version OLD charge vraiment les anciens modules depuis `OLD/src/lib/assistant/` au lieu des modules actuels.

## 📝 Fichiers modifiés

### Fichier principal

- ✅ `OLD/src/app/actions/assistant.ts`
  - Tous les imports `@/lib/assistant/*` → `@old/lib/assistant/*`
  - `@/auth` conservé (module partagé)

### Composant UI

- ✅ `OLD/src/components/ProjectAssistant.tsx`
  - `@/lib/assistant/parsers/note-generator` → `@old/lib/assistant/parsers/note-generator`
  - `@/components/projects/types` conservé (module partagé)
  - `@/lib/utils/findProjectCandidates` conservé (module partagé)

### Tests

- ✅ `OLD/src/app/actions/__tests__/integration-routing.test.ts`
  - Tous les imports et mocks `@/lib/assistant/*` → `@old/lib/assistant/*`
- ✅ `OLD/src/app/actions/__tests__/integration-routing-complete.test.ts`
  - Tous les imports et mocks `@/lib/assistant/*` → `@old/lib/assistant/*`

## 🔍 Modules conservés avec `@/`

Ces modules sont partagés et doivent rester avec `@/` car ils ne sont pas dans OLD/:

- `@/auth` - Authentification (partagé)
- `@/lib/prisma` - Client Prisma (partagé)
- `@/components/projects/types` - Types TypeScript (partagé)
- `@/lib/utils/findProjectCandidates` - Utilitaires (partagé)

## ✅ Résultat

Maintenant, quand la version OLD est utilisée:

1. Elle charge `@old/lib/assistant/config` depuis `OLD/src/lib/assistant/config.ts`
2. Elle charge `@old/lib/assistant/tools/*` depuis `OLD/src/lib/assistant/tools/*`
3. Elle charge `@old/lib/assistant/parsers/*` depuis `OLD/src/lib/assistant/parsers/*`
4. Elle charge `@old/lib/assistant/query-parser/*` depuis `OLD/src/lib/assistant/query-parser/*`
5. Elle charge `@old/lib/assistant/security/*` depuis `OLD/src/lib/assistant/security/*`

**La version OLD utilise maintenant vraiment les anciens modules OLD !** 🎉

## 🧪 Test

Pour vérifier que ça fonctionne:

1. Basculer vers OLD dans l'UI
2. Tester une commande: "ajoute le projet titi"
3. La version OLD devrait maintenant utiliser ses propres outils avec les anciens schémas
4. Plus d'erreur de validation de schéma (si les schémas OLD sont compatibles)
