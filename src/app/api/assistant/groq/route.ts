import { NextRequest, NextResponse } from 'next/server';
import { isInternalRequest, requireAuth } from '@/lib/api/requireAuth';
import { getConversationalResponse } from '@/lib/assistant/conversational/groq-responder';
import type { ConversationMessage } from '@/lib/assistant/conversational/memory-manager';
import { sanitizeForLogs, sanitizeObjectForLogs } from '@/lib/assistant/utils/sanitize-logs';
import {
  getSessionRateLimiter,
  createRateLimitResponse,
} from '@/lib/assistant/rate-limit/SessionRateLimiter';
import {
  ASSISTANT_INPUT_TOO_LONG,
  isAssistantInputTooLong,
} from '@/lib/assistant/security/input-limits';
import { redactPii, isDebugAllowed } from '@/lib/assistant/security/PiiRedactor';
import { logger } from '@/lib/logger';
import { randomToken } from '@/lib/utils/random';

interface GroqRequestContext {
  projectCount: number;
  collabCount: number;
  styleCount: number;
}

/**
 * Filtre et valide l'historique conversationnel
 * Ne garde que les messages valides (user/assistant avec contenu)
 */
function filterConversationHistory(history: unknown): ConversationMessage[] {
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
 * Applique la limite de débit par session. Renvoie la réponse 429 si la session est bloquée.
 */
async function enforceSessionRateLimit(sessionId: string): Promise<NextResponse | null> {
  const rateLimiter = getSessionRateLimiter();
  const rateLimitResult = await rateLimiter.check(sessionId);

  if (rateLimitResult.allowed) return null;

  const response = createRateLimitResponse(rateLimitResult);
  return NextResponse.json(response.body, {
    status: response.status,
    headers: response.headers,
  });
}

/**
 * Message de requête valide : chaîne non vide
 */
function isNonEmptyMessage(message: unknown): message is string {
  return Boolean(message) && typeof message === 'string' && message.trim() !== '';
}

/**
 * Log (redacté) puis réponse 400 pour un message vide ou invalide
 */
function rejectEmptyMessage(
  message: unknown,
  requestId: string,
  clientRequestId: string | undefined
): NextResponse {
  // O13: Redacter les PII dans les logs
  const sanitizedMessage = redactPii(sanitizeForLogs(String(message || ''), 100));
  logger.warn(`[Groq API] ${requestId} ❌ Message vide ou invalide`, {
    requestId: clientRequestId,
    message: sanitizedMessage,
  });
  return NextResponse.json(
    { error: 'Message is required and must be a non-empty string' },
    { status: 400 }
  );
}

/**
 * Valide le message entrant : renvoie la réponse d'erreur, ou null si le message est acceptable
 */
function validateMessageInput(
  message: unknown,
  requestId: string,
  clientRequestId: string | undefined
): NextResponse | null {
  if (!isNonEmptyMessage(message)) {
    return rejectEmptyMessage(message, requestId, clientRequestId);
  }
  if (isAssistantInputTooLong(message)) {
    return NextResponse.json({ error: ASSISTANT_INPUT_TOO_LONG }, { status: 413 });
  }
  return null;
}

/**
 * Logs debug (derrière garde-fou) de la requête entrante
 */
function logIncomingRequest(params: {
  logPrefix: string;
  message: string;
  sanitizedMessage: string;
  clientRequestId: string | undefined;
  conversationHistory: ConversationMessage[] | undefined;
  context: GroqRequestContext | undefined;
}): void {
  const { logPrefix, message, sanitizedMessage, clientRequestId, conversationHistory, context } =
    params;
  logger.warn(`[Groq API] ${logPrefix} 📥 Requête reçue`, {
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

/**
 * Log debug juste avant l'appel à Groq
 */
function logPreCallDebug(
  message: string,
  logPrefix: string,
  requestId: string,
  filteredHistory: ConversationMessage[]
): void {
  logger.warn(`[Groq API Debug] ${logPrefix} Avant appel getConversationalResponse`, {
    requestId,
    messageLength: message.length,
    hasHistory: filteredHistory.length > 0,
    historyLength: filteredHistory.length,
    historyRoles: filteredHistory.slice(0, 5).map((m) => m.role),
  });
}

/**
 * Log debug d'une question d'identité ("qui es-tu" / "who are you")
 */
function logIdentityCheck(
  message: string,
  logPrefix: string,
  requestId: string,
  filteredHistory: ConversationMessage[]
): void {
  // On ne peut pas accéder directement au system prompt ici, mais on peut logger ce qu'on sait
  logger.warn(`[Groq API Identity Check] ${logPrefix} Question d'identité détectée`, {
    requestId,
    message: redactPii(sanitizeForLogs(message, 100)),
    hasHistory: filteredHistory.length > 0,
    // Note: systemPromptLength et userPromptStartsWith seront loggés dans groq-responder.ts si ASSISTANT_DEBUG=true
  });
}

/**
 * Calcule isFirstAssistantTurn si non fourni (fallback sur l'historique filtré)
 */
function resolveIsFirstAssistantTurn(
  isFirstAssistantTurn: boolean | undefined,
  filteredHistory: ConversationMessage[]
): boolean {
  if (isFirstAssistantTurn !== undefined) return isFirstAssistantTurn;
  return !filteredHistory || filteredHistory.length === 0;
}

/**
 * Contexte Groq avec valeurs par défaut si non fourni
 */
function buildGroqContext(context: Partial<GroqRequestContext> | undefined): GroqRequestContext {
  return {
    projectCount: context?.projectCount ?? 0,
    collabCount: context?.collabCount ?? 0,
    styleCount: context?.styleCount ?? 0,
  };
}

/**
 * Message d'erreur et nom d'erreur sanitizés pour les logs
 */
function describeError(error: unknown): {
  sanitizedError: string;
  sanitizedStack: string | undefined;
  errorName: string;
} {
  const errorMessage = error instanceof Error ? error.message : String(error);
  return {
    sanitizedError: sanitizeForLogs(errorMessage, 200),
    sanitizedStack:
      error instanceof Error && error.stack ? sanitizeForLogs(error.stack, 500) : undefined,
    errorName: error instanceof Error ? error.name : 'Unknown',
  };
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
  // Réservé aux utilisateurs connectés ou aux appels internes du serveur (quota Groq)
  if (!isInternalRequest(request)) {
    const { error: authError } = await requireAuth();
    if (authError) return authError;
  }

  const requestId = `groq-${Date.now()}-${randomToken(9)}`;

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
      const rateLimitResponse = await enforceSessionRateLimit(sessionId);
      if (rateLimitResponse) return rateLimitResponse;
    }

    // Validation: message non vide et de taille raisonnable
    const rejection = validateMessageInput(message, requestId, clientRequestId);
    if (rejection) return rejection;

    // Sanitizer le message pour les logs (O13: avec redaction PII)
    const sanitizedMessage = redactPii(sanitizeForLogs(message, 200));
    const logPrefix = clientRequestId ? `[${clientRequestId}]` : `[${requestId}]`;

    // O13: Logs debug avec garde-fou production et redaction PII
    const debugEnabled = isDebugAllowed();
    if (debugEnabled) {
      logIncomingRequest({
        logPrefix,
        message,
        sanitizedMessage,
        clientRequestId,
        conversationHistory,
        context,
      });
    }

    // Filtrer et valider l'historique conversationnel
    const filteredHistory = filterConversationHistory(conversationHistory);

    const computedIsFirstAssistantTurn = resolveIsFirstAssistantTurn(
      isFirstAssistantTurn,
      filteredHistory
    );

    // Préparer le contexte (valeurs par défaut si non fourni)
    const groqContext = buildGroqContext(context);

    // Logs debug (derrière flag)
    if (debugEnabled) {
      logPreCallDebug(message, logPrefix, clientRequestId || requestId, filteredHistory);
    }

    // Assertion dev-only: vérifier l'identité sur "qui es-tu" / "who are you"
    const isIdentityQuery = /qui\s+es\s*-?tu|who\s+are\s+you/i.test(message);
    if (isIdentityQuery && debugEnabled) {
      logIdentityCheck(message, logPrefix, clientRequestId || requestId, filteredHistory);
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
      logger.warn(`[Groq API] ${logPrefix} ✅ Réponse générée`, {
        requestId: clientRequestId,
        responseLength: response.length,
        response: sanitizedResponse,
      });
    }

    return NextResponse.json({ text: response }, { status: 200 });
  } catch (error) {
    // Sanitizer l'erreur pour les logs
    const { sanitizedError, sanitizedStack, errorName } = describeError(error);

    logger.error(`[Groq API] ${requestId} ❌ Erreur`, {
      requestId,
      error: sanitizedError,
      stack: sanitizedStack,
      errorName,
    });

    // Retourner une erreur 500 avec message générique (ne pas exposer les détails)
    return NextResponse.json(
      { error: 'Internal server error while processing Groq request' },
      { status: 500 }
    );
  }
}
