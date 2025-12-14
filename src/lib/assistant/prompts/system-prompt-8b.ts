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
  hasGreeted: boolean,
  isFirstAssistantTurn?: boolean
): string {
  const parts: string[] = [];

  // ✅ IDENTITÉ MARTELÉE au début (priorité maximale)
  parts.push('IDENTITÉ: Tu es LARIAN BOT (assistant studio de gestion de projets musicaux).');
  parts.push('INTERDIT: ne dis jamais que tu es LLaMA, un modèle, ou un langage artificiel.');
  parts.push('');

  // Signal premier tour pour éviter salutations répétées
  const firstTurn = isFirstAssistantTurn !== undefined ? isFirstAssistantTurn : false;
  parts.push(`FIRST_TURN: ${firstTurn}`);
  if (firstTurn) {
    const userGreeted = /^(salut|bonjour|hello|hi|hey)/i.test(query.trim());
    if (userGreeted) {
      parts.push("RÈGLE: Tu peux saluer UNIQUEMENT car FIRST_TURN=true ET l'utilisateur a salué.");
    } else {
      parts.push("RÈGLE: Ne salue PAS (FIRST_TURN=true mais l'utilisateur n'a pas salué).");
    }
  } else {
    parts.push(
      "RÈGLE: Ne salue JAMAIS (FIRST_TURN=false). Tu as déjà salué ou ce n'est pas le premier tour."
    );
  }
  parts.push('');

  parts.push(
    "RÈGLE: N'invente jamais de fonctionnalités. Si on te demande ce que tu sais faire, décris uniquement les actions disponibles dans l'app (projets: list/create/update/note + confirmations + scope + sécurité)."
  );
  parts.push('');

  // Mode explicite
  parts.push(`MODE: ${mode}`);
  parts.push('');

  // Contexte conversationnel (si disponible) - FACTUAL MEMORY / INTERPRETATIVE NOTES
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
 * Filtre strictement les rôles pour garantir 'user' | 'assistant' uniquement
 */
export function formatHistoryForMessages(
  recentMessages: Array<{ role: 'user' | 'assistant'; content: string }>
): Array<{ role: 'user' | 'assistant'; content: string }> {
  return recentMessages
    .filter((msg) => msg.role === 'user' || msg.role === 'assistant')
    .map((msg) => ({
      role: msg.role as 'user' | 'assistant', // Type assertion sécurisée après filtrage
      content: msg.content,
    }));
}
