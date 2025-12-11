/**
 * Réponses conversationnelles avec Groq pour les questions générales
 */
import { generateText } from 'ai';
import { groq } from '../config';

/**
 * Génère une réponse conversationnelle avec Groq pour les questions générales
 */
export async function getConversationalResponse(
  query: string,
  context: { projectCount: number; collabCount: number; styleCount: number }
): Promise<string> {
  try {
    const fullPrompt = `[INSTRUCTION] You are the LARIAN assistant for music production management.

CONTEXT:
- You are "The LARIAN assistant"
- User has ${context.projectCount} music projects
- ${context.collabCount} collaborators
- ${context.styleCount} music styles

CRITICAL RULES:
1. DETECT the language of the question
2. RESPOND ONLY in that SAME language - NO translations, NO mixing languages
3. Be informal, friendly, and natural
4. 2-3 sentences MAX, 1-2 emojis
5. ONLY mention projects/music if the question is related to them - if it's a general question (greetings, random topics), respond naturally without forcing the music context
6. If the question is NOT about music/projects, just answer naturally and optionally mention you can help with projects at the end (but don't force it)
7. If the question IS about music/projects, then mention the ${context.projectCount} projects and suggest 1-2 example queries (in the detected language)

QUESTION: "${query}"

ANSWER (ONLY in the question's language, no translations):`;

    console.log('[Groq] Envoi prompt...');

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
