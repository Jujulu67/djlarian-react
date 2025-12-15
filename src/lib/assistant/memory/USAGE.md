# Guide d'intégration - Architecture Mémoire Étanche

## 🚀 Utilisation immédiate

L'adaptateur `MemoryAdapter.ts` est prêt. Voici comment l'utiliser dans `useAssistantChat.ts`:

### Étape 1: Importer l'adaptateur

```typescript
// Dans useAssistantChat.ts, ajouter en haut:
import {
  classifyUserMessage,
  trackChatMessage,
  trackActionContext,
  getFilteredConversationHistory,
  resetSession,
  debugMemoryState,
} from '@/lib/assistant/memory';
```

### Étape 2: Générer un sessionId

```typescript
// Ajouter après les autres useRef:
const sessionIdRef = useRef<string>(`session-${Date.now()}-${Math.random().toString(36).slice(2)}`);
```

### Étape 3: Modifier handleSubmit

```typescript
// Dans handleSubmit, AVANT l'appel au routeur:
const routerClassification = classifyUserMessage(sessionIdRef.current, currentInput);
console.warn('[Assistant] 🔀 Classification:', routerClassification);

// Après traitement, selon le type de résultat:
if (result.type === 'general') {
  // C'est du chat → tracker dans ConversationMemory
  trackChatMessage(sessionIdRef.current, 'user', currentInput);
  trackChatMessage(sessionIdRef.current, 'assistant', result.response);
} else {
  // C'est une action → tracker dans ActionMemory (pas dans ConversationMemory!)
  trackActionContext(
    sessionIdRef.current,
    result.type,
    result.pendingAction?.affectedProjectIds || []
  );
}
```

### Étape 4: Utiliser l'historique filtré pour Groq

```typescript
// Dans groq-responder.ts ou parse-query/route.ts, utiliser:
import { getFilteredConversationHistory } from '@/lib/assistant/memory';

// Au lieu de passer conversationHistory directement:
const filteredHistory = getFilteredConversationHistory(sessionId);
// Cet historique ne contient QUE les messages chat, pas les actions!
```

### Étape 5: Reset

```typescript
// Dans handleReset:
const handleReset = useCallback(() => {
  setMessages([]);
  // ... autres resets existants ...
  resetSession(sessionIdRef.current); // ← Ajouter cette ligne
}, []);
```

## 📋 Exemple complet de modification

Voici le diff partiel pour `useAssistantChat.ts`:

```diff
+ import {
+   classifyUserMessage,
+   trackChatMessage,
+   trackActionContext,
+   resetSession,
+   debugMemoryState,
+ } from '@/lib/assistant/memory';

  export function useAssistantChat({ projects }: UseAssistantChatOptions): UseAssistantChatReturn {
    const router = useRouter();
+   const sessionIdRef = useRef<string>(`session-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    // ... rest of state ...

    const handleReset = useCallback(() => {
      setMessages([]);
      setLastFilters(null);
      setLastResults([]);
      setConversationHistory([]);
      lastAppliedFilterRef.current = undefined;
      lastListedProjectIdsRef.current = undefined;
+     resetSession(sessionIdRef.current);
    }, []);

    const handleSubmit = useCallback(async (e: React.FormEvent) => {
      // ... existing code ...

+     // 🔀 Classifier le message avec la nouvelle architecture
+     const classification = classifyUserMessage(sessionIdRef.current, currentInput);
+     debugMemoryState(sessionIdRef.current);
+     console.warn('[Assistant] Classification:', classification);

      const { routeProjectCommandClient } = await import('@/lib/assistant/router/client-router');
      const result = await routeProjectCommandClient(/* ... */);

      // Après traitement du résultat:
      if (result.type === 'general') {
+       // Chat: tracker dans ConversationMemory
+       trackChatMessage(sessionIdRef.current, 'user', currentInput);
+       trackChatMessage(sessionIdRef.current, 'assistant', result.response);

        setMessages((prev) => [/* ... */]);
      } else if (result.type === 'list') {
+       // Action: tracker dans ActionMemory (PAS dans ConversationMemory)
+       trackActionContext(sessionIdRef.current, 'LIST', result.listedProjectIds);

        setMessages((prev) => [/* ... */]);
      } else if (result.type === 'update' || result.type === 'add_note') {
+       // Action: tracker
+       trackActionContext(sessionIdRef.current, result.type.toUpperCase(), result.pendingAction.affectedProjectIds);

        setMessages((prev) => [/* ... */]);
      }
      // ... etc ...
    }, [/* deps */]);
  }
```

## ✅ Ce qui est automatiquement garanti

Une fois intégré:

| Garantie                                     | Comment                                                 |
| -------------------------------------------- | ------------------------------------------------------- |
| ConversationMemory ne contient que du chat   | `trackChatMessage` rejette les contenus pollués         |
| ActionMemory garde le contexte opérationnel  | `trackActionContext` stocke ids, type, scope            |
| Groq ne reçoit jamais les résultats d'action | `getFilteredConversationHistory` filtre automatiquement |
| Debug intégré                                | `debugMemoryState(sessionId)` + `ASSISTANT_DEBUG=true`  |

## 🧪 Test de l'intégration

Après modification, lancer:

```bash
node scripts/test-memory-integration.mjs
```

Et vérifier dans la console que:

- Les messages `GENERAL_CHAT` incrémentent ConversationMemory
- Les messages `ACTION_COMMAND` incrémentent ActionMemory
- Les appels Groq n'ont que les messages chat

## ⚠️ Points d'attention

1. **sessionId**: Doit être stable pour la durée de la session utilisateur
2. **Reset**: Appeler `resetSession()` quand l'utilisateur clear le chat
3. **SSR**: `getFilteredConversationHistory()` doit être appelé côté client ou via une API route

## 🔄 Migration progressive

Tu peux activer l'intégration progressivement:

1. **Semaine 1**: Ajouter uniquement le tracking (`trackChatMessage`, `trackActionContext`)
2. **Semaine 2**: Utiliser `classifyUserMessage` pour valider le routing existant
3. **Semaine 3**: Basculer sur `getFilteredConversationHistory` pour Groq
4. **Semaine 4**: Supprimer l'ancien système de `conversationHistory`
