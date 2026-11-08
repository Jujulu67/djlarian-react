/**
 * Réponses conversationnelles avec Groq pour les questions générales
 *
 * OPTIMISÉ POUR 8B:
 * - Utilise system: + messages: pour le caching automatique Groq
 * - Prompt système compact et cacheable
 * - Historique formaté en messages séparés
 *
 * ⚠️ SERVER-ONLY: Ce module ne peut pas être exécuté côté client
 *
 * O6: Utilise ModelLimits pour capper max_completion_tokens
 * O7: Feature flag pour max_tokens déprécié
 * O8: Utilise SanitizeGroqMessages pour validation stricte des messages
 */
import 'server-only';
import type { ConversationMessage } from './memory-manager';
import { prepareConversationContext, formatConversationContextForPrompt } from './memory-manager';
import {
  SYSTEM_PROMPT_8B,
  buildUserPrompt,
  formatHistoryForMessages,
} from '../prompts/system-prompt-8b';
import { SYSTEM_DISCIPLINE_PROMPT } from '../prompts/system-discipline-prompt';
import { InferModeFromQuery } from './mode-inference';
import { sanitizeForLogs } from '../utils/sanitize-logs';
import { capMaxCompletionTokens, GROQ_COMPLEX_MODEL, GROQ_FAST_MODEL } from '../memory/ModelLimits';
import { sanitizeGroqMessages } from '../memory/SanitizeGroqMessages';
import { logger } from '@/lib/logger';

/**
 * O7: Feature flag pour envoyer max_tokens (déprécié)
 */
const SEND_DEPRECATED_MAX_TOKENS = process.env.GROQ_SEND_DEPRECATED_MAX_TOKENS === 'true';

type GroqMessage = { role: 'user' | 'assistant'; content: string };

/** Mémoire à placer dans le prompt et échanges récents à envoyer comme messages. */
function prepareHistory(query: string, conversationHistory?: ConversationMessage[]) {
  const preparedContext = conversationHistory?.length
    ? prepareConversationContext(conversationHistory)
    : null;
  if (!preparedContext) {
    return { conversationContextString: '', historyAsMessages: [] as GroqMessage[] };
  }
  return {
    conversationContextString: formatConversationContextForPrompt(preparedContext, query),
    historyAsMessages: preparedContext.recentMessages?.length
      ? (formatHistoryForMessages(preparedContext.recentMessages) as GroqMessage[])
      : [],
  };
}

function assertValidMessages(messages: GroqMessage[]): void {
  for (const msg of messages) {
    if (msg.role !== 'user' && msg.role !== 'assistant') {
      throw new Error(`Invalid message role: ${msg.role}`);
    }
    if (typeof msg.content !== 'string') {
      throw new TypeError(`Invalid message content type: ${typeof msg.content}`);
    }
  }
}

// Appel Groq avec format optimisé pour caching
// Le system: est cacheable car statique (discipline + identité combinés)
// Les messages: contiennent l'historique + le prompt user final
// O8: Validation stricte via SanitizeGroqMessages (remplace les anciens workarounds)
async function callGroq({
  groqApiKey,
  modelId,
  combinedSystemPrompt,
  messages,
  query,
}: {
  groqApiKey: string;
  modelId: string;
  combinedSystemPrompt: string;
  messages: GroqMessage[];
  query: string;
}): Promise<string> {
  // O8: Sanitizer les messages via le module dédié (validation + cleanup)
  // Ceci remplace l'ancien workaround JSON.parse/stringify + gestion manual des prototypes
  const sanitizeResult = sanitizeGroqMessages(messages, {
    debug: process.env.ASSISTANT_DEBUG === 'true' || process.env.ASSISTANT_DEBUG === '1',
  });

  // O8: Messages propres après sanitization
  let finalMessages = sanitizeResult.messages;

  // O8: Cas spécial - questions d'identité (réponse hardcodée déjà gérée plus haut)
  // Pour les prompts trop longs, simplifier vers la question originale
  // NOTE: Ce n'est plus un "workaround" mais une optimisation documentée
  const lastMessageLength = finalMessages.at(-1)?.content?.length || 0;
  const MAX_USER_PROMPT_LENGTH = 800; // Limite produit pour éviter erreurs API

  if (lastMessageLength > MAX_USER_PROMPT_LENGTH) {
    // Remplacer le dernier message par la question simple
    finalMessages = [
      ...finalMessages.slice(0, -1),
      { role: 'user' as const, content: String(query) },
    ];
  }

  // O6: Cap max_completion_tokens selon les limites du modèle
  const requestedTokens = 1024;
  const cappedTokens = capMaxCompletionTokens(modelId, requestedTokens);

  // O7: Construire le payload avec feature flag pour max_tokens
  const groqPayload: Record<string, unknown> = {
    model: modelId,
    messages: [
      { role: 'system', content: combinedSystemPrompt },
      ...finalMessages.map((m) => ({ role: m.role, content: m.content })),
    ],
    temperature: 0.7,
    // Modèle à raisonnement : effort bas pour rester rapide et économiser le quota gratuit
    reasoning_effort: 'low',
    max_completion_tokens: cappedTokens,
  };

  // O7: Ajouter max_tokens seulement si feature flag activé
  if (SEND_DEPRECATED_MAX_TOKENS) {
    groqPayload.max_tokens = cappedTokens;
  }

  const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${groqApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(groqPayload),
  });

  if (!groqResponse.ok) {
    const errorText = await groqResponse.text();
    throw new Error(`Groq API error ${groqResponse.status}: ${errorText}`);
  }

  const groqData = await groqResponse.json();
  const resultText = groqData.choices?.[0]?.message?.content || '';

  return resultText.trim();
}

/**
 * Génère une réponse conversationnelle avec Groq pour les questions générales
 * Utilise le format system: + messages: pour profiter du caching automatique Groq
 */
export async function getConversationalResponse(
  query: string,
  context: { projectCount: number; collabCount: number; styleCount: number },
  conversationHistory?: ConversationMessage[],
  isComplex?: boolean,
  requestId?: string,
  isFirstAssistantTurn?: boolean
): Promise<string> {
  // Vérifier que la clé API est disponible (server-only)
  const groqApiKey: string | undefined = process.env.GROQ_API_KEY ?? process.env.OPENAI_API_KEY;

  if (!groqApiKey) {
    const error = new Error(
      'Missing GROQ_API_KEY (or OPENAI_API_KEY) for Groq responder. Pass it using the GROQ_API_KEY or OPENAI_API_KEY environment variable.'
    );
    error.name = 'AI_LoadAPIKeyError';
    throw error;
  }

  try {
    // Combiner les prompts système: discipline + identité
    const combinedSystemPrompt = `${SYSTEM_DISCIPLINE_PROMPT}\n\n${SYSTEM_PROMPT_8B}`;

    // Préparer le contexte conversationnel si on a un historique
    const { conversationContextString, historyAsMessages } = prepareHistory(
      query,
      conversationHistory
    );

    // Inférer le mode opérationnel
    const mode = InferModeFromQuery(query);
    const hasGreeted = conversationHistory && conversationHistory.length > 2;

    // Utiliser isFirstAssistantTurn fourni, ou calculer si non fourni (fallback)
    const computedIsFirstAssistantTurn =
      isFirstAssistantTurn ?? (!conversationHistory || conversationHistory.length === 0);

    // Construire le prompt user dynamique (avec identité martelée au début)
    const userPrompt = buildUserPrompt(
      mode,
      query,
      conversationContextString,
      context,
      !!hasGreeted,
      computedIsFirstAssistantTurn
    );

    // Construire les messages: historique + prompt user final
    // ⚠️ IMPORTANT: S'assurer que tous les messages ont exactement le format { role: 'user' | 'assistant', content: string }
    // L'API Groq rejette tout autre format ou champ supplémentaire
    // ⚠️ CRITIQUE: Pour éviter l'erreur "unsupported content types", on doit s'assurer que les messages
    // sont des objets simples avec uniquement les propriétés 'role' et 'content' (pas de prototype, pas de méthodes)
    const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [
      ...historyAsMessages.map((msg) => {
        // Créer un objet littéral simple (pas de classe, pas de prototype)
        return {
          role: msg.role as 'user' | 'assistant',
          content: String(msg.content || ''), // S'assurer que content est bien une string
        };
      }),
      {
        role: 'user' as const,
        content: String(userPrompt),
      },
    ];

    assertValidMessages(messages);

    const isIdentityQuery =
      /qui\s+es\s*-?tu|who\s+are\s+you|quel\s+est\s+ton\s+nom|what\s+is\s+your\s+name/i.test(query);

    // ⚠️ WORKAROUND: Pour les questions d'identité, retourner une réponse hardcodée
    // Le modèle 8B ignore souvent les instructions d'identité dans le system prompt
    if (isIdentityQuery) {
      const hardcodedResponse =
        'Je suis LARIAN BOT, assistant studio de gestion de projets musicaux.';
      return hardcodedResponse;
    }

    // Choix du modèle selon la complexité (même prompts pour 8B et 70B)
    // L'identité et la discipline ne dépendent pas du modèle
    const modelId = isComplex ? GROQ_COMPLEX_MODEL : GROQ_FAST_MODEL;

    return await callGroq({ groqApiKey, modelId, combinedSystemPrompt, messages, query });
  } catch (error) {
    // Sanitizer l'erreur avant de logger (éviter l'exposition de données sensibles)
    const errorMessage = error instanceof Error ? error.message : String(error);
    const sanitizedError = sanitizeForLogs(errorMessage, 200);
    const sanitizedStack =
      error instanceof Error && error.stack ? sanitizeForLogs(error.stack, 500) : undefined;

    logger.error('[Groq 8B] Erreur:', {
      error: sanitizedError,
      stack: sanitizedStack,
      errorName: error instanceof Error ? error.name : 'Unknown',
    });
    return `Salut ! 🎵 Je suis LARIAN, ton assistant pour tes ${context.projectCount} projets. Demande-moi "combien de ghost prod j'ai" ou "liste mes projets terminés".`;
  }
}
