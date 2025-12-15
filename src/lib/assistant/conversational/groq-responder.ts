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
import { generateText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import type { ConversationMessage } from './memory-manager';
import { prepareConversationContext } from './memory-manager';
import {
  SYSTEM_PROMPT_8B,
  buildUserPrompt,
  formatHistoryForMessages,
} from '../prompts/system-prompt-8b';
import { SYSTEM_DISCIPLINE_PROMPT } from '../prompts/system-discipline-prompt';
import { InferModeFromQuery } from './mode-inference';
import { sanitizeForLogs } from '../utils/sanitize-logs';
import { formatConversationContextForPrompt } from './memory-manager';
import { capMaxCompletionTokens, getModelMaxOutput } from '../memory/ModelLimits';
import { sanitizeGroqMessages, ValidGroqMessage } from '../memory/SanitizeGroqMessages';

/**
 * O7: Feature flag pour envoyer max_tokens (déprécié)
 */
const SEND_DEPRECATED_MAX_TOKENS = process.env.GROQ_SEND_DEPRECATED_MAX_TOKENS === 'true';

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

  // Créer le client Groq avec la clé API explicite
  const groq = createOpenAI({
    apiKey: groqApiKey,
    baseURL: 'https://api.groq.com/openai/v1',
  });

  try {
    // Combiner les prompts système: discipline + identité
    const combinedSystemPrompt = `${SYSTEM_DISCIPLINE_PROMPT}\n\n${SYSTEM_PROMPT_8B}`;

    // Logs debug (déclaré une seule fois)
    const isDebugEnabled =
      process.env.ASSISTANT_DEBUG === 'true' || process.env.ASSISTANT_DEBUG === '1';

    // Préparer le contexte conversationnel si on a un historique
    let preparedContext: ReturnType<typeof prepareConversationContext> | null = null;
    let conversationContextString = '';
    let historyAsMessages: Array<{ role: 'user' | 'assistant'; content: string }> = [];

    if (conversationHistory && conversationHistory.length > 0) {
      preparedContext = prepareConversationContext(conversationHistory);

      // Utiliser formatConversationContextForPrompt pour la mémoire (FACTUAL MEMORY / INTERPRETATIVE NOTES)
      if (preparedContext) {
        conversationContextString = formatConversationContextForPrompt(preparedContext, query);

        // Convertir l'historique récent en messages pour le format messages[]
        // Protection: preparedContext peut être null même si conversationHistory existe
        if (preparedContext.recentMessages && preparedContext.recentMessages.length > 0) {
          historyAsMessages = formatHistoryForMessages(preparedContext.recentMessages);
        }
      }

      if (isDebugEnabled && preparedContext) {
        console.warn('[Groq 8B] Contexte préparé:', {
          factualMemory: !!preparedContext.factualMemory,
          interpretativeNotes: !!preparedContext.interpretativeNotes,
          recentMessages: preparedContext.recentMessages?.length || 0,
          historyAsMessagesCount: historyAsMessages.length,
          totalTokens: preparedContext.totalTokens,
        });
      }
    }

    // Inférer le mode opérationnel
    const mode = InferModeFromQuery(query);
    const hasGreeted = conversationHistory && conversationHistory.length > 2;

    // Utiliser isFirstAssistantTurn fourni, ou calculer si non fourni (fallback)
    const computedIsFirstAssistantTurn =
      isFirstAssistantTurn !== undefined
        ? isFirstAssistantTurn
        : !conversationHistory || conversationHistory.length === 0;

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

    // Validation: vérifier que tous les messages sont valides
    for (const msg of messages) {
      if (msg.role !== 'user' && msg.role !== 'assistant') {
        throw new Error(`Invalid message role: ${msg.role}`);
      }
      if (typeof msg.content !== 'string') {
        throw new Error(`Invalid message content type: ${typeof msg.content}`);
      }
    }

    const isIdentityQuery =
      /qui\s+es\s*[-]?tu|who\s+are\s+you|quel\s+est\s+ton\s+nom|what\s+is\s+your\s+name/i.test(
        query
      );

    // ⚠️ WORKAROUND: Pour les questions d'identité, retourner une réponse hardcodée
    // Le modèle 8B ignore souvent les instructions d'identité dans le system prompt
    if (isIdentityQuery) {
      const hardcodedResponse =
        'Je suis LARIAN BOT, assistant studio de gestion de projets musicaux.';
      if (isDebugEnabled || process.env.NODE_ENV === 'development') {
        console.warn(
          "[Groq 8B] Question d'identité détectée → réponse hardcodée:",
          hardcodedResponse
        );
      }
      return hardcodedResponse;
    }

    if (isDebugEnabled || (isIdentityQuery && process.env.NODE_ENV === 'development')) {
      const userPromptStartsWith = userPrompt.substring(0, 100);
      const hasIdentityLine = userPrompt.includes('IDENTITÉ: Tu es LARIAN BOT');

      console.warn('[Groq 8B] Appel avec format system + messages', {
        mode,
        hasHistory: conversationHistory && conversationHistory.length > 0,
        historyLength: conversationHistory?.length || 0,
        systemPromptLength: combinedSystemPrompt.length,
        userPromptLength: userPrompt.length,
        userPromptStartsWith: sanitizeForLogs(userPromptStartsWith, 100),
        hasIdentityLine,
        messagesCount: messages.length,
        messagesRoles: messages.map((m) => m.role),
        isIdentityQuery,
      });
    }

    // Choix du modèle selon la complexité (même prompts pour 8B et 70B)
    // L'identité et la discipline ne dépendent pas du modèle
    const modelId = isComplex ? 'llama-3.3-70b-versatile' : 'llama-3.1-8b-instant';

    // Logs dev-only pour rendre le routage observable
    if (isDebugEnabled || process.env.NODE_ENV === 'development') {
      const userPromptStartsWith = userPrompt.substring(0, 100);
      console.warn('[Groq Model Routing] 🎯 Sélection du modèle', {
        requestId: requestId || `groq-${Date.now()}`,
        chosenModelId: modelId,
        reason: isComplex
          ? 'complexity routing (requête complexe détectée)'
          : 'default (requête simple)',
        systemPromptLength: combinedSystemPrompt.length,
        userPromptStartsWith: sanitizeForLogs(userPromptStartsWith, 100),
        hasIdentityLine: userPrompt.includes('IDENTITÉ: Tu es LARIAN BOT'),
        hasDisciplinePrompt:
          combinedSystemPrompt.includes('SYSTEM_DISCIPLINE_PROMPT') ||
          combinedSystemPrompt.includes('You are an assistant with limited memory'),
        messagesCount: messages.length,
      });
    }

    // Appel Groq avec format optimisé pour caching
    // Le system: est cacheable car statique (discipline + identité combinés)
    // Les messages: contiennent l'historique + le prompt user final
    // O8: Validation stricte via SanitizeGroqMessages (remplace les anciens workarounds)
    try {
      // O8: Sanitizer les messages via le module dédié (validation + cleanup)
      // Ceci remplace l'ancien workaround JSON.parse/stringify + gestion manual des prototypes
      const sanitizeResult = sanitizeGroqMessages(messages, { debug: isDebugEnabled });

      if (sanitizeResult.sanitized && isDebugEnabled) {
        console.warn('[Groq 8B] Messages sanitized:', {
          issueCount: sanitizeResult.issues.length,
          issues: sanitizeResult.issues,
        });
      }

      // O8: Messages propres après sanitization
      let finalMessages = sanitizeResult.messages;

      // O8: Cas spécial - questions d'identité (réponse hardcodée déjà gérée plus haut)
      // Pour les prompts trop longs, simplifier vers la question originale
      // NOTE: Ce n'est plus un "workaround" mais une optimisation documentée
      const lastMessageLength = finalMessages[finalMessages.length - 1]?.content?.length || 0;
      const MAX_USER_PROMPT_LENGTH = 800; // Limite produit pour éviter erreurs API

      if (lastMessageLength > MAX_USER_PROMPT_LENGTH) {
        if (isDebugEnabled) {
          console.warn('[Groq 8B] Long prompt detected, simplifying:', {
            originalLength: lastMessageLength,
            threshold: MAX_USER_PROMPT_LENGTH,
          });
        }
        // Remplacer le dernier message par la question simple
        finalMessages = [
          ...finalMessages.slice(0, -1),
          { role: 'user' as const, content: String(query) },
        ];
      }

      // Debug: log des messages finaux
      if (isDebugEnabled) {
        console.warn('[Groq 8B] Final messages:', {
          count: finalMessages.length,
          lengths: finalMessages.map((m) => m.content.length),
          preview: finalMessages.slice(-1).map((m) => m.content.substring(0, 50)),
        });
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
        max_completion_tokens: cappedTokens,
      };

      // O7: Ajouter max_tokens seulement si feature flag activé
      if (SEND_DEPRECATED_MAX_TOKENS) {
        groqPayload.max_tokens = cappedTokens;
        if (isDebugEnabled) {
          console.warn('[Groq Responder] ⚠️ DEPRECATED: max_tokens fallback enabled');
        }
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

      // Log réponse uniquement en debug/dev (éviter les romans en prod)
      if (isDebugEnabled || process.env.NODE_ENV === 'development') {
        console.warn('[Groq 8B] Réponse (fetch direct):', resultText.substring(0, 100) + '...');
      }
      return resultText.trim();
    } catch (apiError) {
      // Log détaillé de l'erreur pour debug
      if (isDebugEnabled || process.env.NODE_ENV === 'development' || isIdentityQuery) {
        console.error('[Groq 8B] Erreur API détaillée:', {
          error: apiError instanceof Error ? apiError.message : String(apiError),
          errorName: apiError instanceof Error ? apiError.name : 'Unknown',
          messagesCount: messages.length,
          messagesRoles: messages.map((m) => m.role),
          messagesContentLengths: messages.map((m) => m.content.length),
          messagesStructure: messages.map((m, i) => ({
            index: i,
            role: m.role,
            contentLength: m.content.length,
            contentPreview: m.content.substring(0, 50),
            hasOnlyRoleAndContent: Object.keys(m).length === 2 && 'role' in m && 'content' in m,
            keys: Object.keys(m),
          })),
        });
      }
      throw apiError; // Re-throw pour être capturé par le catch externe
    }
  } catch (error) {
    // Sanitizer l'erreur avant de logger (éviter l'exposition de données sensibles)
    const errorMessage = error instanceof Error ? error.message : String(error);
    const sanitizedError = sanitizeForLogs(errorMessage, 200);
    const sanitizedStack =
      error instanceof Error && error.stack ? sanitizeForLogs(error.stack, 500) : undefined;

    console.error('[Groq 8B] Erreur:', {
      error: sanitizedError,
      stack: sanitizedStack,
      errorName: error instanceof Error ? error.name : 'Unknown',
    });
    return `Salut ! 🎵 Je suis LARIAN, ton assistant pour tes ${context.projectCount} projets. Demande-moi "combien de ghost prod j'ai" ou "liste mes projets terminés".`;
  }
}
