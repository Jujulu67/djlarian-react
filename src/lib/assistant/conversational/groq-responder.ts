/**
 * Réponses conversationnelles avec Groq pour les questions générales
 *
 * OPTIMISÉ POUR 8B:
 * - Utilise system: + messages: pour le caching automatique Groq
 * - Prompt système compact et cacheable
 * - Historique formaté en messages séparés
 */
import { generateText } from 'ai';
import { groq } from '../config';
import type { ConversationMessage } from './memory-manager';
import { prepareConversationContext } from './memory-manager';
import {
  SYSTEM_PROMPT_8B,
  buildUserPrompt,
  formatHistoryForMessages,
} from '../prompts/system-prompt-8b';
import { InferModeFromQuery } from './mode-inference';

/**
 * Génère une réponse conversationnelle avec Groq pour les questions générales
 * Utilise le format system: + messages: pour profiter du caching automatique Groq
 */
export async function getConversationalResponse(
  query: string,
  context: { projectCount: number; collabCount: number; styleCount: number },
  conversationHistory?: ConversationMessage[]
): Promise<string> {
  try {
    // Préparer le contexte conversationnel si on a un historique
    let preparedContext: ReturnType<typeof prepareConversationContext> | null = null;
    let conversationContextString = '';

    if (conversationHistory && conversationHistory.length > 0) {
      preparedContext = prepareConversationContext(conversationHistory);

      // Construire le contexte textuel simplifié
      const parts: string[] = [];

      if (preparedContext.factualMemory) {
        parts.push('KEY FACTS: ' + preparedContext.factualMemory);
      }

      if (preparedContext.recentMessages.length > 0) {
        parts.push('RECENT EXCHANGE:');
        preparedContext.recentMessages.forEach((msg) => {
          const roleLabel = msg.role === 'user' ? 'User' : 'Assistant';
          parts.push(`${roleLabel}: ${msg.content}`);
        });
      }

      conversationContextString = parts.join('\n');

      console.log('[Groq 8B] Contexte préparé:', {
        factualMemory: !!preparedContext.factualMemory,
        recentMessages: preparedContext.recentMessages.length,
        totalTokens: preparedContext.totalTokens,
      });
    }

    // Inférer le mode opérationnel
    const mode = InferModeFromQuery(query);
    const hasGreeted = conversationHistory && conversationHistory.length > 2;

    // Construire le prompt user dynamique
    const userPrompt = buildUserPrompt(
      mode,
      query,
      conversationContextString,
      context,
      !!hasGreeted
    );

    console.log('[Groq 8B] Appel avec format system + messages', {
      mode,
      hasHistory: !!conversationHistory && conversationHistory.length > 0,
      historyLength: conversationHistory?.length || 0,
      systemPromptLength: SYSTEM_PROMPT_8B.length,
      userPromptLength: userPrompt.length,
    });

    // Appel Groq avec format optimisé pour caching
    // Le system: est cacheable car statique
    // Les messages: contiennent le contenu dynamique
    const result = await generateText({
      model: groq('llama-3.1-8b-instant'),
      system: SYSTEM_PROMPT_8B,
      messages: [{ role: 'user', content: userPrompt }],
    });

    console.log('[Groq 8B] Réponse:', result.text.substring(0, 100) + '...');
    return result.text.trim();
  } catch (error) {
    console.error('[Groq 8B] Erreur:', error);
    return `Salut ! 🎵 Je suis LARIAN, ton assistant pour tes ${context.projectCount} projets. Demande-moi "combien de ghost prod j'ai" ou "liste mes projets terminés".`;
  }
}
