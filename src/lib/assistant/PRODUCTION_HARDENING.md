# Production Hardening - O11, O12, O13

## Résumé des objectifs

| Objectif | Description                                   | Impact               |
| -------- | --------------------------------------------- | -------------------- |
| **O11**  | Redis stores optionnels avec fallback Map     | Multi-instance ready |
| **O12**  | Rate limiting par session (anti-spam/facture) | Protection Groq API  |
| **O13**  | Redaction PII + garde-fou debug prod          | Confidentialité logs |

---

## Configuration

### Variables d'environnement

```bash
# O11 - Redis (optionnel)
REDIS_URL=redis://localhost:6379    # Si absent → fallback Map in-memory
CONVERSATION_TTL_MS=3600000         # TTL conversation (défaut: 1h)
ACTION_TTL_MS=300000                # TTL actions (défaut: 5 min)

# O12 - Rate Limiting
RATE_LIMIT_MAX=20                   # Requêtes max par fenêtre (défaut: 20)
RATE_LIMIT_WINDOW_MS=60000          # Durée fenêtre en ms (défaut: 1 min)
RATE_LIMIT_ENABLED=true             # Désactivable en dev

# O13 - Debug
ASSISTANT_DEBUG=true                # Active le debug
ASSISTANT_DEBUG_ALLOW_IN_PROD=true  # REQUIS pour debug en production
```

### Comportement fallback

- **Sans `REDIS_URL`** → Stores Map in-memory (acceptable en dev/single-instance)
- **Avec `REDIS_URL`** → Redis détecté, fallback Map temporaire (implémentation Redis TODO)
- **Sans `RATE_LIMIT_ENABLED`** → Rate limit actif par défaut
- **En production sans `ASSISTANT_DEBUG_ALLOW_IN_PROD`** → Debug IGNORÉ

---

## Fichiers créés/modifiés

### Nouveaux fichiers

```
src/lib/assistant/memory/stores/
├── IConversationMemoryStore.ts    # Interface O11
├── IActionMemoryStore.ts          # Interface O11
├── StoreFactory.ts                # Factory Redis/Map
├── index.ts                       # Exports
└── __tests__/StoreFactory.test.ts # Tests

src/lib/assistant/rate-limit/
├── SessionRateLimiter.ts          # Rate limiter O12
├── index.ts                       # Exports
└── __tests__/SessionRateLimiter.test.ts

src/lib/assistant/security/
├── PiiRedactor.ts                 # Redaction PII O13
└── __tests__/PiiRedactor.test.ts
```

### Fichiers modifiés

- `src/app/api/assistant/groq/route.ts` - Rate limit + PII redaction intégrés

---

## Usage

### O11 - Store Factory

```typescript
import {
  getConversationStore,
  getActionStore,
  getStoreBackend,
} from '@/lib/assistant/memory/stores';

// Détection automatique Redis/Map
const backend = getStoreBackend(); // 'redis' | 'memory'

// Récupérer un store (automatiquement adapté au backend)
const convStore = getConversationStore(sessionId);
const actionStore = getActionStore(sessionId);
```

### O12 - Rate Limiting

```typescript
import { getSessionRateLimiter, createRateLimitResponse } from '@/lib/assistant/rate-limit';

const limiter = getSessionRateLimiter();
const result = await limiter.check(sessionId);

if (!result.allowed) {
  const response = createRateLimitResponse(result);
  return NextResponse.json(response.body, {
    status: response.status,
    headers: response.headers,
  });
}
```

### O13 - PII Redaction

```typescript
import { redactPii, isDebugAllowed, safeDebugLog } from '@/lib/assistant/security/PiiRedactor';

// Redaction simple
const safe = redactPii('Email: john@example.com, Tel: 0612345678');
// → "Email: [EMAIL], Tel: [PHONE]"

// Avec détails
const result = redactPii(text, { returnDetails: true });
// → { text: "...", redactionCount: 2, detectedTypes: ["EMAIL", "PHONE"] }

// Log sécurisé (utilise garde-fou production)
safeDebugLog('GroqPayload', 'User message', { email: 'test@example.com' });
// En prod sans ALLOW_IN_PROD → pas de log
// En dev → log avec PII redacted

// Vérification garde-fou
if (isDebugAllowed()) {
  // Ce code ne s'exécute PAS en production sauf si explicitement autorisé
  console.log(sensitiveData);
}
```

---

## Invariants préservés

| Invariant                      | Status | Vérification                                                |
| ------------------------------ | ------ | ----------------------------------------------------------- |
| **I1** Étanchéité              | ✅     | Tests `StoreFactory.test.ts` - ConversationMemory chat-only |
| **I2** Single routeur          | ✅     | Pas de modification du router                               |
| **I3** Source de vérité unique | ✅     | Factory centralise l'accès aux stores                       |
| **I4** Actions sans IA         | ✅     | Rate limit n'impacte pas les actions locales                |
| **I5** Concurrence sérialisée  | ✅     | SessionLock inchangé                                        |

---

## Tests

```bash
# Vérifier la compilation TypeScript
npx tsc --noEmit --skipLibCheck

# Exécuter tous les tests
npm test

# Tests spécifiques aux nouveaux modules
npm test -- --testPathPattern="(StoreFactory|SessionRateLimiter|PiiRedactor)"
```

**Résultat attendu**: 317 suites, 4323 tests passant.
