import { NextRequest, NextResponse } from 'next/server';
import { getConversationalResponse } from '@/lib/assistant/conversational/groq-responder';
import type { ConversationMessage } from '@/lib/assistant/conversational/memory-manager';
import { sanitizeForLogs, sanitizeObjectForLogs } from '@/lib/assistant/utils/sanitize-logs';
import {
  getSessionRateLimiter,
  createRateLimitResponse,
} from '@/lib/assistant/rate-limit/SessionRateLimiter';
import { redactPii, isDebugAllowed } from '@/lib/assistant/security/PiiRedactor';

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

/**
 * API route pour les réponses conversationnelles Groq
 *
 * POST /api/assistant/groq
 *
 * Body:
 * - message: string (requis)
 * - conversationHistory?: ConversationMessage[]
 * - context?: { projectCount: number; collabCount: number; styleCount: number }
 * - requestId?: string
 *
 * Returns:
 * - 200: { text: string }
 * - 400: { error: string } (message vide)
 * - 500: { error: string } (erreur serveur)
 */
export async function POST(request: NextRequest) {
  const requestId = `groq-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  try {
    const body = await request.json();
    const {
      message,
      conversationHistory,
      context,
      requestId: clientRequestId,
      isComplex,
      isFirstAssistantTurn,
      sessionId, // O12: Support pour rate limiting par session
    } = body;

    // O12: Rate limiting par session
    if (sessionId) {
      const rateLimiter = getSessionRateLimiter();
      const rateLimitResult = await rateLimiter.check(sessionId);

      if (!rateLimitResult.allowed) {
        const response = createRateLimitResponse(rateLimitResult);
        return NextResponse.json(response.body, {
          status: response.status,
          headers: response.headers,
        });
      }
    }

    // Validation: message non vide
    if (!message || typeof message !== 'string' || message.trim() === '') {
      // O13: Redacter les PII dans les logs
      const sanitizedMessage = redactPii(sanitizeForLogs(String(message || ''), 100));
      console.warn(`[Groq API] ${requestId} ❌ Message vide ou invalide`, {
        requestId: clientRequestId,
        message: sanitizedMessage,
      });
      return NextResponse.json(
        { error: 'Message is required and must be a non-empty string' },
        { status: 400 }
      );
    }

    // Sanitizer le message pour les logs (O13: avec redaction PII)
    const sanitizedMessage = redactPii(sanitizeForLogs(message, 200));
    const logPrefix = clientRequestId ? `[${clientRequestId}]` : `[${requestId}]`;

    // O13: Logs debug avec garde-fou production et redaction PII
    const debugEnabled = isDebugAllowed();
    if (debugEnabled) {
      console.warn(`[Groq API] ${logPrefix} 📥 Requête reçue`, {
        requestId: clientRequestId,
        messageLength: message.length,
        message: sanitizedMessage,
        hasHistory: !!conversationHistory && conversationHistory.length > 0,
        historyLength: conversationHistory?.length || 0,
        context: context
          ? sanitizeObjectForLogs({
              projectCount: context.projectCount,
              collabCount: context.collabCount,
              styleCount: context.styleCount,
            })
          : undefined,
      });
    }

    // Filtrer et valider l'historique conversationnel
    const filteredHistory = filterConversationHistory(conversationHistory);

    // Calculer isFirstAssistantTurn si non fourni (fallback)
    const computedIsFirstAssistantTurn =
      isFirstAssistantTurn !== undefined
        ? isFirstAssistantTurn
        : !filteredHistory || filteredHistory.length === 0;

    // Préparer le contexte (valeurs par défaut si non fourni)
    const groqContext = {
      projectCount: context?.projectCount ?? 0,
      collabCount: context?.collabCount ?? 0,
      styleCount: context?.styleCount ?? 0,
    };

    // Logs debug (derrière flag)
    if (debugEnabled) {
      console.warn(`[Groq API Debug] ${logPrefix} Avant appel getConversationalResponse`, {
        requestId: clientRequestId || requestId,
        messageLength: message.length,
        hasHistory: filteredHistory.length > 0,
        historyLength: filteredHistory.length,
        historyRoles: filteredHistory.slice(0, 5).map((m) => m.role),
      });
    }

    // Assertion dev-only: vérifier l'identité sur "qui es-tu" / "who are you"
    const isIdentityQuery = /qui\s+es\s*[-]?tu|who\s+are\s+you/i.test(message);
    if (isIdentityQuery && debugEnabled) {
      // On ne peut pas accéder directement au system prompt ici, mais on peut logger ce qu'on sait
      console.warn(`[Groq API Identity Check] ${logPrefix} Question d'identité détectée`, {
        requestId: clientRequestId || requestId,
        message: redactPii(sanitizeForLogs(message, 100)),
        hasHistory: filteredHistory.length > 0,
        // Note: systemPromptLength et userPromptStartsWith seront loggés dans groq-responder.ts si ASSISTANT_DEBUG=true
      });
    }

    // Appeler Groq côté serveur (avec complexity routing si fourni)
    const response = await getConversationalResponse(
      message,
      groqContext,
      filteredHistory.length > 0 ? filteredHistory : undefined,
      isComplex || false,
      clientRequestId || requestId,
      computedIsFirstAssistantTurn
    );

    // Sanitizer la réponse pour les logs (O13: avec redaction PII)
    const sanitizedResponse = redactPii(sanitizeForLogs(response, 200));

    // Log réponse uniquement en debug (O13: garde-fou production)
    if (debugEnabled) {
      console.warn(`[Groq API] ${logPrefix} ✅ Réponse générée`, {
        requestId: clientRequestId,
        responseLength: response.length,
        response: sanitizedResponse,
      });
    }

    return NextResponse.json({ text: response }, { status: 200 });
  } catch (error) {
    // Sanitizer l'erreur pour les logs
    const errorMessage = error instanceof Error ? error.message : String(error);
    const sanitizedError = sanitizeForLogs(errorMessage, 200);
    const sanitizedStack =
      error instanceof Error && error.stack ? sanitizeForLogs(error.stack, 500) : undefined;

    console.error(`[Groq API] ${requestId} ❌ Erreur`, {
      requestId,
      error: sanitizedError,
      stack: sanitizedStack,
      errorName: error instanceof Error ? error.name : 'Unknown',
    });

    // Retourner une erreur 500 avec message générique (ne pas exposer les détails)
    return NextResponse.json(
      { error: 'Internal server error while processing Groq request' },
      { status: 500 }
    );
  }
}
