/**
 * Configuration de l'assistant
 */
import { createOpenAI } from '@ai-sdk/openai';

/**
 * Configuration Groq pour les questions générales
 */
export const groq = createOpenAI({
  baseURL: 'https://api.groq.com/openai/v1',
  apiKey: process.env.GROQ_API_KEY,
});
