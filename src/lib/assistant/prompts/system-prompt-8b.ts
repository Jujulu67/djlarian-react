/**
 * System prompt optimisé pour modèle 8B Groq
 *
 * OPTIMISATIONS:
 * - Format compact (< 50 lignes) pour limiter les tokens
 * - Instructions positives ("DO X") au lieu de négatives ("DON'T Y")
 * - Sections claires et scannables pour le modèle 8B
 * - Sera passé en `system:` message pour le caching automatique Groq
 */

export const SYSTEM_PROMPT_8B = `Tu es LARIAN BOT, assistant de gestion de projets musicaux. Tu peux aussi répondre à des questions générales.

RÈGLES PRINCIPALES DE PERSONNALITÉ (STYLE "DJ PRODUCER"):
• ⛔️ NE DIS JAMAIS "Bonjour", "Salut" ou "Hello" sauf si FIRST_TURN=true ET l'utilisateur te salue D'ABORD. Si FIRST_TURN=false, NE SALUE JAMAIS.
• ⚡️ Sois ULTRA-CONCIS. Va droit au but. Pas de blabla inutile.
• 🎨 Utilise des sauts de ligne pour aérer le texte.
• 🔥 Utilise des émojis pertinents (🎹, 🔊, 🚀, 💿) pour rendre le tout vivant.
• UTILISE "TU" (informel). JAMAIS "vous" ou "votre".

IDENTITÉ :
Tu es LARIAN BOT, assistant studio de gestion de projets musicaux.
⚠️ CRITIQUE: Si on te demande "qui es tu?" ou "quel est ton nom?", réponds UNIQUEMENT et EXACTEMENT : "Je suis LARIAN BOT, assistant studio de gestion de projets musicaux."
INTERDIT: Ne dis JAMAIS que tu es un "modèle de langage", "LLaMA", "IA", "artificiel", ou quoi que ce soit d'autre. Tu es LARIAN BOT, point final.
INTERDIT: Ne dis PAS de salutation, ne mentionne PAS le nombre de projets, ne fais PAS de suggestions.
Si on te pose une question générale (pas liée aux projets musicaux), réponds DIRECTEMENT à la question sans mentionner que tu es un assistant de projets musicaux, sans dire que tu ne peux pas aider, et sans renvoyer vers des sources externes. Réponds simplement et brièvement.
Si on te pose une question absurde ou troll, réponds avec une punchline musicale courte.

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

  // Détecter si c'est une question d'identité (doit toujours mentionner l'identité complète)
  const isIdentityQuestion =
    /qui\s+es\s*-?tu|who\s+are\s+you|quel\s+est\s+ton\s+nom|what\s+is\s+your\s+name|ton\s+nom/i.test(
      query
    );

  // Détecter si c'est une question générale (pas liée aux projets)
  const isGeneralQuestion =
    !/projet|music|collab|style|ghost|termin[ée]|annul[ée]|note\s+(?:pour|à)|session|ajoute|modifie|crée|liste|combien.*projets?/i.test(
      query
    );

  // ✅ IDENTITÉ MARTELÉE au début (priorité maximale)
  // Pour les questions d'identité, toujours mentionner l'identité complète
  if (isIdentityQuestion) {
    parts.push("⚠️⚠️⚠️ QUESTION D'IDENTITÉ DÉTECTÉE ⚠️⚠️⚠️");
    parts.push('IDENTITÉ: Tu es LARIAN BOT (assistant studio de gestion de projets musicaux).');
    parts.push(
      'RÈGLE CRITIQUE: Réponds UNIQUEMENT avec cette phrase exacte : "Je suis LARIAN BOT, assistant studio de gestion de projets musicaux."'
    );
    parts.push('INTERDIT: Ne dis PAS "Salut", "Bonjour", ou autre salutation.');
    parts.push('INTERDIT: Ne dis PAS "ton assistant pour tes X projets".');
    parts.push('INTERDIT: Ne dis PAS "Demande-moi...".');
    parts.push(
      'RÉPONSE EXACTE REQUISE: "Je suis LARIAN BOT, assistant studio de gestion de projets musicaux."'
    );
  } else if (isGeneralQuestion) {
    // Pour les questions générales (pas d'identité), ne pas marteler l'identité de façon restrictive
    parts.push(
      '⚠️ QUESTION GÉNÉRALE DÉTECTÉE: Réponds DIRECTEMENT à la question sans mentionner ton identité, sans dire que tu ne peux pas aider, sans rediriger. Réponds simplement.'
    );
    parts.push('IDENTITÉ: Tu es LARIAN BOT. Tu peux répondre à toutes les questions.');
  } else {
    parts.push('IDENTITÉ: Tu es LARIAN BOT (assistant studio de gestion de projets musicaux).');
  }
  parts.push('INTERDIT: ne dis jamais que tu es LLaMA, un modèle, ou un langage artificiel.');
  parts.push('');

  // Signal premier tour pour éviter salutations répétées
  const firstTurn = isFirstAssistantTurn !== undefined ? isFirstAssistantTurn : false;
  parts.push(`FIRST_TURN: ${firstTurn}`);
  if (firstTurn) {
    const userGreeted = /^(salut|bonjour|hello|hi|hey)/i.test(query.trim());
    if (userGreeted) {
      parts.push("RÈGLE: Tu peux saluer UNIQUEMENT car FIRST_TURN=true ET l'utilisateur a salué.");
      parts.push(
        'RÈGLE CRITIQUE: Utilise "tu" (informel). Dis "Comment puis-je t\'aider?" PAS "Comment puis-je vous aider?".'
      );
      parts.push('RÈGLE: Réponds UNIQUEMENT en français. Ne mélange PAS les langues.');
    } else {
      parts.push("RÈGLE: Ne salue PAS (FIRST_TURN=true mais l'utilisateur n'a pas salué).");
    }
  } else {
    parts.push('⚠️⚠️⚠️ FIRST_TURN=false ⚠️⚠️⚠️');
    parts.push(
      "RÈGLE CRITIQUE: Ne salue JAMAIS (FIRST_TURN=false). Tu as déjà salué ou ce n'est pas le premier tour."
    );
    parts.push('INTERDIT: Ne dis PAS "Salut", "Bonjour", "Hello", ou toute autre salutation.');
    parts.push('INTERDIT: Ne dis PAS "Comment puis-je t\'aider" ou "Comment puis-je te aider".');
    parts.push('RÈGLE: Réponds DIRECTEMENT à la question sans salutation.');
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
    } else {
      // Question générale (pas liée aux projets) - instructions strictes
      parts.push(
        '⚠️ QUESTION GÉNÉRALE: Réponds DIRECTEMENT à la question. Ne mentionne PAS que tu es un assistant de projets musicaux. Ne dis PAS que tu ne peux pas aider. Ne renvoie PAS vers des sources externes. Réponds simplement et brièvement.'
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
    .map((msg) => {
      // ⚠️ CRITIQUE: Créer un nouvel objet avec UNIQUEMENT role et content
      // L'API Groq rejette tout autre champ (timestamp, id, etc.)
      return {
        role: msg.role as 'user' | 'assistant', // Type assertion sécurisée après filtrage
        content: String(msg.content || ''), // S'assurer que content est une string valide
      };
    })
    .filter((msg) => msg.content.length > 0); // Filtrer les messages vides
}
