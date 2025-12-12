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

    // #region agent log
    if (typeof fetch !== 'undefined') {
      fetch('http://127.0.0.1:7242/ingest/38d751ea-33eb-440f-a5ab-c54c1d798768', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: 'parse-query/route.ts:62',
          message: 'Avant parseQuery - contexte disponible',
          data: {
            query: query.substring(0, 100),
            hasConversationHistory: filteredHistory.length > 0,
            conversationHistoryLength: filteredHistory.length,
            lastUserMessage:
              filteredHistory
                .filter((m) => m.role === 'user')
                .slice(-1)[0]
                ?.content?.substring(0, 100) || null,
          },
          timestamp: Date.now(),
          sessionId: 'debug-session',
          runId: 'initial',
          hypothesisId: 'B',
        }),
      }).catch(() => {});
    }
    // #endregion

    const result = parseQuery(
      query,
      availableCollabs,
      availableStyles,
      filteredHistory.length > 0 ? filteredHistory : undefined,
      lastFilters
    );

    // #region agent log
    if (typeof fetch !== 'undefined') {
      fetch('http://127.0.0.1:7242/ingest/38d751ea-33eb-440f-a5ab-c54c1d798768', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: 'parse-query/route.ts:63',
          message: 'parseQuery appelé (API endpoint)',
          data: {
            query: query.substring(0, 100),
            availableCollabs: availableCollabs.length,
            availableStyles: availableStyles.length,
            result: {
              type: result.type,
              understood: result.understood,
              isConversational: result.isConversational,
              filtersCount: Object.keys(result.filters || {}).length,
              filters: result.filters,
              hasUpdateData: !!result.updateData,
              updateData: result.updateData
                ? {
                    newStatus: result.updateData.newStatus,
                    status: result.updateData.status,
                  }
                : null,
            },
          },
          timestamp: Date.now(),
          sessionId: 'debug-session',
          runId: 'initial',
          hypothesisId: 'A',
        }),
      }).catch(() => {});
    }
    // #endregion

    console.log('[Parse Query API] Requête:', query);
    console.log('[Parse Query API] Résultat:', result);
    if (result.isConversational !== undefined) {
      console.log('[Parse Query API] isConversational:', result.isConversational);
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
      console.log(
        '[Parse Query API] ⚠️ Question non liée aux projets mais understood=true:',
        query
      );
    }

    // Si pas compris OU si c'est conversationnel -> appeler Groq
    // Même si understood=true, si isConversational=true, c'est une conversation, pas une commande projet
    if (!result.understood || result.isConversational) {
      let contextResponse: string;

      if (process.env.GROQ_API_KEY) {
        console.log('[Parse Query API] Question générale détectée, appel à Groq...');

        // Filtrer et valider l'historique conversationnel
        const filteredHistory = filterConversationHistory(conversationHistory);
        console.log('[Parse Query API] Historique filtré:', {
          originalLength: conversationHistory?.length || 0,
          filteredLength: filteredHistory.length,
        });

        contextResponse = await getConversationalResponse(
          query,
          {
            projectCount,
            collabCount: availableCollabs.length,
            styleCount: availableStyles.length,
          },
          filteredHistory.length > 0 ? filteredHistory : undefined
        );
      } else {
        // Fallback si pas de clé API
        contextResponse = `Salut ! 🎵 Je suis l'assistant de tes projets musicaux. Demande-moi "combien de ghost prod j'ai" ou "liste mes projets terminés".`;
      }

      console.log('[Parse Query API] Réponse Groq:', contextResponse);

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
