# Rapport Complet - Model Routing & Uniformité des Prompts

**Date:** 2024-12-19  
**Objectif:** Confirmer l'existence du complexity routing et s'assurer de l'uniformité des prompts entre modèles

---

## 1. Où le modèle est sélectionné

### Fichiers avec sélection de modelId

| Fichier                                              | Ligne | Code                                                                                             | ModelId   | Condition                  |
| ---------------------------------------------------- | ----- | ------------------------------------------------------------------------------------------------ | --------- | -------------------------- |
| `src/app/actions/assistant.ts`                       | 388   | `const modelId = classification.isComplex ? 'llama-3.3-70b-versatile' : 'llama-3.1-8b-instant';` | 70B ou 8B | `classification.isComplex` |
| `src/lib/assistant/conversational/groq-responder.ts` | 133   | `const modelId = isComplex ? 'llama-3.3-70b-versatile' : 'llama-3.1-8b-instant';`                | 70B ou 8B | `isComplex` (paramètre)    |

### Chemins d'appel

**Chemin Principal (router.ts - NOUVEAU):**

```
routeProjectCommand()
  → classifyQuery() (avec isComplex)
  → callGroqApi(isComplex)
  → POST /api/assistant/groq { isComplex }
  → getConversationalResponse(..., isComplex)
  → generateText({ model: groq(modelId) }) // 8B ou 70B selon isComplex ✅
```

**Chemin Secondaire (assistant.ts - ANCIEN):**

```
processProjectCommand()
  → classifyQuery() (avec isComplex)
  → generateText({ model: groq(modelId) }) // 8B ou 70B selon isComplex
```

**✅ CORRECTION APPLIQUÉE:** Le nouveau chemin utilise maintenant le complexity routing.

---

## 2. Complexity Score - Détection

### Fonction: `classifyQuery()` dans `classifier.ts`

**Fichier:** `src/lib/assistant/query-parser/classifier.ts` (lignes 361-378)

**Critères de complexité:**

1. **Longueur:** `query.length > 100` caractères
2. **Mots-clés de raisonnement fort:**
   - Pattern: `/analyse|détaille|detail|resume|résume|récapitule|summary|summarize|explique|explain/i`
3. **Raisonnement contextuel:**
   - Pattern: `/pourquoi|comment|explain|why|how|avis|opinion|penses?|think/i` ET `query.length > 50`
4. **Non compris:** `!understood && !isConversationalQuestion`

**Seuil:** Logique booléenne (pas de seuil numérique)

**Mapping:**

- `isComplex === true` → `'llama-3.3-70b-versatile'` (70B)
- `isComplex === false` → `'llama-3.1-8b-instant'` (8B)

**✅ UTILISÉ DANS:** Les deux chemins (router.ts et assistant.ts)

---

## 3. Uniformité des Prompts entre Modèles

### Tableau Comparatif

| Aspect                               | assistant.ts (8B/70B)                        | groq-responder.ts (8B/70B) ✅                               |
| ------------------------------------ | -------------------------------------------- | ----------------------------------------------------------- |
| **System Prompt**                    | `SYSTEM_PROMPT_8B` seul (dans prompt string) | `SYSTEM_DISCIPLINE_PROMPT + SYSTEM_PROMPT_8B` (combinés) ✅ |
| **Format**                           | Prompt string                                | `system:` + `messages:` ✅                                  |
| **Identité dans userPrompt**         | Non                                          | Oui (martelée) ✅                                           |
| **Historique**                       | Dans prompt string                           | Messages séparés ✅                                         |
| **Mémoire (FACTUAL/INTERPRETATIVE)** | Non                                          | Oui ✅                                                      |
| **Discipline Prompt**                | Non                                          | Oui ✅                                                      |
| **Complexity Routing**               | Oui                                          | Oui ✅ (corrigé)                                            |

### Prompts pour 8B et 70B dans groq-responder.ts

**✅ UNIFORMES:** Les deux modèles utilisent exactement les mêmes prompts :

```typescript
// System Prompt (identique pour 8B et 70B)
const combinedSystemPrompt = `${SYSTEM_DISCIPLINE_PROMPT}\n\n${SYSTEM_PROMPT_8B}`;

// User Prompt (identique pour 8B et 70B)
const userPrompt = buildUserPrompt(...); // Commence par "IDENTITÉ: Tu es LARIAN BOT"

// Messages (identique pour 8B et 70B)
const messages = [...historyAsMessages, { role: 'user', content: userPrompt }];

// Seul le modelId change
const modelId = isComplex ? 'llama-3.3-70b-versatile' : 'llama-3.1-8b-instant';
```

**Règle respectée:** L'identité et la discipline ne dépendent pas du modèle, seule la capacité change.

---

## 4. Chemins d'Appel - Graphe Final

```
┌─────────────────────────────────────────────────────────────┐
│ CHEMIN PRINCIPAL: router.ts (NOUVEAU - avec complexity)    │
└─────────────────────────────────────────────────────────────┘
                          ↓
useAssistantChat → routeProjectCommandClient (client-router.ts)
                          ↓
                    routeProjectCommand (router.ts)
                          ↓
                    classifyQuery() → isComplex
                          ↓
                    callGroqApi(..., isComplex)
                          ↓
                    POST /api/assistant/groq { isComplex }
                          ↓
                    getConversationalResponse(..., isComplex)
                          ↓
                    generateText({
                      model: isComplex ? '70b' : '8b',
                      system: SYSTEM_DISCIPLINE_PROMPT + SYSTEM_PROMPT_8B,
                      messages: [...history, userPrompt]
                    })
                          ↓
                    ✅ Même prompts pour 8B et 70B

┌─────────────────────────────────────────────────────────────┐
│ CHEMIN SECONDAIRE: assistant.ts (ANCIEN - avec complexity)│
└─────────────────────────────────────────────────────────────┘
                          ↓
processProjectCommand (assistant.ts)
                          ↓
                    classifyQuery() → isComplex
                          ↓
                    generateText({
                      model: isComplex ? '70b' : '8b',
                      prompt: SYSTEM_PROMPT_8B (string) ⚠️
                    })
                          ⚠️ Prompts différents (pas de discipline)
```

**Observation:** Le chemin principal (router.ts) est maintenant uniforme et utilise le complexity routing. Le chemin secondaire (assistant.ts) existe toujours mais utilise des prompts différents.

---

## 5. Logs Dev-Only pour Routage Observable

### Log ajouté dans `groq-responder.ts:138-152`

**Format:**

```typescript
console.log('[Groq Model Routing] 🎯 Sélection du modèle', {
  requestId: requestId || `groq-${Date.now()}`,
  chosenModelId: modelId, // 'llama-3.1-8b-instant' ou 'llama-3.3-70b-versatile'
  reason: isComplex ? 'complexity routing (requête complexe détectée)' : 'default (requête simple)',
  systemPromptLength: combinedSystemPrompt.length,
  userPromptStartsWith: sanitizeForLogs(userPromptStartsWith, 100),
  hasIdentityLine: userPrompt.includes('IDENTITÉ: Tu es LARIAN BOT'),
  hasDisciplinePrompt: combinedSystemPrompt.includes('You are an assistant with limited memory'),
  messagesCount: messages.length,
});
```

**Activation:** `ASSISTANT_DEBUG=true` OU `NODE_ENV=development`

**Exemple de log:**

```
[Groq Model Routing] 🎯 Sélection du modèle {
  requestId: 'req-123',
  chosenModelId: 'llama-3.3-70b-versatile',
  reason: 'complexity routing (requête complexe détectée)',
  systemPromptLength: 2500,
  userPromptStartsWith: 'IDENTITÉ: Tu es LARIAN BOT...',
  hasIdentityLine: true,
  hasDisciplinePrompt: true,
  messagesCount: 3
}
```

---

## 6. Tests Anti-Régression

### Tests ajoutés

**Fichier:** `src/lib/assistant/conversational/__tests__/groq-responder-identity.test.ts`

**3 nouveaux tests:**

1. ✅ "devrait utiliser 8B pour les requêtes simples"
   - Vérifie que `model === 'llama-3.1-8b-instant'` pour `isComplex === false`
   - Vérifie que les prompts contiennent LARIAN BOT et discipline

2. ✅ "devrait utiliser 70B pour les requêtes complexes"
   - Vérifie que `model === 'llama-3.3-70b-versatile'` pour `isComplex === true`
   - Vérifie que les mêmes prompts sont utilisés (discipline + identité)

3. ✅ "devrait utiliser les mêmes prompts (discipline + identité) pour 8B et 70B"
   - Compare systemPrompt8B et systemPrompt70B → doivent être identiques
   - Compare userPrompt8B et userPrompt70B → doivent commencer par "IDENTITÉ: Tu es LARIAN BOT"

**Fichier:** `src/lib/assistant/router/__tests__/router.test.ts`

**1 nouveau test:**

1. ✅ "devrait passer isComplex à callGroqApi pour les requêtes complexes"
   - Vérifie que `isComplex` est passé dans le body de l'appel fetch

**Résultat:** 4 tests passent ✅

---

## 7. État Final - Résumé

| Aspect                               | État                                                  |
| ------------------------------------ | ----------------------------------------------------- |
| **Complexity Routing**               | ✅ Fonctionne dans router.ts (corrigé)                |
| **Uniformité Prompts**               | ✅ Même prompts pour 8B et 70B dans groq-responder.ts |
| **Discipline Prompt**                | ✅ Dans groq-responder.ts (8B et 70B)                 |
| **Identité Martelée**                | ✅ Dans groq-responder.ts (8B et 70B)                 |
| **Mémoire (FACTUAL/INTERPRETATIVE)** | ✅ Dans groq-responder.ts (8B et 70B)                 |
| **Logs Dev-Only**                    | ✅ Ajoutés pour rendre le routage observable          |
| **Tests Anti-Régression**            | ✅ 4 tests ajoutés et passent                         |

---

## 8. Règle Bonus Respectée ✅

**Règle:** "L'identité et la discipline ne dépendent pas du modèle, seule la capacité change."

**Implémentation:**

- ✅ Même `combinedSystemPrompt` pour 8B et 70B
- ✅ Même structure de `messages` pour 8B et 70B
- ✅ Même `userPrompt` (avec identité martelée) pour 8B et 70B
- ✅ Seul `modelId` change selon `isComplex`

**Code (groq-responder.ts:131-162):**

```typescript
// Choix du modèle selon la complexité (même prompts pour 8B et 70B)
// L'identité et la discipline ne dépendent pas du modèle
const modelId = isComplex ? 'llama-3.3-70b-versatile' : 'llama-3.1-8b-instant';

// ⚠️ IMPORTANT: Même prompts pour 8B et 70B (identité et discipline ne dépendent pas du modèle)
const result = await generateText({
  model: groq(modelId),
  system: combinedSystemPrompt, // Identique pour 8B et 70B
  messages, // Identique pour 8B et 70B
});
```

---

## 9. Fichiers Modifiés

1. ✅ `src/lib/assistant/router/router.ts` - Ajout de `isComplex` dans `callGroqApi()`
2. ✅ `src/app/api/assistant/groq/route.ts` - Réception et transmission de `isComplex`
3. ✅ `src/lib/assistant/conversational/groq-responder.ts` - Utilisation de `isComplex` pour choisir le modèle + logs
4. ✅ `src/app/api/assistant/parse-query/route.ts` - Transmission de `isComplex` depuis `parseQuery()`
5. ✅ `src/lib/assistant/types.ts` - Ajout de `isComplex?` dans `ParseQueryResult`
6. ✅ `src/lib/assistant/query-parser/index.ts` - Ajout de `isComplex` dans tous les retours
7. ✅ `src/lib/assistant/conversational/__tests__/groq-responder-identity.test.ts` - 3 tests complexity routing
8. ✅ `src/lib/assistant/router/__tests__/router.test.ts` - 1 test isComplex

---

## 10. Validation

**Tests exécutés:**

```bash
✓ devrait utiliser 8B pour les requêtes simples
✓ devrait utiliser 70B pour les requêtes complexes
✓ devrait utiliser les mêmes prompts (discipline + identité) pour 8B et 70B
✓ devrait passer isComplex à callGroqApi pour les requêtes complexes
```

**Résultat:** 4 tests passent ✅

**Logs dev-only:** Activables via `ASSISTANT_DEBUG=true` ou `NODE_ENV=development`

---

## Conclusion

✅ **Complexity routing fonctionne** dans le nouveau chemin (router.ts)  
✅ **Prompts uniformes** pour 8B et 70B (discipline + identité + mémoire)  
✅ **Logs observables** pour le routage (dev-only)  
✅ **Tests anti-régression** en place

**Règle bonus respectée:** L'identité et la discipline ne dépendent pas du modèle, seule la capacité change.
