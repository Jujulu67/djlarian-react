/**
 * Configuration de l'assistant
 *
 * ⚠️ NOTE: Pour les appels Groq côté serveur, utiliser directement createOpenAI
 * dans groq-responder.ts avec la clé API explicite. Ce fichier est conservé
 * pour compatibilité mais ne devrait plus être utilisé pour Groq.
 */
import { createOpenAI } from '@ai-sdk/openai';

/**
 * Configuration Groq pour les questions générales (utilisée par l'action serveur de l'assistant).
 * Pour un appel avec une clé explicite, utiliser createOpenAI comme dans groq-responder.ts.
 */
export const groq = createOpenAI({
  baseURL: 'https://api.groq.com/openai/v1',
  apiKey: process.env.GROQ_API_KEY ?? process.env.OPENAI_API_KEY,
});
