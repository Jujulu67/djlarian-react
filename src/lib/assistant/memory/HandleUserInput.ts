/**
 * HandleUserInput - Orchestrateur principal
 * Façade qui coordonne MessageClassifier, Memories, Parser et Groq
 *
 * NOTE (I2): Le "classifier" ici décide si le message va dans ConversationMemory ou ActionMemory.
 * Le vrai routing de commandes est fait par router/router.ts.
 */

import {
  Message,
  ChatMessage,
  ActionMessage,
  RouterDecision,
  generateId,
  ActionResult,
} from './Types';
import { getConversationMemoryStore, ConversationMemoryStore } from './ConversationMemoryStore';
import { getActionMemoryStore, ActionMemoryStore } from './ActionMemoryStore';
import {
  getRouter as getMessageClassifier,
  Router as MessageClassifier,
} from './MessageClassifier';
import { getGroqPayloadBuilder, GroqPayloadBuilder } from './GroqPayloadBuilder';
import { getActionParser, ActionParser } from './ActionParser';

// ==========================================================================
// Types
// ==========================================================================

export interface HandleUserInputOptions {
  sessionId: string;
  userId?: string;
  groqApiKey?: string;
  systemPrompt?: string;
}

export interface HandleUserInputResult {
  /** Message(s) à ajouter au transcript UI */
  transcriptMessages: Message[];
  /** Décision du router */
  routerDecision: RouterDecision;
  /** Réponse texte (chat ou résultat action) */
  responseText: string;
  /** Résultat d'action si applicable */
  actionResult?: ActionResult;
  /** Debug info si ASSISTANT_DEBUG=true */
  debug?: DebugInfo;
}

interface DebugInfo {
  requestId: string;
  routerConfidence: number;
  routerReason: string;
  conversationMemorySize: number;
  actionMemorySnapshot: Record<string, unknown>;
  groqPayloadMessageCount?: number;
}

// ==========================================================================
// Main Handler
// ==========================================================================

export async function handleUserInput(
  userInput: string,
  options: HandleUserInputOptions
): Promise<HandleUserInputResult> {
  const requestId = generateId();
  const debug = process.env.ASSISTANT_DEBUG === 'true';

  // 1. Récupérer les stores
  const conversationStore = getConversationMemoryStore(options.sessionId, {
    userId: options.userId,
  });
  const actionStore = getActionMemoryStore(options.sessionId, { userId: options.userId });
  const classifier = getMessageClassifier(); // Renommé: router → classifier (I2)
  const parser = getActionParser();
  const payloadBuilder = getGroqPayloadBuilder({ systemPrompt: options.systemPrompt });

  // 2. Vérifier si confirmation en attente
  const pendingConfirmation = actionStore.getPendingConfirmation();

  // 3. Classifier le message (pour décider la mémoire)
  const routerResult = classifier.route(userInput, !!pendingConfirmation);

  if (debug) {
    // eslint-disable-next-line no-console -- Debug-only log gated behind ASSISTANT_DEBUG
    console.log(
      `[HandleUserInput][${requestId}] Decision: ${routerResult.decision} (${routerResult.confidence})`
    );
  }

  // 4. Dispatch selon la décision
  let result: HandleUserInputResult;

  switch (routerResult.decision) {
    case 'GENERAL_CHAT':
      result = await handleGeneralChat(
        userInput,
        conversationStore,
        payloadBuilder,
        options,
        requestId
      );
      break;

    case 'ACTION_COMMAND':
      result = await handleActionCommand(userInput, actionStore, parser, requestId);
      break;

    case 'AMBIGUOUS':
      result = await handleAmbiguous(
        userInput,
        conversationStore,
        payloadBuilder,
        options,
        requestId
      );
      break;

    default:
      result = {
        transcriptMessages: [],
        routerDecision: 'AMBIGUOUS',
        responseText: 'Erreur interne de routing',
      };
  }

  // 5. Ajouter debug info
  if (debug) {
    result.debug = {
      requestId,
      routerConfidence: routerResult.confidence,
      routerReason: routerResult.reason,
      conversationMemorySize: conversationStore.size,
      actionMemorySnapshot: actionStore.getContext() as unknown as Record<string, unknown>,
    };
  }

  return result;
}

// ==========================================================================
// Handlers par type
// ==========================================================================

async function handleGeneralChat(
  userInput: string,
  store: ConversationMemoryStore,
  builder: GroqPayloadBuilder,
  options: HandleUserInputOptions,
  requestId: string
): Promise<HandleUserInputResult> {
  // 1. Ajouter le message user à ConversationMemory
  const userMessage = store.add('user', userInput);

  // 2. Construire le payload Groq
  const payload = builder.build(store);

  // 3. Appeler Groq (stub - à remplacer par appel réel)
  const assistantResponse = await callGroqApi(payload, options.groqApiKey);

  // 4. Ajouter la réponse à ConversationMemory
  const assistantMessage = store.add('assistant', assistantResponse);

  // 5. Construire les messages pour le transcript
  const transcriptMessages: Message[] = [];

  if (userMessage) {
    transcriptMessages.push(userMessage);
  }

  if (assistantMessage) {
    transcriptMessages.push(assistantMessage);
  }

  return {
    transcriptMessages,
    routerDecision: 'GENERAL_CHAT',
    responseText: assistantResponse,
  };
}

async function handleActionCommand(
  userInput: string,
  store: ActionMemoryStore,
  parser: ActionParser,
  requestId: string
): Promise<HandleUserInputResult> {
  // 1. Parser la commande
  const parsedAction = parser.parse(userInput);

  // 2. Exécuter l'action
  const actionResult = await parser.execute(parsedAction, store);

  // 3. Construire le message action pour le transcript
  const actionMessage: ActionMessage = {
    id: generateId(),
    kind: 'action',
    role: 'assistant',
    command: userInput,
    actionType: parsedAction.type,
    result: actionResult,
    timestamp: Date.now(),
    sessionId: store.getContext().lastScope, // Utilise le scope comme session proxy
  };

  // 4. Mettre à jour ActionMemory
  store.setLastActionType(parsedAction.type);

  // 5. Retourner (NE PAS ajouter à ConversationMemory)
  return {
    transcriptMessages: [actionMessage],
    routerDecision: 'ACTION_COMMAND',
    responseText: actionResult.message,
    actionResult,
  };
}

async function handleAmbiguous(
  userInput: string,
  store: ConversationMemoryStore,
  builder: GroqPayloadBuilder,
  options: HandleUserInputOptions,
  requestId: string
): Promise<HandleUserInputResult> {
  // 1. Construire un payload de clarification
  const payload = builder.buildClarificationPayload(store, userInput);

  // 2. Appeler Groq pour clarification
  const clarificationResponse = await callGroqApi(payload, options.groqApiKey);

  // 3. Ajouter à ConversationMemory (la clarification est du chat)
  const userMessage = store.add('user', userInput);
  const assistantMessage = store.add('assistant', clarificationResponse);

  const transcriptMessages: Message[] = [];
  if (userMessage) transcriptMessages.push(userMessage);
  if (assistantMessage) transcriptMessages.push(assistantMessage);

  return {
    transcriptMessages,
    routerDecision: 'AMBIGUOUS',
    responseText: clarificationResponse,
  };
}

// ==========================================================================
// Groq API Call (Stub)
// ==========================================================================

async function callGroqApi(
  payload: { messages: Array<{ role: string; content: string }> },
  apiKey?: string
): Promise<string> {
  // STUB: Remplacer par appel réel à Groq
  // Exemple avec fetch:
  /*
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    return data.choices[0].message.content;
    */

  // Pour le moment, retourne un message stub
  const lastUserMessage = payload.messages.filter((m) => m.role === 'user').pop();
  return `[Stub Response] J'ai bien reçu: "${lastUserMessage?.content.substring(0, 50) || 'votre message'}"`;
}

// ==========================================================================
// Export index
// ==========================================================================

export { getConversationMemoryStore } from './ConversationMemoryStore';
export { getActionMemoryStore } from './ActionMemoryStore';
export { getRouter } from './MessageClassifier'; // Renommé (I2)
export { getGroqPayloadBuilder } from './GroqPayloadBuilder';
export { getActionParser } from './ActionParser';
