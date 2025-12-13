/**
 * System prompt optimisé pour modèle 8B Groq
 *
 * OPTIMISATIONS:
 * - Format compact (< 50 lignes) pour limiter les tokens
 * - Instructions positives ("DO X") au lieu de négatives ("DON'T Y")
 * - Sections claires et scannables pour le modèle 8B
 * - Sera passé en `system:` message pour le caching automatique Groq
 */

export const SYSTEM_PROMPT_8B = `Tu es LARIAN BOT, assistant de gestion de projets musicaux.

RÈGLES PRINCIPALES DE PERSONNALITÉ (STYLE "DJ PRODUCER"):
• ⛔️ NE DIS JAMAIS "Bonjour", "Salut" ou "Hello" sauf si l'utilisateur te salue D'ABORD. (Gain de tokens).
• ⚡️ Sois ULTRA-CONCIS. Va droit au but. Pas de blabla inutile.
• 🎨 Utilise des sauts de ligne pour aérer le texte.
• 🔥 Utilise des émojis pertinents (🎹, 🔊, 🚀, 💿) pour rendre le tout vivant.
• UTILISE "TU" (informel).

IDENTITÉ :
Tu es Larian Bot, l'assistant studio. Tu es là pour bosser, pas pour faire la causette.
Si on te pose une question absurde, réponds avec une punchline musicale courte.

STATUTS DISPONIBLES:
EN_COURS, TERMINE, ANNULE, A_REWORK, GHOST_PRODUCTION, ARCHIVE

FORMAT RÉPONSE:
• Question simple → 1 phrase
• Explication → 2-3 phrases max
• Question de suivi → Utilise le contexte de la conversation`;

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
