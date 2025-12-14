/**
 * Réponses conversationnelles avec Groq pour les questions générales
 *
 * OPTIMISÉ POUR 8B:
 * - Utilise system: + messages: pour le caching automatique Groq
 * - Prompt système compact et cacheable
 * - Historique formaté en messages séparés
 *
 * ⚠️ SERVER-ONLY: Ce module ne peut pas être exécuté côté client
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
        console.log('[Groq 8B] Contexte préparé:', {
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
    const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [
      ...historyAsMessages,
      { role: 'user', content: userPrompt },
    ];

    const isIdentityQuery = /qui\s+es\s*[-]?tu|who\s+are\s+you/i.test(query);

    if (isDebugEnabled || (isIdentityQuery && process.env.NODE_ENV === 'development')) {
      const userPromptStartsWith = userPrompt.substring(0, 100);
      const hasIdentityLine = userPrompt.includes('IDENTITÉ: Tu es LARIAN BOT');

      console.log('[Groq 8B] Appel avec format system + messages', {
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
      console.log('[Groq Model Routing] 🎯 Sélection du modèle', {
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
    // ⚠️ IMPORTANT: Même prompts pour 8B et 70B (identité et discipline ne dépendent pas du modèle)
    const result = await generateText({
      model: groq(modelId),
      system: combinedSystemPrompt,
      messages,
    });

    // Log réponse uniquement en debug/dev (éviter les romans en prod)
    if (isDebugEnabled || process.env.NODE_ENV === 'development') {
      console.log('[Groq 8B] Réponse:', result.text.substring(0, 100) + '...');
    }
    return result.text.trim();
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
