/**
 * Gestionnaire de mémoire conversationnelle pour l'assistant
 * Implémente une stratégie hybride : fenêtre glissante + résumé intelligent
 */

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date | string;
}

export interface PreparedConversationContext {
  summary?: string;
  recentMessages: ConversationMessage[];
  totalTokens: number;
  factualMemory?: string;
  interpretativeNotes?: string;
}

/**
 * Estimation approximative du nombre de tokens
 * Approximation : 1 token ≈ 4 caractères pour le français/anglais
 */
export function estimateTokens(text: string): number {
  // Approximation simple : 1 token ≈ 4 caractères
  // Pour être plus précis, on pourrait utiliser une librairie, mais cette approximation est suffisante
  return Math.ceil(text.length / 4);
}

/**
 * Tronque un message à une limite de tokens
 */
function truncateMessage(message: string, maxTokens: number): string {
  const maxChars = maxTokens * 4; // Approximation
  if (message.length <= maxChars) return message;
  return message.substring(0, maxChars - 3) + '...';
}

/**
 * Prépare le contexte conversationnel avec une stratégie hybride
 * - Garde les N derniers messages complets (fenêtre glissante)
 * - Résume les messages plus anciens si nécessaire
 */
export function prepareConversationContext(
  messages: ConversationMessage[],
  maxRecent: number = 12,
  maxSummaryTokens: number = 200,
  maxMessageTokens: number = 150,
  maxTotalTokens: number = 2000
): PreparedConversationContext {
  if (messages.length === 0) {
    return {
      recentMessages: [],
      totalTokens: 0,
    };
  }

  // Réduire à 5 messages récents si on va avoir un summary
  // Optimisé pour les modèles 8B qui gèrent mieux les contextes courts
  const willHaveSummary = messages.length > maxRecent;
  // 5 messages pour les 8B models (plus efficace que 8)
  const effectiveMaxRecent = willHaveSummary ? 5 : Math.min(maxRecent, 8);

  // Séparer les messages récents et anciens
  const recentMessages = messages.slice(-effectiveMaxRecent);
  const oldMessages = messages.slice(0, -effectiveMaxRecent);

  // Tronquer les messages récents si nécessaire
  const truncatedRecent = recentMessages.map((msg) => ({
    ...msg,
    content: truncateMessage(msg.content, maxMessageTokens),
  }));

  // Calculer les tokens des messages récents
  let totalTokens = truncatedRecent.reduce((sum, msg) => sum + estimateTokens(msg.content), 0);

  // Si on a des messages anciens, créer un résumé séparé en mémoire factuelle et notes interprétatives
  let summary: string | undefined;
  let factualMemory: string | undefined;
  let interpretativeNotes: string | undefined;
  if (oldMessages.length > 0) {
    // Extraire les faits (nombres, dates, contraintes, informations objectives)
    const factualItems: string[] = [];
    // Extraire les préférences et opinions (interprétatif)
    const interpretativeItems: string[] = [];

    // Parcourir les messages par paires (user, assistant)
    for (let i = 0; i < oldMessages.length - 1; i += 2) {
      if (oldMessages[i].role === 'user' && oldMessages[i + 1]?.role === 'assistant') {
        const question = truncateMessage(oldMessages[i].content, 40);
        const answer = truncateMessage(oldMessages[i + 1].content, 60);

        // Extraire les faits (nombres, dates, contraintes)
        const numberPattern = /\d+/g;
        const hasNumbers = numberPattern.test(answer);
        const constraintPattern =
          /(?:contrainte|constraint|limite|limit|budget|salaire|€|\$|ans|années|years)/i;
        const hasConstraints = constraintPattern.test(answer);

        if (hasNumbers || hasConstraints) {
          // Extraire la partie factuelle (nombres, dates, contraintes)
          const factualPart = answer
            .split(/[.!?]/)
            .filter((sentence) => numberPattern.test(sentence) || constraintPattern.test(sentence))
            .slice(0, 2)
            .join('. ');
          if (factualPart.length > 10 && factualPart.length < 100) {
            factualItems.push(`${question} → ${factualPart}`);
          }
        }

        // Extraire les préférences importantes avec plusieurs patterns
        // Patterns pour capturer : "je préfère X", "j'aime X", "mon choix est X", "je dirais X", "X est mon préféré"
        const preferencePatterns = [
          /(?:je\s+pr[ée]f[èe]re|j['']?aime|mon\s+choix|je\s+dirais|je\s+choisirais)\s+([^.!?]+)/i,
          /([^.!?]+)\s+(?:est\s+mon\s+pr[ée]f[èe]r[ée]|est\s+ma\s+pr[ée]f[èe]r[ée]e)/i,
          /(?:pr[ée]f[èe]re|choisirais)\s+(?:l['']?|le\s+|la\s+)?([^.!?]+)/i,
        ];

        let preferenceFound = false;
        for (const pattern of preferencePatterns) {
          const match = answer.match(pattern);
          if (match && match[1]) {
            const preference = match[1].trim();
            // Nettoyer la préférence (enlever les mots de liaison en fin)
            const cleanedPreference = preference
              .replace(/\s+(car|parce\s+que|car|mais|donc|alors|ensuite|après|avant).*$/i, '')
              .trim();
            if (cleanedPreference.length > 2 && cleanedPreference.length < 50) {
              interpretativeItems.push(`${question} → ${cleanedPreference}`);
              preferenceFound = true;
              break;
            }
          }
        }

        if (!preferenceFound && !hasNumbers && !hasConstraints) {
          // Si pas de préférence claire ni de faits, garder un résumé très court (première phrase)
          const firstSentence = answer.split(/[.!?]/)[0].trim();
          if (firstSentence.length > 10 && firstSentence.length < 80) {
            interpretativeItems.push(`${question} → ${firstSentence}`);
          }
        }
      }
    }

    // Construire la mémoire factuelle
    if (factualItems.length > 0) {
      factualMemory = factualItems.slice(0, 5).join(' | ');
      if (factualItems.length > 5) {
        factualMemory += '...';
      }
      // Limiter à maxSummaryTokens / 2 pour laisser de la place aux notes interprétatives
      if (estimateTokens(factualMemory) > maxSummaryTokens / 2) {
        factualMemory = truncateMessage(factualMemory, maxSummaryTokens / 2);
      }
      totalTokens += estimateTokens(factualMemory);
    }

    // Construire les notes interprétatives
    if (interpretativeItems.length > 0) {
      interpretativeNotes = interpretativeItems.slice(0, 5).join(' | ');
      if (interpretativeItems.length > 5) {
        interpretativeNotes += '...';
      }
      // Limiter à maxSummaryTokens / 2
      if (estimateTokens(interpretativeNotes) > maxSummaryTokens / 2) {
        interpretativeNotes = truncateMessage(interpretativeNotes, maxSummaryTokens / 2);
      }
      totalTokens += estimateTokens(interpretativeNotes);
    }

    // Fallback: si pas de séparation possible, utiliser l'ancien format pour compatibilité
    if (!factualMemory && !interpretativeNotes) {
      const userTopics: string[] = [];
      const assistantTopics: string[] = [];

      oldMessages.forEach((msg) => {
        const truncated = truncateMessage(msg.content, 50);
        if (msg.role === 'user') {
          userTopics.push(truncated);
        } else {
          assistantTopics.push(truncated);
        }
      });

      const userSummary =
        userTopics.length > 0
          ? `L'utilisateur a mentionné : ${userTopics.slice(0, 3).join(', ')}${userTopics.length > 3 ? '...' : ''}`
          : '';
      const assistantSummary =
        assistantTopics.length > 0
          ? `L'assistant a répondu sur : ${assistantTopics.slice(0, 2).join(', ')}${assistantTopics.length > 2 ? '...' : ''}`
          : '';

      summary = [userSummary, assistantSummary].filter(Boolean).join('. ');
      if (estimateTokens(summary) > maxSummaryTokens) {
        summary = truncateMessage(summary, maxSummaryTokens);
      }
      totalTokens += estimateTokens(summary);
    }
  }

  // Si on dépasse la limite totale, réduire progressivement
  if (totalTokens > maxTotalTokens) {
    // Réduire d'abord le nombre de messages récents
    const targetTokens = maxTotalTokens - (summary ? estimateTokens(summary) : 0);
    let currentTokens = 0;
    const limitedRecent: ConversationMessage[] = [];

    // Ajouter les messages un par un jusqu'à atteindre la limite
    for (let i = truncatedRecent.length - 1; i >= 0; i--) {
      const msg = truncatedRecent[i];
      const msgTokens = estimateTokens(msg.content);
      if (currentTokens + msgTokens <= targetTokens) {
        limitedRecent.unshift(msg);
        currentTokens += msgTokens;
      } else {
        break;
      }
    }

    return {
      summary,
      recentMessages: limitedRecent,
      totalTokens:
        currentTokens +
        (summary ? estimateTokens(summary) : 0) +
        (factualMemory ? estimateTokens(factualMemory) : 0) +
        (interpretativeNotes ? estimateTokens(interpretativeNotes) : 0),
      factualMemory,
      interpretativeNotes,
    };
  }

  return {
    summary,
    recentMessages: truncatedRecent,
    totalTokens,
    factualMemory,
    interpretativeNotes,
  };
}

/**
 * Formate le contexte pour le prompt Groq
 * Reorganizes memory into FACTUAL MEMORY and INTERPRETATIVE NOTES sections
 *
 * CRITICAL: Sections must be explicitly labeled and NOT merged.
 * RECENT EXCHANGE is limited to max 8 messages when summary exists (handled in prepareConversationContext).
 * This formatting ensures 8B models can reliably distinguish between factual and interpretative memory.
 */
export function formatConversationContextForPrompt(
  context: PreparedConversationContext,
  currentQuery: string
): string {
  const parts: string[] = [];

  // FACTUAL MEMORY section (explicitly labeled, not merged with other sections)
  if (context.factualMemory) {
    parts.push('FACTUAL MEMORY:');
    parts.push(context.factualMemory);
    parts.push('');
  }

  // INTERPRETATIVE NOTES section (explicitly labeled, separate from factual memory)
  if (context.interpretativeNotes) {
    parts.push('INTERPRETATIVE NOTES:');
    parts.push(context.interpretativeNotes);
    parts.push('');
  }

  // Fallback to old summary format if new format not available (backward compatibility)
  if (context.summary && !context.factualMemory && !context.interpretativeNotes) {
    parts.push('FACTUAL MEMORY:');
    parts.push(context.summary);
    parts.push('');
  }

  // RECENT EXCHANGE (max 6 messages when summary exists, handled upstream)
  if (context.recentMessages.length > 0) {
    parts.push('RECENT EXCHANGE:');
    context.recentMessages.forEach((msg) => {
      const roleLabel = msg.role === 'user' ? 'User' : 'Assistant';
      parts.push(`${roleLabel}: ${msg.content}`);
    });
    parts.push('');
  }

  // Current question is included here for proper ordering in prompt assembly
  parts.push(`QUESTION: "${currentQuery}"`);

  return parts.join('\n');
}
