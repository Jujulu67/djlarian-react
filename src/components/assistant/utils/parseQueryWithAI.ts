/**
 * Appel à l'API pour parser la requête avec l'IA
 */
import type { ParsedQuery, QueryFilters } from '../types';

export async function parseQueryWithAI(
  query: string,
  availableCollabs: string[],
  availableStyles: string[],
  projectCount: number,
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string; timestamp: Date }>,
  lastFilters?: QueryFilters
): Promise<ParsedQuery> {
  try {
    const response = await fetch('/api/assistant/parse-query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query,
        context: {
          availableCollabs,
          availableStyles,
          projectCount,
          availableStatuses: [
            'EN_COURS',
            'TERMINE',
            'ANNULE',
            'A_REWORK',
            'GHOST_PRODUCTION',
            'ARCHIVE',
          ],
        },
        // Passer l'historique conversationnel (convertir Date en string pour JSON)
        conversationHistory: conversationHistory?.map((msg) => ({
          role: msg.role,
          content: msg.content,
          timestamp: msg.timestamp instanceof Date ? msg.timestamp.toISOString() : msg.timestamp,
        })),
        // Passer les filtres de la dernière requête pour inférer les filtres manquants
        lastFilters,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to parse query');
    }

    return await response.json();
  } catch (error) {
    console.error('[Assistant] Erreur parsing IA:', error);
    // Fallback basique si l'API échoue
    return {
      filters: {},
      type: 'list',
      understood: false,
      clarification: "Désolé, je n'ai pas compris ta demande. Peux-tu reformuler ?",
    };
  }
}
