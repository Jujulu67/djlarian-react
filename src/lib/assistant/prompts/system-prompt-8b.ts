/**
 * System prompt optimisé pour modèle 8B Groq
 *
 * OPTIMISATIONS:
 * - Format compact (< 50 lignes) pour limiter les tokens
 * - Instructions positives ("DO X") au lieu de négatives ("DON'T Y")
 * - Sections claires et scannables pour le modèle 8B
 * - Sera passé en `system:` message pour le caching automatique Groq
 */

export const SYSTEM_PROMPT_8B = `Tu es LARIAN, assistant de gestion de projets musicaux.

RÈGLES PRINCIPALES:
• Réponds dans la MÊME langue que la question
• Sois DIRECT et CONCIS (1-3 phrases max)
• Salue UNE SEULE fois au début, puis plus jamais
• Utilise "tu" (informel)

MODES:
• CHAT: Ton amical, 1-2 emojis max
• FACT: Bullet points uniquement, pas d'emojis
• SUMMARY: Compresse sans inventer, préserve les nombres
• COMMAND: 1 phrase max, confirmation directe

FORMAT RÉPONSE:
• Question simple → 1 phrase
• Explication → 2-3 phrases max
• Rappel demandé → Cherche dans RECENT EXCHANGE

INTERDIT:
• Inventer des informations
• Promettre des actions futures ("je vais te donner...")
• Répéter la même info plusieurs fois
• Parler de projets si pas demandé`;

/**
 * Construit le prompt user dynamique selon le mode
 */
export function buildUserPrompt(
  mode: string,
  query: string,
  conversationContext: string,
  context: { projectCount: number; collabCount: number; styleCount: number },
  hasGreeted: boolean
): string {
  const parts: string[] = [];

  // Mode explicite
  parts.push(`MODE: ${mode}`);
  parts.push('');

  // Contexte conversationnel (si disponible)
  if (conversationContext) {
    parts.push(conversationContext);
    parts.push('');
  }

  // Instructions spécifiques au mode CHAT
  if (mode === 'CHAT') {
    const isAboutProjects = /projet|music|collab|style|ghost|termin[ée]|annul[ée]/i.test(query);

    if (isAboutProjects) {
      parts.push(
        `CONTEXTE PROJETS: ${context.projectCount} projets, ${context.collabCount} collabs, ${context.styleCount} styles`
      );
    }

    if (hasGreeted) {
      parts.push('⚠️ Tu as déjà salué - ne salue plus');
    }
    parts.push('');
  }

  // Question
  parts.push(`QUESTION: "${query}"`);

  return parts.join('\n');
}

/**
 * Formate l'historique conversationnel pour le format messages[]
 */
export function formatHistoryForMessages(
  recentMessages: Array<{ role: 'user' | 'assistant'; content: string }>
): Array<{ role: 'user' | 'assistant'; content: string }> {
  return recentMessages.map((msg) => ({
    role: msg.role,
    content: msg.content,
  }));
}
