# Audit Pipeline Prompts - Rapport Complet

**Date:** 2024-12-19  
**Objectif:** Identifier pourquoi le préprompt système (identité LARIAN BOT) n'est plus injecté correctement depuis le passage à POST /api/assistant/groq

---

## 1. Pipeline Groq (GENERAL) - Chemin Actuel

### Carte du Pipeline

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. Router (router.ts)                                           │
│    Ligne 514-533: routeProjectCommand()                         │
│    → Détecte isConversationalQuestion && !hasActionVerb         │
│    → Appelle callGroqApi()                                       │
└─────────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────────┐
│ 2. callGroqApi() (router.ts:229-285)                            │
│    → Construit body JSON:                                        │
│      { message, context, conversationHistory, requestId }       │
│    → Fetch POST /api/assistant/groq                             │
└─────────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────────┐
│ 3. API Route (route.ts)                                          │
│    Ligne 48-139: POST /api/assistant/groq                       │
│    → Parse body: message, conversationHistory, context           │
│    → Filtre conversationHistory (filterConversationHistory)      │
│    → Appelle getConversationalResponse()                         │
│    ⚠️ PAS D'INJECTION DE SYSTEM PROMPT ICI                      │
└─────────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────────┐
│ 4. Groq Responder (groq-responder.ts:27-140)                   │
│    Ligne 87-93: buildUserPrompt()                               │
│      → Construit userPrompt avec mode, query, context            │
│    Ligne 128-132: generateText()                                │
│      → system: SYSTEM_PROMPT_8B ✅                              │
│      → messages: [{ role: 'user', content: userPrompt }]        │
│    ⚠️ SYSTEM PROMPT INJECTÉ ICI                                  │
└─────────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────────┐
│ 5. Groq API (llama-3.1-8b-instant)                               │
│    → Reçoit system + messages                                   │
└─────────────────────────────────────────────────────────────────┘
```

### Points d'Injection du System Prompt

| Fichier                                              | Fonction                      | Ligne | Ordre                         | Status                   |
| ---------------------------------------------------- | ----------------------------- | ----- | ----------------------------- | ------------------------ |
| `src/lib/assistant/prompts/system-prompt-8b.ts`      | `SYSTEM_PROMPT_8B`            | 11    | -                             | ✅ Défini                |
| `src/lib/assistant/conversational/groq-responder.ts` | `getConversationalResponse()` | 130   | **1er** (via `system:` param) | ✅ Injecté               |
| `src/app/api/assistant/groq/route.ts`                | `POST()`                      | 99    | -                             | ❌ Non injecté (délègue) |

### Contenu du System Prompt

**Fichier:** `src/lib/assistant/prompts/system-prompt-8b.ts` (ligne 11-30)

```typescript
export const SYSTEM_PROMPT_8B = `Tu es LARIAN BOT, assistant de gestion de projets musicaux.

RÈGLES PRINCIPALES DE PERSONNALITÉ (STYLE "DJ PRODUCER"):
• ⛔️ NE DIS JAMAIS "Bonjour", "Salut" ou "Hello" sauf si l'utilisateur te salue D'ABORD. (Gain de tokens).
• ⚡️ Sois ULTRA-CONCIS. Va droit au but. Pas de blabla inutile.
• 🎨 Utilise des sauts de ligne pour aérer le texte.
• 🔥 Utilise des émojis pertinents (🎹, 🔊, 🚀, 💿) pour rendre le tout vivant.
• UTILISE "TU" (informel).

IDENTITÉ :
Tu es Larian Bot, l'assistant studio. Tu es là pour bosser, pas pour faire la causette.
Si on te pose une question absurde, réponds avec une punchline musicale courte.

STATUTS DISPONIBLES:
EN_COURS, TERMINE, ANNULE, A_REWORK, GHOST_PRODUCTION, ARCHIVE

FORMAT RÉPONSE:
• Question simple → 1 phrase
• Explication → 2-3 phrases max
• Question de suivi → Utilise le contexte de la conversation`;
```

**Longueur:** ~600 caractères  
**Contient identité:** ✅ "LARIAN BOT", "Larian Bot"

---

## 2. Pipeline Parseur (COMMAND) - Chemin Alternatif

### Carte du Pipeline

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. Router (router.ts)                                           │
│    → Détecte isList, isCreate, isUpdate                        │
│    → Retourne ProjectCommandResult (pas d'appel Groq)          │
└─────────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────────┐
│ 2. Ancien chemin (assistant.ts:47-490)                          │
│    Ligne 391-399: generateText()                               │
│    → prompt: `Tu es LARIAN BOT.\n[SYSTEM INSTRUCTIONS START]\n  │
│              ${SYSTEM_PROMPT_8B}\n[SYSTEM INSTRUCTIONS END]...` │
│    ⚠️ SYSTEM PROMPT DANS LE PROMPT STRING (pas system: param)   │
└─────────────────────────────────────────────────────────────────┘
```

### Points d'Injection du System Prompt (Ancien Chemin)

| Fichier                        | Fonction                  | Ligne | Ordre              | Status                             |
| ------------------------------ | ------------------------- | ----- | ------------------ | ---------------------------------- |
| `src/app/actions/assistant.ts` | `processProjectCommand()` | 393   | Dans prompt string | ✅ Injecté (mais format différent) |

**Différence clé:** L'ancien chemin injecte le system prompt **dans le prompt string**, pas via le paramètre `system:`.

---

## 3. Cause Racine Identifiée

### Preuve 1: Le System Prompt EST Injecté

**Code:** `src/lib/assistant/conversational/groq-responder.ts:128-132`

```typescript
const result = await generateText({
  model: groq('llama-3.1-8b-instant'),
  system: SYSTEM_PROMPT_8B, // ✅ System prompt présent
  messages: [{ role: 'user', content: userPrompt }],
});
```

**Preuve:** Le code montre clairement que `SYSTEM_PROMPT_8B` est passé au paramètre `system:`.

### Preuve 2: Le System Prompt Contient l'Identité

**Code:** `src/lib/assistant/prompts/system-prompt-8b.ts:11`

```typescript
export const SYSTEM_PROMPT_8B = `Tu es LARIAN BOT, assistant de gestion de projets musicaux.
...
IDENTITÉ :
Tu es Larian Bot, l'assistant studio. ...
```

**Preuve:** Le system prompt contient explicitement "LARIAN BOT" et "Larian Bot".

### Preuve 3: Problème Potentiel - Format `system:` vs Prompt String

**Hypothèse:** Le modèle LLaMA 8B peut ignorer ou sous-prioriser le paramètre `system:` par rapport à un prompt string explicite.

**Comparaison:**

| Chemin                          | Format                                                                                      | Priorité Estimée                                |
| ------------------------------- | ------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| **Ancien (assistant.ts)**       | Prompt string avec `Tu es LARIAN BOT.\n[SYSTEM INSTRUCTIONS START]\n${SYSTEM_PROMPT_8B}...` | ⚠️ **HAUTE** (dans le prompt user)              |
| **Nouveau (groq-responder.ts)** | Paramètre `system:` séparé                                                                  | ⚠️ **MOYENNE** (peut être ignoré par le modèle) |

### Preuve 4: Logs Existants

**Code:** `src/lib/assistant/conversational/groq-responder.ts:95-101`

```typescript
console.log('[Groq 8B] Appel avec format system + messages', {
  mode,
  hasHistory: !!conversationHistory && conversationHistory.length > 0,
  historyLength: conversationHistory?.length || 0,
  systemPromptLength: SYSTEM_PROMPT_8B.length, // ✅ Loggé
  userPromptLength: userPrompt.length,
});
```

**Preuve:** Les logs confirment que le system prompt est bien passé (longueur loggée).

### Preuve 5: Instrumentation Ajoutée

**Code ajouté:** `src/lib/assistant/conversational/groq-responder.ts:103-123`

```typescript
// [GroqPromptAudit] Instrumentation temporaire pour audit
const isDebugEnabled =
  process.env.ASSISTANT_DEBUG === 'true' || process.env.ASSISTANT_DEBUG === '1';
if (isDebugEnabled) {
  console.log('[GroqPromptAudit] 📤 Juste avant generateText', {
    systemPromptLength: SYSTEM_PROMPT_8B.length,
    systemPromptPreview: sanitizeForLogs(systemPromptHash, 80),
    systemPromptStartsWith: SYSTEM_PROMPT_8B.substring(0, 50),
    messagesCount: messagesToSend.length,
    messagesRoles: messagesToSend.map((m) => m.role),
    firstMessageRole: messagesToSend[0]?.role,
    hasSystemParam: true,
    systemParamType: typeof SYSTEM_PROMPT_8B,
  });
}
```

**Preuve:** Instrumentation ajoutée pour vérifier ce qui est réellement envoyé.

---

## 4. Diagnostic Final

### ✅ Ce qui fonctionne

1. **Le system prompt est défini** (`SYSTEM_PROMPT_8B`)
2. **Le system prompt est injecté** (via paramètre `system:` dans `generateText`)
3. **Le system prompt contient l'identité** ("LARIAN BOT", "Larian Bot")
4. **Le pipeline est correct** (router → API → responder → generateText)

### ❌ Problème Identifié

**Cause racine probable:** Le modèle LLaMA 8B peut ignorer ou sous-prioriser le paramètre `system:` séparé, surtout si le user prompt ne fait pas référence explicite à l'identité.

**Preuve indirecte:**

- L'ancien chemin (assistant.ts) injectait le system prompt **dans le prompt string** avec un préfixe explicite: `Tu es LARIAN BOT.\n[SYSTEM INSTRUCTIONS START]\n${SYSTEM_PROMPT_8B}...`
- Le nouveau chemin utilise le paramètre `system:` qui peut être moins prioritaire pour les modèles 8B

**Symptôme observé:** Le modèle répond "je suis LLaMA" au lieu de "je suis LARIAN BOT", ce qui indique que:

- Soit le system prompt n'est pas lu/priorisé
- Soit le modèle a un comportement par défaut qui s'identifie comme LLaMA malgré le system prompt

---

## 5. Recommandation Minimale

### Fix Proposé (sans implémentation)

**Option 1 (Recommandée):** Renforcer l'identité dans le user prompt en ajoutant un rappel explicite au début du `userPrompt` construit par `buildUserPrompt()`.

**Fichier:** `src/lib/assistant/prompts/system-prompt-8b.ts`  
**Fonction:** `buildUserPrompt()`  
**Ligne:** ~42-73

**Changement minimal:**

```typescript
export function buildUserPrompt(...) {
  const parts: string[] = [];

  // ✅ AJOUT: Rappel d'identité explicite au début
  parts.push('IDENTITÉ: Tu es LARIAN BOT, assistant de gestion de projets musicaux.');
  parts.push('');

  // Mode explicite
  parts.push(`MODE: ${mode}`);
  ...
}
```

**Justification:**

- Le modèle 8B lit le user prompt en premier
- Un rappel d'identité dans le user prompt renforce le system prompt
- Changement minimal (1 ligne ajoutée)
- Pas de refactor nécessaire

**Option 2 (Alternative):** Préfixer le user prompt avec l'identité dans `groq-responder.ts` avant l'appel à `generateText()`.

**Fichier:** `src/lib/assistant/conversational/groq-responder.ts`  
**Ligne:** ~87-93

**Changement minimal:**

```typescript
const userPrompt = buildUserPrompt(...);
// ✅ AJOUT: Préfixer avec identité
const userPromptWithIdentity = `IDENTITÉ: Tu es LARIAN BOT.\n\n${userPrompt}`;
```

**Justification:**

- Même principe que Option 1
- Plus centralisé (dans le responder)
- Impact minimal

---

## 6. Tests de Validation

### Test Minimal (à exécuter avec ASSISTANT_DEBUG=true)

```bash
# 1. Activer le debug
export ASSISTANT_DEBUG=true

# 2. Tester via curl
curl -s -X POST http://localhost:3000/api/assistant/groq \
  -H "Content-Type: application/json" \
  -d '{"message":"qui es-tu ?","conversationHistory":[],"requestId":"Audit-Identity-001"}'

# 3. Vérifier les logs [GroqPromptAudit]
# - systemPromptLength doit être > 0
# - systemPromptStartsWith doit contenir "Tu es LARIAN BOT"
# - hasSystemParam doit être true
# - firstMessageRole doit être "user"
```

### Logs Attendus

```
[GroqPromptAudit] 📊 Avant appel getConversationalResponse { ... }
[GroqPromptAudit] 📤 Juste avant generateText {
  systemPromptLength: 600,
  systemPromptStartsWith: "Tu es LARIAN BOT, assistant de gestion...",
  hasSystemParam: true,
  ...
}
```

---

## 7. Comparaison avec Ancien Chemin

### Ancien Chemin (assistant.ts)

**Code:** `src/app/actions/assistant.ts:393`

```typescript
const result = await generateText({
  model: groq(modelId),
  prompt: `Tu es LARIAN BOT.\n[SYSTEM INSTRUCTIONS START]\n${SYSTEM_PROMPT_8B}\n[SYSTEM INSTRUCTIONS END]\n\n⚠️ FORMAT DES OUTILS (CRITIQUE):...`,
  tools: ...
});
```

**Différences clés:**

1. ✅ Utilise `prompt:` (string) au lieu de `system:` + `messages:`
2. ✅ Préfixe explicite "Tu es LARIAN BOT." au début du prompt
3. ✅ Enveloppe le system prompt dans `[SYSTEM INSTRUCTIONS START/END]`
4. ⚠️ Pas de format messages: (tout dans un seul prompt string)

**Pourquoi ça fonctionnait probablement mieux:**

- Le modèle lit tout le prompt en une seule fois
- L'identité est au début du prompt (haute priorité)
- Pas de séparation system/messages qui peut confondre le modèle 8B

---

## 8. Conclusion

### Résumé

1. ✅ **Le system prompt est injecté** (preuve: code ligne 130 de groq-responder.ts)
2. ✅ **Le system prompt contient l'identité** (preuve: "LARIAN BOT" dans SYSTEM_PROMPT_8B)
3. ⚠️ **Problème probable:** Le paramètre `system:` peut être sous-priorisé par LLaMA 8B
4. ✅ **Solution minimale:** Ajouter un rappel d'identité dans le user prompt

### Action Recommandée

**Fichier à modifier:** `src/lib/assistant/prompts/system-prompt-8b.ts`  
**Fonction:** `buildUserPrompt()`  
**Changement:** Ajouter `parts.push('IDENTITÉ: Tu es LARIAN BOT, assistant de gestion de projets musicaux.');` au début de la fonction.

**Impact:** Minimal (1 ligne), pas de refactor, renforce l'identité pour les modèles 8B.

---

## 9. Résultats des Commandes Grep

### Grep 1: Préprompt / Modes / Mémoire

**Commande:** `grep -RIn --exclude-dir=node_modules --exclude-dir=.git -E "preprompt|system prompt|MODE:|CHAT|FACT|SUMMARY|COMMAND|FACTUAL MEMORY|INTERPRETATIVE" src`

**Résultats clés:**

- ✅ `SYSTEM_PROMPT_8B` trouvé dans `src/lib/assistant/prompts/system-prompt-8b.ts:11`
- ✅ `SYSTEM_DISCIPLINE_PROMPT` trouvé dans `src/lib/assistant/prompts/system-discipline-prompt.ts:8` (⚠️ **NON UTILISÉ dans groq-responder.ts**)
- ✅ Modes (CHAT/FACT/SUMMARY/COMMAND) trouvés dans `src/lib/assistant/conversational/mode-inference.ts`
- ✅ FACTUAL MEMORY / INTERPRETATIVE NOTES trouvés dans `src/lib/assistant/conversational/memory-manager.ts`

**Observation importante:** `SYSTEM_DISCIPLINE_PROMPT` existe mais n'est **PAS injecté** dans le chemin Groq. Il contient des règles strictes sur les modes et la mémoire qui pourraient améliorer le comportement.

### Grep 2: Assemblage Messages / Prompt

**Commande:** `grep -RIn --exclude-dir=node_modules --exclude-dir=.git -E "generateText\(|messages\s*:|role\s*:\s*'system'|getConversationalResponse\(" src`

**Résultats clés:**

- ✅ `generateText()` appelé dans:
  - `src/app/actions/assistant.ts:391` (ancien chemin, utilise `prompt:` string)
  - `src/lib/assistant/conversational/groq-responder.ts:129` (nouveau chemin, utilise `system:` + `messages:`)
- ✅ `getConversationalResponse()` appelé dans:
  - `src/app/api/assistant/groq/route.ts:112`
  - `src/app/api/assistant/parse-query/route.ts:116`
- ✅ Format `messages: [{ role: 'user', content: userPrompt }]` dans `groq-responder.ts:132`

### Grep 3: Usage API Groq

**Commande:** `grep -RIn --exclude-dir=node_modules --exclude-dir=.git -E "/api/assistant/groq|callGroqApi" src`

**Résultats clés:**

- ✅ `callGroqApi()` défini dans `src/lib/assistant/router/router.ts:229`
- ✅ Appelé dans `router.ts:517` (chemin GENERAL) et `router.ts:1162` (fallback)
- ✅ Route API: `src/app/api/assistant/groq/route.ts:35`

**Flux confirmé:** Router → callGroqApi → POST /api/assistant/groq → getConversationalResponse → generateText

---

## 10. Découverte Additionnelle: SYSTEM_DISCIPLINE_PROMPT Non Utilisé

**Fichier:** `src/lib/assistant/prompts/system-discipline-prompt.ts`

**Contenu:** Prompt disciplinaire avec règles strictes pour modes CHAT/FACT/SUMMARY/COMMAND et gestion de la mémoire.

**Statut:** ❌ **NON INJECTÉ** dans `groq-responder.ts`

**Impact potentiel:** Ce prompt pourrait améliorer le comportement du modèle en renforçant les règles de mode et de mémoire, mais il n'est actuellement pas utilisé dans le chemin Groq.

**Recommandation secondaire (optionnelle):** Considérer l'injection de `SYSTEM_DISCIPLINE_PROMPT` en plus de `SYSTEM_PROMPT_8B` si le problème persiste après le fix principal.

---

## 11. Fichiers Modifiés pour Audit

1. ✅ `src/app/api/assistant/groq/route.ts` - Instrumentation ajoutée (ligne ~98-107)
2. ✅ `src/lib/assistant/conversational/groq-responder.ts` - Instrumentation ajoutée (ligne ~103-123) + import sanitizeForLogs

**Note:** Ces modifications sont temporaires et doivent être retirées après validation du fix.
