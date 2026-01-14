/**
 * Client Groq API pour l'assistant
 *
 * Ce module encapsule l'appel à l'API Groq pour les réponses conversationnelles.
 * Utilise fetch vers /api/assistant/groq (fonctionne côté client et serveur).
 */

import type { ConversationMessage } from '../conversational/memory-manager';
import { sanitizeForLogs } from '../utils/sanitize-logs';

/**
 * Contexte pour l'appel à l'API Groq
 */
export interface GroqApiContext {
  projectCount: number;
  collabCount: number;
  styleCount: number;
}

/**
 * Appelle l'API Groq pour obtenir une réponse conversationnelle
 * Utilise fetch vers /api/assistant/groq (fonctionne côté client et serveur)
 */
export async function callGroqApi(
  message: string,
  context: GroqApiContext,
  conversationHistory?: ConversationMessage[],
  requestId?: string,
  isComplex?: boolean,
  isFirstAssistantTurn?: boolean
): Promise<string> {
  try {
    // Construire l'URL de l'API
    // Côté client: URL relative fonctionne
    // Côté serveur: utiliser headers() ou NEXT_PUBLIC_SITE_URL si disponible
    let apiUrl = '/api/assistant/groq';

    // Si on est côté serveur et qu'on a NEXT_PUBLIC_SITE_URL, l'utiliser
    // Note: NEXT_PUBLIC_* variables are safe to access client-side
    if (typeof window === 'undefined' && process.env.NEXT_PUBLIC_SITE_URL) {
      apiUrl = `${process.env.NEXT_PUBLIC_SITE_URL}${apiUrl}`;
    }

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        context,
        conversationHistory,
        requestId,
        isComplex: isComplex || false,
        isFirstAssistantTurn:
          isFirstAssistantTurn !== undefined
            ? isFirstAssistantTurn
            : !conversationHistory || conversationHistory.length === 0,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(`Groq API error (${response.status}): ${errorData.error || 'Unknown error'}`);
    }

    const data = await response.json();

    if (!data.text || typeof data.text !== 'string') {
      throw new Error('Invalid response from Groq API: missing text field');
    }

    return data.text;
  } catch (error) {
    // Log l'erreur (sanitizer)
    const errorMessage = error instanceof Error ? error.message : String(error);
    const sanitizedError = sanitizeForLogs(errorMessage, 200);
    console.error("[Router] ❌ Erreur lors de l'appel à Groq API", {
      requestId,
      error: sanitizedError,
    });

    // Retourner un message de fallback
    return `Salut ! 🎵 Je suis LARIAN, ton assistant pour tes ${context.projectCount} projets. Demande-moi "combien de ghost prod j'ai" ou "liste mes projets terminés".`;
  }
}
