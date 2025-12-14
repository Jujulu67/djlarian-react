import { NextRequest, NextResponse } from 'next/server';
import { parseQuery } from '@/lib/assistant/query-parser';
import { getConversationalResponse } from '@/lib/assistant/conversational/groq-responder';
import type { ConversationMessage } from '@/lib/assistant/conversational/memory-manager';

/**
 * Filtre et valide l'historique conversationnel
 * Ne garde que les messages valides (user/assistant avec contenu)
 */
function filterConversationHistory(history: any[] | undefined): ConversationMessage[] {
  if (!history || !Array.isArray(history)) {
    return [];
  }

  return history
    .filter((msg) => {
      // Vérifier que c'est un message valide
      if (!msg || typeof msg !== 'object') return false;
      if (msg.role !== 'user' && msg.role !== 'assistant') return false;
      if (!msg.content || typeof msg.content !== 'string' || msg.content.trim() === '') {
        return false;
      }
      return true;
    })
    .map((msg) => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content.trim(),
      timestamp: msg.timestamp || new Date().toISOString(),
    }));
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    let { query, context, conversationHistory, lastFilters } = body;

    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    // Nettoyer la requête: enlever les guillemets en début/fin qui peuvent causer des problèmes de classification
    // Exemple: "\"et les terminés?\"" ou "et les terminés?\"" doit devenir "et les terminés?"
    query = query.trim();
    // Enlever les guillemets doubles au début
    if (query.startsWith('"')) {
      query = query.slice(1);
    }
    // Enlever les guillemets doubles à la fin
    if (query.endsWith('"')) {
      query = query.slice(0, -1);
    }
    // Enlever les guillemets simples au début
    if (query.startsWith("'")) {
      query = query.slice(1);
    }
    // Enlever les guillemets simples à la fin
    if (query.endsWith("'")) {
      query = query.slice(0, -1);
    }
    query = query.trim();

    const { availableCollabs = [], availableStyles = [], projectCount = 0 } = context || {};

    // Filtrer et valider l'historique conversationnel
    const filteredHistory = filterConversationHistory(conversationHistory);

    // Debug log (utilise le système de debug existant)
    // Removed hardcoded fetch to localhost endpoint - use debugLog instead

    const result = parseQuery(
      query,
      availableCollabs,
      availableStyles,
      filteredHistory.length > 0 ? filteredHistory : undefined,
      lastFilters
    );

    // Debug log (utilise le système de debug existant)
    // Removed hardcoded fetch to localhost endpoint - use debugLog instead

    console.warn('[Parse Query API] Requête:', query);
    console.warn('[Parse Query API] Résultat:', result);
    if (result.isConversational !== undefined) {
      console.warn('[Parse Query API] isConversational:', result.isConversational);
    }
    // Debug pour les questions qui ne devraient pas parser
    // Exclure les cas où on a détecté une note (updateData avec projectName et newNote)
    const hasNoteUpdate =
      result.updateData &&
      'projectName' in result.updateData &&
      'newNote' in result.updateData &&
      (result.updateData as any).projectName &&
      (result.updateData as any).newNote;
    if (result.understood && !/projet|project/i.test(query.toLowerCase()) && !hasNoteUpdate) {
      console.warn(
        '[Parse Query API] ⚠️ Question non liée aux projets mais understood=true:',
        query
      );
    }

    // Si pas compris OU si c'est conversationnel -> appeler Groq
    // Même si understood=true, si isConversational=true, c'est une conversation, pas une commande projet
    if (!result.understood || result.isConversational) {
      let contextResponse: string;

      if (process.env.GROQ_API_KEY) {
        console.warn('[Parse Query API] Question générale détectée, appel à Groq...');

        // Filtrer et valider l'historique conversationnel
        const filteredHistory = filterConversationHistory(conversationHistory);
        console.warn('[Parse Query API] Historique filtré:', {
          originalLength: conversationHistory?.length || 0,
          filteredLength: filteredHistory.length,
        });

        // Utiliser isComplex du résultat parseQuery si disponible
        const isComplex = result.isComplex || false;

        contextResponse = await getConversationalResponse(
          query,
          {
            projectCount,
            collabCount: availableCollabs.length,
            styleCount: availableStyles.length,
          },
          filteredHistory.length > 0 ? filteredHistory : undefined,
          isComplex,
          undefined // Pas de requestId dans ce chemin
        );
      } else {
        // Fallback si pas de clé API
        contextResponse = `Salut ! 🎵 Je suis l'assistant de tes projets musicaux. Demande-moi "combien de ghost prod j'ai" ou "liste mes projets terminés".`;
      }

      console.warn('[Parse Query API] Réponse Groq:', contextResponse);

      return NextResponse.json({
        ...result,
        understood: true,
        isConversational: true,
        clarification: contextResponse,
      });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('[Parse Query API] Erreur:', error);
    return NextResponse.json({
      filters: {},
      type: 'list',
      understood: false,
      clarification: "Je n'ai pas compris. Reformule ?",
    });
  }
}

// Exporter parseQuery pour les tests
export { parseQuery };
