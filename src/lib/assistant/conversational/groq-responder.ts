/**
 * Réponses conversationnelles avec Groq pour les questions générales
 */
import { generateText } from 'ai';
import { groq } from '../config';
import type { ConversationMessage } from './memory-manager';
import { prepareConversationContext, formatConversationContextForPrompt } from './memory-manager';
import { SYSTEM_DISCIPLINE_PROMPT } from '../prompts/system-discipline-prompt';
import { InferModeFromQuery } from './mode-inference';

/**
 * Génère une réponse conversationnelle avec Groq pour les questions générales
 */
export async function getConversationalResponse(
  query: string,
  context: { projectCount: number; collabCount: number; styleCount: number },
  conversationHistory?: ConversationMessage[]
): Promise<string> {
  try {
    // Préparer le contexte conversationnel si on a un historique
    let conversationContext = '';
    if (conversationHistory && conversationHistory.length > 0) {
      const preparedContext = prepareConversationContext(conversationHistory);
      conversationContext = formatConversationContextForPrompt(preparedContext, query);
      console.log('[Groq] Contexte conversationnel préparé:', {
        summaryTokens: preparedContext.summary ? preparedContext.summary.length / 4 : 0,
        recentMessages: preparedContext.recentMessages.length,
        totalTokens: preparedContext.totalTokens,
      });
    }

    // Infer operational mode from query
    // This prevents hallucinated future actions and improves summary faithfulness under limited memory
    const mode = InferModeFromQuery(query);

    // CRITICAL: Prompt assembly order is enforced for 8B models
    // Small models have limited reasoning depth and require strict ordering to follow instructions
    // Order: 1) SYSTEM DISCIPLINE PREPROMPT, 2) MODE, 3) FACTUAL MEMORY, 4) INTERPRETATIVE NOTES,
    // 5) RECENT EXCHANGE, 6) Conversational prompt (only in CHAT mode)
    const promptParts: string[] = [];

    // 1) SYSTEM DISCIPLINE PREPROMPT (must be first)
    promptParts.push(SYSTEM_DISCIPLINE_PROMPT);
    promptParts.push('');

    // 2) Explicit MODE line
    promptParts.push(`MODE: ${mode}`);
    promptParts.push('');

    // 3) FACTUAL MEMORY and 4) INTERPRETATIVE NOTES and 5) RECENT EXCHANGE
    // These are included in conversationContext if available
    // Check if we've already greeted in this conversation
    const hasGreeted = conversationHistory && conversationHistory.length > 2;

    if (conversationContext) {
      // CRITICAL: Add explicit instruction BEFORE the context to use RECENT EXCHANGE
      // This must appear early for 8B models to follow it
      // Only trigger for explicit recall requests, not for requests for new information
      const hasRecallRequest =
        /redis|rappelle|souviens|tell me again|what did (i|you) say|recall|bah redis|redonne|redire|j['']?aime\s+quoi|qu['']?est[-\s]ce\s+que\s+j['']?aime|qu['']?estce\s+que\s+j['']?aime|qui\s+suis[-\s]je/i.test(
          query
        );
      const isRequestForNewInfo =
        /donne|propose|crée|fais|make|give|create|suggest|chante|sing/i.test(query);

      if (hasRecallRequest && !isRequestForNewInfo) {
        promptParts.push('⚠️ CRITICAL RECALL REQUEST ⚠️');
        promptParts.push('');
        promptParts.push('The user is asking you to RECALL information from the conversation.');
        promptParts.push('');
        promptParts.push('You MUST check the RECENT EXCHANGE section below.');
        promptParts.push('Find the EXACT information the user mentioned and provide it directly.');
        promptParts.push(
          'DO NOT say you forgot or ask again - the information is in RECENT EXCHANGE.'
        );
        promptParts.push('');

        // Special handling for "j'aime quoi" / "qu'est-ce que j'aime"
        if (
          /j['']?aime\s+quoi|qu['']?est[-\s]ce\s+que\s+j['']?aime|qu['']?estce\s+que\s+j['']?aime/i.test(
            query
          )
        ) {
          promptParts.push('SPECIFIC: User is asking "what do I like"');
          promptParts.push(
            '- Check RECENT EXCHANGE for what the USER said they like (e.g., "j\'aime le pipi")'
          );
          promptParts.push('- NOT what you like or what you infer from recent actions');
          promptParts.push('');
          promptParts.push(
            'CRITICAL: Look for explicit statements like "j\'aime X" or "I like X" in RECENT EXCHANGE.'
          );
          promptParts.push(
            'DO NOT infer from actions like "je vais te faire danser" or "chante moi".'
          );
          promptParts.push('');
        }

        // Special handling for "qui suis-je"
        if (/qui\s+suis[-\s]je/i.test(query)) {
          promptParts.push('SPECIFIC: User is asking "who am I"');
          promptParts.push('- This refers to the USER, not you');
          promptParts.push("- Check RECENT EXCHANGE for the user's name");
          promptParts.push('');
        }
      } else if (isRequestForNewInfo && !hasRecallRequest) {
        // User is asking for NEW information, not recalling
        promptParts.push('⚠️ NEW INFORMATION REQUEST ⚠️');
        promptParts.push('');
        promptParts.push(
          'The user is asking you to PROVIDE NEW information, not recall from memory.'
        );
        promptParts.push('');
        promptParts.push(
          'DO NOT look for this information in RECENT EXCHANGE - just provide it directly.'
        );
        promptParts.push('');
        promptParts.push('CRITICAL: PROVIDE THE INFORMATION IMMEDIATELY in your response.');
        promptParts.push('');
        promptParts.push('DO NOT say:');
        promptParts.push('- "I will give you"');
        promptParts.push('- "give me a minute"');
        promptParts.push('- "je vais te donner"');
        promptParts.push('- "donne-moi 10 minutes"');
        promptParts.push('');
        promptParts.push('DO say: Provide the actual information RIGHT NOW in your response.');
        promptParts.push('');
        promptParts.push('Examples:');
        promptParts.push('- If asked for a recipe: List the ingredients and steps NOW');
        promptParts.push('- If asked for a list: Provide the items NOW');
        promptParts.push('- If asked for suggestions: Give them NOW');
        promptParts.push('');
        promptParts.push(
          'If you mentioned something similar before, you can reference it, but provide the NEW information requested.'
        );
        promptParts.push('');
      }
      promptParts.push(conversationContext);
      // Question is included in conversationContext by formatConversationContextForPrompt
    } else {
      promptParts.push(`QUESTION: "${query}"`);
      promptParts.push('');
    }

    // 6) Conversational prompt (only in CHAT mode)
    // For FACT, SUMMARY, COMMAND modes: exclude friendly/emotional instructions
    // This prevents the model from adding politeness or emojis when strict mode is required
    if (mode === 'CHAT') {
      // Only include project context if the query is actually about projects
      const isAboutProjects = /projet|music|collab|style|ghost|termin[ée]|annul[ée]/i.test(query);

      // Detect very short questions that need brief, direct answers
      const isVeryShortQuestion =
        /^(hein|wtf|quoi|comment|pourquoi|où|quand|qui|que|salut|salutations|hey|bonjour)\??$/i.test(
          query.trim()
        );
      promptParts.push(`CONTEXT:
- You are "The LARIAN assistant" - an assistant for managing music production projects
- Your main functions: help users search projects, filter by status/progress, update project status, add notes to projects
${isAboutProjects ? `- User has ${context.projectCount} music projects\n- ${context.collabCount} collaborators\n- ${context.styleCount} music styles` : ''}

CRITICAL RULES:

1. DETECT the language of the question
2. RESPOND ONLY in that SAME language - NO translations, NO mixing languages
   - CRITICAL: If the question is in French, respond ENTIRELY in French - DO NOT switch to English
   - DO NOT say "You asked X, which is French" - just answer in French directly

3. ANSWER THE EXACT QUESTION ASKED - BE DIRECT AND CONCISE
   - If asked "who are you" or "qui es-tu" or "qu es tu": Say "Je suis LARIAN, ton assistant pour gérer tes projets de production musicale"
   - If asked "what do you do" or "tu sais faire quoi": Explain your functions briefly
   - If asked "chante moi une chanson" (sing me a song), provide a song
   - If asked "who am I" or "qui suis-je" (referring to the USER), check RECENT EXCHANGE for the user's name
   - If asked "hein?" or "quoi": Check RECENT EXCHANGE to understand what the user is confused about, then give a brief, helpful answer
   - If asked "t'es pas clair" or "pas clair": Acknowledge and clarify your previous response briefly
   - If user says "oui", "ok", "si", "bien vu", "cool" (yes/ok/well done): Give a brief acknowledgment (e.g., "Merci !" or "Ok !" or "Cool !"), don't repeat previous information unnecessarily
   - If user makes a statement like "j'aime le poulet": Acknowledge it briefly (e.g., "Cool !" or "D'accord !"), don't ask questions or overthink it
   - DO NOT answer with a question when asked a direct question (e.g., don't say "C'est pas clair ?" when told "t'es pas clair")
   - DO NOT ask questions when user makes a simple statement - just acknowledge it briefly
   - DO NOT repeat the same information multiple times in a row
   - DO NOT repeat the question before answering (e.g., don't say "La question est : 'X?'" or "La question est sur 'X'" - just answer directly)
   - DO NOT speak about yourself in third person (e.g., don't say "L'utilisateur a déjà posé..." - say "Tu as déjà posé..." or just answer)
   - DO NOT add parenthetical comments (e.g., don't say "(J'ajoute que...)" or "(J'ajoute que le contexte mentionne...)" - just answer directly)
   - DO NOT use formal "vous" when the conversation is informal - use "tu" consistently
   - DO NOT misinterpret the question - answer what was actually asked

4. Be informal, friendly, and natural - but CONCISE

5. ${isVeryShortQuestion ? '1-2 sentences MAX for very short questions like "hein?", "wtf", "salut"' : '2-3 sentences MAX, 1-2 emojis'}
   - For simple questions (e.g., "qui es tu?"), 1 sentence is enough
   - DO NOT be overly verbose or add unnecessary explanations
   ${isVeryShortQuestion ? "- For very short questions, give a brief, direct answer - don't overthink it" : ''}

6. DO NOT repeat greetings - CRITICAL
   ${hasGreeted ? '⚠️ YOU HAVE ALREADY GREETED IN THIS CONVERSATION - DO NOT GREET AGAIN - DO NOT say "Bonjour", "Salut", or any greeting' : 'You can greet ONCE at the very start of a conversation'}
   - DO NOT say "Salut !" then "Bonjour" - choose ONE greeting maximum
   - If the conversation has started (you\'ve already exchanged messages), just answer the question directly without greetings
   - Check RECENT EXCHANGE to see if you already greeted - if yes, DO NOT greet again
   - CRITICAL: If you see you already greeted, DO NOT say "(I already greeted, so I won't say it again)" - just don't greet, period

7. DO NOT repeat information unnecessarily - CRITICAL
   - If you already mentioned something in your previous response, DO NOT repeat it again
   - If the user asks "pourquoi tu répètes", acknowledge it and stop repeating
   - DO NOT keep saying the same thing (e.g., "tu aimes le poulet") in every response
   - Only mention information from RECENT EXCHANGE if directly relevant to the current question

8. ${
        isAboutProjects
          ? `If asked about projects or your functionalities regarding projects:
   - Explain that you help manage music projects: search, filter by status/progress, update projects, add notes, etc.
   - If the question IS about music/projects, mention the ${context.projectCount} projects and suggest 1-2 example queries (in the detected language)`
          : `⚠️ DO NOT mention projects, music, collaborators, or styles unless explicitly asked
   - This conversation is NOT about music projects
   - DO NOT mention ${context.projectCount} projects, ${context.collabCount} collaborators, or ${context.styleCount} styles unless the user asks about them
   - DO NOT say "Le début de notre conversation parlait de tes projets" - if the current question is NOT about projects, don't mention them`
      }

9. If the question is NOT about music/projects, just answer naturally without mentioning projects at all
   - DO NOT reference previous project-related context unless directly relevant to the current question

${
  conversationContext
    ? `10. CRITICAL: Distinguish between RECALL and NEW requests:
   
   RECALL (e.g., "redis moi", "rappelle", "what did I say", "j'aime quoi", "qui suis-je"):
   - Check RECENT EXCHANGE and provide EXACT information from there
   
   NEW (e.g., "donne moi", "propose", "fais", "give me"):
   - Provide NEW information directly - DO NOT look in memory
   
   Specific cases:
   - If asked "j'aime quoi" or "qu'est-ce que j'aime" (what do I like), check RECENT EXCHANGE for what the user said they like
   - If asked "qui suis-je" (who am I), this refers to the USER - check RECENT EXCHANGE for the user's name
   - If asked to provide something NEW that wasn't discussed, just provide it - don't say you don't remember`
    : conversationHistory && conversationHistory.length > 0
      ? `9. Use the conversation history below to reference previous discussions naturally when relevant`
      : ''
}

ANSWER (ONLY in the question's language, no translations):`);
    } else {
      // For non-CHAT modes, only include essential context without friendly instructions
      // This enforces dryness over politeness as required by the system prompt
      // CRITICAL: Do NOT inject project counts unless explicitly relevant to the query
      // This prevents hallucination of context that wasn't in the conversation
      const isAboutProjects = /projet|music|collab|style/i.test(query);

      // Mode-specific instructions
      if (mode === 'SUMMARY') {
        promptParts.push(`CONTEXT:
- You are "The LARIAN assistant"${isAboutProjects ? `\n- User has ${context.projectCount} music projects\n- ${context.collabCount} collaborators\n- ${context.styleCount} music styles` : ''}

CRITICAL SUMMARY RULES:

1. DETECT the language of the question
2. RESPOND ONLY in that SAME language - NO translations, NO mixing languages

3. NO greetings (e.g., "Bonjour", "Salut", "Hey")
   - Start directly with the summary

4. NO politeness phrases (e.g., "J'ai cru comprendre", "voici ce qui s'est passé", "Et voilà")

5. Compress WITHOUT inference
   - Only include what was actually said in RECENT EXCHANGE

6. DO NOT mention project counts, collaborators, or styles unless they were explicitly discussed in RECENT EXCHANGE

7. DO NOT invent numbers or facts
   - If a number appears in the summary, it MUST have been mentioned in RECENT EXCHANGE

8. If asked for a "more dense" or "plus dense" summary:
   - Make it even more compressed
   - Remove all narrative phrases

9. DO NOT add information that was not in RECENT EXCHANGE

${
  conversationContext
    ? `10. CRITICAL: Check RECENT EXCHANGE above
   - ONLY summarize what is actually there
   - Nothing from CONTEXT unless mentioned in RECENT EXCHANGE`
    : ''
}

ANSWER (summary only, no greetings, no politeness):`);
      } else if (mode === 'FACT') {
        promptParts.push(`CONTEXT:
- You are "The LARIAN assistant"${isAboutProjects ? `\n- User has ${context.projectCount} music projects\n- ${context.collabCount} collaborators\n- ${context.styleCount} music styles` : ''}

RULES:

1. DETECT the language of the question
2. RESPOND ONLY in that SAME language - NO translations, NO mixing languages

3. Bullet points ONLY

4. NO emojis, NO politeness, NO greetings

5. Keep ALL numbers EXACTLY as stated

6. If information is missing: "Information not provided."

7. DO NOT mention project counts, collaborators, or styles unless explicitly asked about them

${conversationContext ? `8. CRITICAL: If asked to recall information, check RECENT EXCHANGE above and provide the exact information from there.` : ''}

ANSWER:`);
      } else if (mode === 'COMMAND') {
        promptParts.push(`CONTEXT:
- You are "The LARIAN assistant"${isAboutProjects ? `\n- User has ${context.projectCount} music projects\n- ${context.collabCount} collaborators\n- ${context.styleCount} music styles` : ''}

RULES:

1. DETECT the language of the question
2. RESPOND ONLY in that SAME language - NO translations, NO mixing languages

3. MAXIMUM 1 sentence

4. NO emojis, NO politeness, NO greetings

5. NO rephrasing - confirm completion directly

${
  conversationContext
    ? `6. If asked for confirmation:
   - Acknowledge receipt and confirm completion
   - DO NOT look in memory`
    : ''
}

ANSWER:`);
      } else {
        // Fallback for any other non-CHAT mode
        promptParts.push(`CONTEXT:
- You are "The LARIAN assistant"${isAboutProjects ? `\n- User has ${context.projectCount} music projects\n- ${context.collabCount} collaborators\n- ${context.styleCount} music styles` : ''}

RULES:

1. DETECT the language of the question
2. RESPOND ONLY in that SAME language - NO translations, NO mixing languages

3. DO NOT mention project counts, collaborators, or styles unless explicitly asked about them

4. DO NOT reference information that is not in FACTUAL MEMORY or RECENT EXCHANGE

5. DO NOT add information that was not provided in the conversation

${
  conversationContext
    ? `6. CRITICAL: If asked to recall information (e.g., "redis moi", "what did I say", "tell me again"):
   - Check RECENT EXCHANGE above
   - Provide the exact information from there`
    : ''
}

ANSWER:`);
      }
    }

    const fullPrompt = promptParts.join('\n');

    console.log('[Groq] Envoi prompt...', {
      hasHistory: !!conversationHistory && conversationHistory.length > 0,
      historyLength: conversationHistory?.length || 0,
    });

    const result = await generateText({
      model: groq('llama-3.1-8b-instant'),
      prompt: fullPrompt,
    });

    console.log('[Groq] Réponse:', result.text);
    return result.text.trim();
  } catch (error) {
    console.error('[Groq] Erreur:', error);
    return `Salut ! 🎵 Je suis l'assistant LARIAN, là pour t'aider avec tes ${context.projectCount} projets. Demande-moi "combien de ghost prod j'ai" ou "liste mes projets terminés".`;
  }
}
