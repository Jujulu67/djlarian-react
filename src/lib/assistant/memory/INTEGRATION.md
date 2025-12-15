# Architecture Mémoire Étanche - Documentation d'Intégration

## 4) Diffs d'Intégration

### Variante A: Mémoire côté client + store côté client

```typescript
// FILE: src/components/assistant/hooks/useAssistant.ts
// AVANT (problématique - mémoire unique)
const [messages, setMessages] = useState<Message[]>([]);

const sendMessage = async (input: string) => {
  const response = await fetch('/api/assistant', {
    body: JSON.stringify({ messages, input }),
  });
  const data = await response.json();
  setMessages([...messages, { role: 'user', content: input }, data.message]);
};

// APRÈS (mémoires séparées côté client)
import {
  handleUserInput,
  Message,
  getConversationMemoryStore,
  getActionMemoryStore,
} from '@/lib/assistant/memory';

// Transcript UI (affichage complet)
const [transcript, setTranscript] = useState<Message[]>([]);
// Session ID stable
const sessionId = useRef(generateSessionId()).current;

const sendMessage = async (input: string) => {
  const result = await handleUserInput(input, {
    sessionId,
    userId: user?.id,
  });

  // Ajouter au transcript UI (tout)
  setTranscript((prev) => [...prev, ...result.transcriptMessages]);
};
```

### Variante B: Mémoire côté serveur (RECOMMANDÉE)

```typescript
// FILE: src/app/api/assistant/route.ts
// AVANT
export async function POST(req: Request) {
  const { messages, input } = await req.json();
  const response = await groq.chat.completions.create({
    model: 'llama-3.1-8b-instant',
    messages: [...messages, { role: 'user', content: input }],
  });
  return NextResponse.json({ message: response.choices[0].message });
}

// APRÈS
import { handleUserInput } from '@/lib/assistant/memory';

export async function POST(req: Request) {
  const { input, sessionId, userId } = await req.json();

  const result = await handleUserInput(input, {
    sessionId,
    userId,
    groqApiKey: process.env.GROQ_API_KEY,
  });

  return NextResponse.json({
    transcriptMessages: result.transcriptMessages,
    routerDecision: result.routerDecision,
    responseText: result.responseText,
    debug: result.debug, // si ASSISTANT_DEBUG=true
  });
}
```

```typescript
// FILE: src/components/assistant/AssistantChat.tsx
// AVANT (mémoire locale pollutable)
const [messages, setMessages] = useState<any[]>([]);

// APRÈS (transcript UI séparé)
import { Message } from '@/lib/assistant/memory';

// Transcript UI = affichage complet (chat + actions)
const [transcript, setTranscript] = useState<Message[]>([]);

const handleSubmit = async (input: string) => {
  const response = await fetch('/api/assistant', {
    method: 'POST',
    body: JSON.stringify({ input, sessionId, userId }),
  });
  const data = await response.json();

  // Ajouter au transcript
  setTranscript(prev => [...prev, ...data.transcriptMessages]);
};

// Rendu différencié par kind
{transcript.map(msg => (
  msg.kind === 'chat' ? (
    <ChatBubble key={msg.id} message={msg} />
  ) : msg.kind === 'action' ? (
    <ActionResult key={msg.id} action={msg} />
  ) : (
    <SystemNotice key={msg.id} notice={msg} />
  )
))}
```

---

## 5) Observabilité & Debug

### Configuration

```bash
# .env.local
ASSISTANT_DEBUG=true
```

### Logs structurés automatiques

Quand `ASSISTANT_DEBUG=true`, chaque appel à `handleUserInput` génère:

```
[HandleUserInput][1702654321-abc123] Decision: GENERAL_CHAT (0.9)
[Router] Routing: "Comment ça va?"
[Router] Decision: GENERAL_CHAT (Small talk pattern detected)
[ConversationMemory][session-xyz] ADDED: user message (12 tokens)
[GroqPayloadBuilder] Payload built:
  - Model: llama-3.1-8b-instant
  - Messages: 5
  - Last messages preview:
    [user] Comment ça va?...
[ConversationMemory][session-xyz] ADDED: assistant message (25 tokens)
```

### Détection de violations

En mode debug, les violations d'invariants lèvent des exceptions:

```typescript
// ConversationMemoryStore.ts
private logViolation(message: string): void {
  if (this.isDebugEnabled()) {
    console.error(`[ConversationMemory] VIOLATION: ${message}`);
    throw new Error(`ConversationMemory invariant violation: ${message}`);
  }
}
```

### Structure du debug info retourné

```typescript
interface DebugInfo {
  requestId: string; // ID unique de la requête
  routerConfidence: number; // 0-1
  routerReason: string; // Explication de la décision
  conversationMemorySize: number;
  actionMemorySnapshot: {
    lastSelectedProjectIds: string[];
    lastActionType: ActionType | null;
    lastScope: ActionScope;
  };
  groqPayloadMessageCount?: number;
}
```

---

## 6) Tests de non-régression

Les tests sont dans `src/lib/assistant/memory/__tests__/memory-isolation.test.ts`.

### Exécution

```bash
npm test -- memory-isolation
```

### Tests inclus

1. **Actions puis small talk**: Vérifie que Groq n'avale pas les outputs actions
2. **Small talk puis action**: Vérifie que ActionMemory garde le scope
3. **Payload Groq**: Vérifie qu'aucun message kind=action n'est envoyé au modèle
4. **Router decisions**: Vérifie le routing correct pour actions/chat
5. **Type guards**: Vérifie isChatMessage/isActionMessage
6. **Invariants validation**: Vérifie les méthodes validateInvariants()

---

## 7) Évolutions à proposer ensuite

### Priorité 1: Budget tokens réaliste + trimming progressif

```typescript
// Améliorer ConversationMemoryStore
interface TokenBudgetConfig {
  softLimit: number; // 3000 tokens - commence le trimming
  hardLimit: number; // 4000 tokens - trim agressif
  reserveForResponse: number; // 500 tokens réservés
}

// Trimming progressif:
// 1. Supprimer les messages les plus anciens (FIFO)
// 2. Résumer les messages moyennement anciens
// 3. Garder les N derniers messages intacts
```

### Priorité 2: Résumé incrémental pour ConversationMemory

```typescript
// Nouveau module: ConversationSummarizer.ts
interface SummaryConfig {
  triggerThreshold: number; // Nombre de messages avant résumé
  summaryMaxTokens: number; // Taille max du résumé
  keepRecentMessages: number; // Messages récents à garder intacts
}

async function summarizeOldMessages(
  store: ConversationMemoryStore,
  groq: GroqClient
): Promise<void> {
  // 1. Extraire les messages anciens
  // 2. Appeler Groq pour résumer (prompt dédié)
  // 3. Remplacer les anciens messages par le résumé
  // 4. Garder les messages récents intacts
}
```

### Priorité 3: Lock/queue par session contre la concurrence

```typescript
// Nouveau: SessionLock.ts
const sessionLocks = new Map<string, Promise<void>>();

async function withSessionLock<T>(sessionId: string, operation: () => Promise<T>): Promise<T> {
  // Attendre le lock précédent
  const previousLock = sessionLocks.get(sessionId);
  if (previousLock) await previousLock;

  // Créer un nouveau lock
  let releaseLock: () => void;
  const lockPromise = new Promise<void>((resolve) => {
    releaseLock = resolve;
  });
  sessionLocks.set(sessionId, lockPromise);

  try {
    return await operation();
  } finally {
    releaseLock!();
    sessionLocks.delete(sessionId);
  }
}
```

### Priorité 4: Migration Map → Redis/DB

```typescript
// RedisConversationMemoryStore.ts
import { Redis } from 'ioredis';

export class RedisConversationMemoryStore {
  private redis: Redis;
  private keyPrefix = 'conv:';

  async add(role: MessageRole, content: string): Promise<ChatMessage | null> {
    const key = `${this.keyPrefix}${this.sessionId}`;
    const message = this.createMessage(role, content);
    await this.redis.rpush(key, JSON.stringify(message));
    await this.redis.expire(key, 3600); // 1h TTL
    return message;
  }

  async getMessages(): Promise<ChatMessage[]> {
    const key = `${this.keyPrefix}${this.sessionId}`;
    const raw = await this.redis.lrange(key, 0, -1);
    return raw.map((r) => JSON.parse(r));
  }
}
```

### Priorité 5: Schéma de version des mémoires

```typescript
// Types.ts - Ajouter version
interface ConversationMemoryState {
  version: number; // Incrémenté à chaque breaking change
  messages: ChatMessage[];
  metadata: {
    createdAt: number;
    lastUpdatedAt: number;
  };
}

// Migration automatique
function migrateState(state: unknown, fromVersion: number): ConversationMemoryState {
  if (fromVersion === 1) {
    // Migration v1 → v2
  }
  return state as ConversationMemoryState;
}
```

### Priorité 6: Sécurité (PII redaction, logs sanitisés)

```typescript
// Nouveau: PiiRedactor.ts
const PII_PATTERNS = [
  { regex: /\b\d{16}\b/g, replacement: '[CARD_NUMBER]' },
  { regex: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, replacement: '[EMAIL]' },
  { regex: /\b\d{3}-\d{2}-\d{4}\b/g, replacement: '[SSN]' },
  { regex: /\+?\d{10,15}/g, replacement: '[PHONE]' },
];

export function redactPii(content: string): string {
  let result = content;
  for (const { regex, replacement } of PII_PATTERNS) {
    result = result.replace(regex, replacement);
  }
  return result;
}

// Utiliser avant logging
function debugLog(message: string): void {
  if (isDebugEnabled()) {
    console.log(redactPii(message));
  }
}
```

### Priorité 7 (Bonus): Métriques et alerting

```typescript
// Nouveau: Metrics.ts
interface MemoryMetrics {
  sessionId: string;
  conversationMemorySize: number;
  conversationMemoryTokens: number;
  actionMemorySize: number;
  routerDecisions: Record<RouterDecision, number>;
  groqCallCount: number;
  actionCallCount: number;
  averageResponseTimeMs: number;
}

// Export vers votre système de monitoring préféré
function reportMetrics(metrics: MemoryMetrics): void {
  // Datadog, Prometheus, custom endpoint...
}
```

---

## Résumé des fichiers créés

| Fichier                                                       | Description                              |
| ------------------------------------------------------------- | ---------------------------------------- |
| `src/lib/assistant/memory/Types.ts`                           | Types centraux (Message, Router, Action) |
| `src/lib/assistant/memory/ConversationMemoryStore.ts`         | Mémoire chat uniquement                  |
| `src/lib/assistant/memory/ActionMemoryStore.ts`               | Contexte opérationnel uniquement         |
| `src/lib/assistant/memory/Router.ts`                          | Classification déterministe              |
| `src/lib/assistant/memory/GroqPayloadBuilder.ts`              | Construction payload Groq                |
| `src/lib/assistant/memory/ActionParser.ts`                    | Parser + handlers d'actions              |
| `src/lib/assistant/memory/HandleUserInput.ts`                 | Orchestrateur principal                  |
| `src/lib/assistant/memory/index.ts`                           | Exports publics                          |
| `src/lib/assistant/memory/__tests__/memory-isolation.test.ts` | Tests de non-régression                  |

---

## Checklist d'intégration

- [ ] Remplacer l'appel Groq stub dans `HandleUserInput.ts` par l'appel réel
- [ ] Brancher les handlers d'action sur Prisma
- [ ] Ajouter `sessionId` dans le state React
- [ ] Mettre à jour les composants UI pour distinguer `kind`
- [ ] Configurer `ASSISTANT_DEBUG=true` en développement
- [ ] Exécuter les tests: `npm test -- memory-isolation`
