/**
 * Handler pour les requêtes conversationnelles via Groq
 */

import { ProjectCommandType, type ProjectCommandResult } from './types';
import { callGroqApi } from '../groq-client';
import type { ConversationMessage } from '../../conversational/memory-manager';

/**
 * Gère les questions conversationnelles via Groq
 */
export async function handleConversationalQuery(
  userMessage: string,
  projectCount: number,
  availableCollabs: string[],
  availableStyles: string[],
  conversationHistory: ConversationMessage[] | undefined,
  isComplex: boolean,
  requestId?: string
): Promise<ProjectCommandResult> {
  // Calculer isFirstAssistantTurn: vrai si pas d'historique conversationnel
  const isFirstAssistantTurn = !conversationHistory || conversationHistory.length === 0;

  const response = await callGroqApi(
    userMessage,
    {
      projectCount,
      collabCount: availableCollabs.length,
      styleCount: availableStyles.length,
    },
    conversationHistory,
    requestId,
    isComplex,
    isFirstAssistantTurn
  );

  return {
    type: ProjectCommandType.GENERAL,
    response,
    requestId,
  };
}
