# Audit Model Routing - Rapport Complet

**Date:** 2024-12-19  
**Objectif:** Vérifier l'existence d'un mécanisme "complexity routing" et s'assurer de l'uniformité des prompts entre modèles

---

## 1. Où le modèle est sélectionné

### Fichiers avec sélection de modelId

| Fichier                                              | Ligne | Code                                                                                             | ModelId           | Condition                  |
| ---------------------------------------------------- | ----- | ------------------------------------------------------------------------------------------------ | ----------------- | -------------------------- |
| `src/app/actions/assistant.ts`                       | 388   | `const modelId = classification.isComplex ? 'llama-3.3-70b-versatile' : 'llama-3.1-8b-instant';` | 70B ou 8B         | `classification.isComplex` |
| `src/lib/assistant/conversational/groq-responder.ts` | 133   | `model: groq('llama-3.1-8b-instant')`                                                            | **8B uniquement** | Toujours                   |

### Chemins d'appel

**Chemin 1 (Ancien - assistant.ts):**

```
processProjectCommand()
  → classifyQuery() (avec isComplex)
  → generateText({ model: groq(modelId) }) // 8B ou 70B selon isComplex
```

**Chemin 2 (Nouveau - router.ts):**

```
routeProjectCommand()
  → callGroqApi()
  → POST /api/assistant/groq
  → getConversationalResponse()
  → generateText({ model: groq('llama-3.1-8b-instant') }) // TOUJOURS 8B
```

**⚠️ PROBLÈME IDENTIFIÉ:** Le nouveau chemin (router.ts) n'utilise PAS le complexity routing et force toujours 8B.

---

## 2. Complexity Score - Détection

### Fonction: `classifyQuery()` dans `classifier.ts`

**Fichier:** `src/lib/assistant/query-parser/classifier.ts` (lignes 361-378)

**Critères de complexité:**

1. **Longueur:** `query.length > 100` caractères
2. **Mots-clés de raisonnement fort:**
   - `/analyse|détaille|detail|resume|résume|récapitule|summary|summarize|explique|explain/i`
3. **Raisonnement contextuel:**
   - `/pourquoi|comment|explain|why|how|avis|opinion|penses?|think/i` ET `query.length > 50`
4. **Non compris:** `!understood && !isConversationalQuestion`

**Seuil:** Aucun seuil numérique, logique booléenne (`isComplex = true` si l'une des conditions est vraie)

**Mapping:**

- `isComplex === true` → `'llama-3.3-70b-versatile'` (70B)
- `isComplex === false` → `'llama-3.1-8b-instant'` (8B)

**⚠️ PROBLÈME:** Cette détection n'est utilisée QUE dans `assistant.ts`, pas dans le nouveau chemin `router.ts`.

---

## 3. Uniformité des Prompts entre Modèles

### Chemin assistant.ts (8B ou 70B selon isComplex)

**Fichier:** `src/app/actions/assistant.ts:391-398`

**System Prompt:**

```typescript
prompt: `Tu es LARIAN BOT.\n[SYSTEM INSTRUCTIONS START]\n${SYSTEM_PROMPT_8B}\n[SYSTEM INSTRUCTIONS END]\n\n⚠️ FORMAT DES OUTILS (CRITIQUE):...`;
```

**Format:** Prompt string (pas `system:` + `messages:`)

**Contient:**

- ✅ `SYSTEM_PROMPT_8B` (mais pas `SYSTEM_DISCIPLINE_PROMPT`)
- ✅ Identité "LARIAN BOT"
- ❌ **PAS de SYSTEM_DISCIPLINE_PROMPT**
- ❌ **PAS de format messages:** (tout dans un prompt string)

### Chemin groq-responder.ts (8B uniquement)

**Fichier:** `src/lib/assistant/conversational/groq-responder.ts:132-135`

**System Prompt:**

```typescript
system: combinedSystemPrompt, // SYSTEM_DISCIPLINE_PROMPT + SYSTEM_PROMPT_8B
messages: [...historyAsMessages, { role: 'user', content: userPrompt }]
```

**Format:** `system:` + `messages:`

**Contient:**

- ✅ `SYSTEM_DISCIPLINE_PROMPT` + `SYSTEM_PROMPT_8B` (combinés)
- ✅ Identité "LARIAN BOT" (dans SYSTEM_PROMPT_8B)
- ✅ Identité martelée dans userPrompt ("IDENTITÉ: Tu es LARIAN BOT")
- ✅ Messages formatés avec historique

### Comparaison

| Aspect                               | assistant.ts (8B/70B)   | groq-responder.ts (8B)                           |
| ------------------------------------ | ----------------------- | ------------------------------------------------ |
| **System Prompt**                    | `SYSTEM_PROMPT_8B` seul | `SYSTEM_DISCIPLINE_PROMPT + SYSTEM_PROMPT_8B` ✅ |
| **Format**                           | Prompt string           | `system:` + `messages:` ✅                       |
| **Identité dans userPrompt**         | Non                     | Oui (martelée) ✅                                |
| **Historique**                       | Dans prompt string      | Messages séparés ✅                              |
| **Mémoire (FACTUAL/INTERPRETATIVE)** | Non                     | Oui (via formatConversationContextForPrompt) ✅  |

**⚠️ PROBLÈME MAJEUR:** Les deux chemins utilisent des formats de prompts DIFFÉRENTS :

- `assistant.ts` : prompt string, pas de discipline, pas d'identité martelée
- `groq-responder.ts` : system + messages, discipline + identité, mémoire

---

## 4. Chemins d'Appel - Graphe

```
┌─────────────────────────────────────────────────────────────┐
│ CHEMIN 1: assistant.ts (ANCIEN - avec complexity routing)    │
└─────────────────────────────────────────────────────────────┘
                          ↓
useAssistantChat → routeProjectCommandClient (client-router.ts)
                          ↓
                    routeProjectCommand (router.ts)
                          ↓
                    [PAS utilisé pour GENERAL]
                          ↓
                    [Utilisé pour LIST/CREATE/UPDATE]
                          ↓
                    [GENERAL → callGroqApi → /api/assistant/groq]
                          ↓
                    getConversationalResponse (groq-responder.ts)
                          ↓
                    generateText({ model: 'llama-3.1-8b-instant' })
                          ↓
                    [TOUJOURS 8B, pas de complexity routing]

┌─────────────────────────────────────────────────────────────┐
│ CHEMIN 2: assistant.ts (ANCIEN - avec complexity routing)   │
└─────────────────────────────────────────────────────────────┘
                          ↓
processProjectCommand (assistant.ts)
                          ↓
                    classifyQuery() → isComplex
                          ↓
                    generateText({
                      model: isComplex ? '70b' : '8b',
                      prompt: SYSTEM_PROMPT_8B (string)
                    })
                          ↓
                    [8B ou 70B selon isComplex]
                          ⚠️ MAIS: prompts différents (pas de discipline)
```

**Observation:** Le nouveau chemin (router.ts) ne passe JAMAIS par `assistant.ts`, donc le complexity routing n'est PAS utilisé pour les questions GENERAL.

---

## 5. Problèmes Identifiés

### Problème 1: Complexity Routing Non Utilisé dans Nouveau Chemin

**Impact:** Toutes les questions GENERAL passent par 8B, même si elles sont complexes.

**Preuve:** `groq-responder.ts:133` force `'llama-3.1-8b-instant'`

### Problème 2: Prompts Non Uniformes

**Impact:**

- `assistant.ts` n'utilise pas `SYSTEM_DISCIPLINE_PROMPT`
- `assistant.ts` n'a pas l'identité martelée dans le user prompt
- `assistant.ts` n'utilise pas la mémoire (FACTUAL/INTERPRETATIVE)

**Preuve:** Comparaison des formats dans section 3.

### Problème 3: Deux Chemins Parallèles

**Impact:**

- Incohérence entre les réponses selon le chemin emprunté
- Le nouveau chemin (router.ts) est meilleur (discipline + identité + mémoire) mais force 8B
- L'ancien chemin (assistant.ts) peut utiliser 70B mais prompts moins bons

---

## 6. Recommandations

### Option 1: Uniformiser et Ajouter Complexity Routing au Nouveau Chemin

**Changements:**

1. Ajouter `classification.isComplex` dans `router.ts` avant `callGroqApi()`
2. Passer `isComplex` à `/api/assistant/groq`
3. Dans `groq-responder.ts`, choisir le modèle selon `isComplex`
4. Garder les mêmes prompts (discipline + identité + mémoire) pour 8B et 70B

**Avantage:** Uniformité complète, meilleurs prompts, complexity routing fonctionnel.

### Option 2: Désactiver Complexity Routing (tout en 8B)

**Changements:**

1. Garder `groq-responder.ts` en 8B uniquement
2. Documenter que 8B est suffisant pour toutes les questions GENERAL

**Avantage:** Simplicité, cohérence.

### Option 3: Migrer assistant.ts vers le Nouveau Format

**Changements:**

1. Modifier `assistant.ts` pour utiliser `system:` + `messages:` au lieu de `prompt:`
2. Ajouter `SYSTEM_DISCIPLINE_PROMPT` dans `assistant.ts`
3. Ajouter identité martelée dans user prompt

**Avantage:** Uniformité si les deux chemins doivent coexister.

---

## 7. État Actuel - Résumé

| Aspect                               | État                                                                     |
| ------------------------------------ | ------------------------------------------------------------------------ |
| **Complexity Routing**               | ✅ Existe dans `assistant.ts`, ❌ PAS dans `router.ts`                   |
| **Uniformité Prompts**               | ❌ Deux formats différents                                               |
| **Discipline Prompt**                | ✅ Dans `groq-responder.ts`, ❌ PAS dans `assistant.ts`                  |
| **Identité Martelée**                | ✅ Dans `groq-responder.ts`, ❌ PAS dans `assistant.ts`                  |
| **Mémoire (FACTUAL/INTERPRETATIVE)** | ✅ Dans `groq-responder.ts`, ❌ PAS dans `assistant.ts`                  |
| **Chemin Principal**                 | `router.ts` (nouveau) - meilleurs prompts mais pas de complexity routing |

---

## 8. Corrections Appliquées ✅

**Option choisie:** Option 1 (Uniformiser et ajouter complexity routing)

**Changements effectués:**

1. ✅ **Ajout de `isComplex` dans le pipeline router.ts → API → groq-responder.ts**
   - `router.ts`: Passe `isComplex` à `callGroqApi()`
   - `route.ts`: Reçoit `isComplex` du body et le passe à `getConversationalResponse()`
   - `groq-responder.ts`: Utilise `isComplex` pour choisir le modèle

2. ✅ **Uniformisation des prompts pour 8B et 70B**
   - Même `combinedSystemPrompt` (SYSTEM_DISCIPLINE_PROMPT + SYSTEM_PROMPT_8B) pour les deux modèles
   - Même structure de messages (historique + userPrompt avec identité martelée)
   - Même mémoire (FACTUAL MEMORY / INTERPRETATIVE NOTES)

3. ✅ **Ajout de logs dev-only pour le routage**
   - Log `[Groq Model Routing]` avec: requestId, chosenModelId, reason, systemPromptLength, userPromptStartsWith, hasIdentityLine, hasDisciplinePrompt

4. ✅ **Ajout de `isComplex` dans ParseQueryResult**
   - Type mis à jour dans `types.ts`
   - Tous les retours de `parseQuery()` incluent maintenant `isComplex`

5. ✅ **Tests anti-régression ajoutés**
   - Test: 8B pour requêtes simples
   - Test: 70B pour requêtes complexes
   - Test: Uniformité des prompts entre 8B et 70B
   - Test: router.ts passe isComplex à callGroqApi

**Résultat:** Le complexity routing fonctionne maintenant dans le nouveau chemin, avec des prompts uniformes pour 8B et 70B.
