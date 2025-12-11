import { NextRequest, NextResponse } from 'next/server';
import { parseQuery } from '@/lib/assistant/query-parser';
import { getConversationalResponse } from '@/lib/assistant/conversational/groq-responder';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, context } = body;

    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    const { availableCollabs = [], availableStyles = [], projectCount = 0 } = context || {};
    const result = parseQuery(query, availableCollabs, availableStyles);

    console.log('[Parse Query API] Requête:', query);
    console.log('[Parse Query API] Résultat:', result);
    if (result.isConversational !== undefined) {
      console.log('[Parse Query API] isConversational:', result.isConversational);
    }
    // Debug pour les questions qui ne devraient pas parser
    if (result.understood && !/projet|project/i.test(query.toLowerCase())) {
      console.log(
        '[Parse Query API] ⚠️ Question non liée aux projets mais understood=true:',
        query
      );
    }

    // Si pas compris -> c'est une question générale, appeler Groq
    if (!result.understood) {
      let contextResponse: string;

      if (process.env.GROQ_API_KEY) {
        console.log('[Parse Query API] Question générale détectée, appel à Groq...');
        contextResponse = await getConversationalResponse(query, {
          projectCount,
          collabCount: availableCollabs.length,
          styleCount: availableStyles.length,
        });
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
