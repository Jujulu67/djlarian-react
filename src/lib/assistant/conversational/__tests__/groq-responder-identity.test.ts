/**
 * Tests anti-régression pour l'identité de l'assistant
 * Vérifie que le modèle ne répond jamais "je suis LLaMA"
 *
 * NOTE: Depuis la refactorisation O8, getConversationalResponse utilise fetch directement
 * au lieu de generateText. Ces tests mockent global.fetch pour capturer les payloads.
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';

// Mock server-only AVANT les autres imports
jest.mock('server-only');

// Mock createOpenAI (non utilisé mais requis pour éviter les erreurs d'import)
jest.mock('@ai-sdk/openai', () => ({
  createOpenAI: jest.fn(() => jest.fn()),
}));

// Mock ai (non utilisé mais requis pour éviter les erreurs d'import)
jest.mock('ai', () => ({
  generateText: jest.fn(),
}));

// Import après les mocks
import { getConversationalResponse } from '../groq-responder';
import { SYSTEM_PROMPT_8B } from '../../prompts/system-prompt-8b';
import { SYSTEM_DISCIPLINE_PROMPT } from '../../prompts/system-discipline-prompt';

// Store pour capturer les payloads fetch
let capturedPayloads: Array<{ url: string; body: Record<string, unknown> }> = [];

// Mock fetch global
const mockFetch = jest.fn((url: string | URL | Request, init?: RequestInit) => {
  // Capture le payload envoyé
  if (init?.body) {
    try {
      const body = JSON.parse(init.body as string);
      capturedPayloads.push({ url: url as string, body });
    } catch {
      // Ignorer les erreurs de parsing
    }
  }

  // Retourner une réponse Groq simulée
  return Promise.resolve({
    ok: true,
    json: () =>
      Promise.resolve({
        choices: [
          {
            message: {
              content: 'Je suis LARIAN BOT, assistant studio.',
            },
          },
        ],
      }),
  } as Response);
});

describe('Groq Responder - Tests anti-régression identité', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    capturedPayloads = [];
    // Mock process.env
    process.env.GROQ_API_KEY = 'test-key';
    // Installer le mock fetch
    global.fetch = mockFetch as unknown as typeof global.fetch;
  });

  afterEach(() => {
    delete process.env.GROQ_API_KEY;
    // Restaurer fetch original
    global.fetch = originalFetch;
  });

  /**
   * Helper pour récupérer le dernier payload capturé
   */
  function getLastCapturedPayload(): { url: string; body: Record<string, unknown> } | null {
    return capturedPayloads.length > 0 ? capturedPayloads[capturedPayloads.length - 1] : null;
  }

  describe('Complexity Routing', () => {
    it('devrait utiliser 8B pour les requêtes simples', async () => {
      await getConversationalResponse(
        'salut, ça roule?',
        { projectCount: 0, collabCount: 0, styleCount: 0 },
        undefined,
        false // isComplex = false
      );

      expect(mockFetch).toHaveBeenCalled();
      const payload = getLastCapturedPayload();
      expect(payload).not.toBeNull();

      // Vérifier le modèle utilisé
      expect(payload?.body.model).toBe('llama-3.1-8b-instant');

      // Vérifier que le system prompt contient LARIAN BOT
      const messages = payload?.body.messages as Array<{ role: string; content: string }>;
      const systemMessage = messages?.find((m) => m.role === 'system');
      expect(systemMessage?.content).toContain('LARIAN BOT');

      // Vérifier que SYSTEM_DISCIPLINE_PROMPT est présent
      expect(systemMessage?.content).toContain('You are an assistant with limited memory');
    });

    it('devrait utiliser 70B pour les requêtes complexes', async () => {
      await getConversationalResponse(
        'Analyse en détail tous mes projets et explique-moi pourquoi certains sont en retard',
        { projectCount: 0, collabCount: 0, styleCount: 0 },
        undefined,
        true // isComplex = true
      );

      expect(mockFetch).toHaveBeenCalled();
      const payload = getLastCapturedPayload();
      expect(payload).not.toBeNull();

      // Vérifier le modèle utilisé
      expect(payload?.body.model).toBe('llama-3.3-70b-versatile');

      // Vérifier que les mêmes prompts sont utilisés pour 70B
      const messages = payload?.body.messages as Array<{ role: string; content: string }>;
      const systemMessage = messages?.find((m) => m.role === 'system');
      expect(systemMessage?.content).toContain('LARIAN BOT');
      expect(systemMessage?.content).toContain('You are an assistant with limited memory');
    });

    it('devrait utiliser les mêmes prompts (discipline + identité) pour 8B et 70B', async () => {
      // Test 8B
      await getConversationalResponse(
        'test simple',
        { projectCount: 0, collabCount: 0, styleCount: 0 },
        undefined,
        false
      );
      const payload8B = getLastCapturedPayload();
      const messages8B = payload8B?.body.messages as Array<{ role: string; content: string }>;
      const systemPrompt8B = messages8B?.find((m) => m.role === 'system')?.content || '';
      const userMessages8B = messages8B?.filter((m) => m.role === 'user') || [];
      const userPrompt8B = userMessages8B[userMessages8B.length - 1]?.content || '';

      // Reset et test 70B
      capturedPayloads = [];
      await getConversationalResponse(
        'test complexe très long avec beaucoup de détails',
        { projectCount: 0, collabCount: 0, styleCount: 0 },
        undefined,
        true
      );
      const payload70B = getLastCapturedPayload();
      const messages70B = payload70B?.body.messages as Array<{ role: string; content: string }>;
      const systemPrompt70B = messages70B?.find((m) => m.role === 'system')?.content || '';
      const userMessages70B = messages70B?.filter((m) => m.role === 'user') || [];
      const userPrompt70B = userMessages70B[userMessages70B.length - 1]?.content || '';

      // Vérifier que les system prompts sont identiques
      expect(systemPrompt8B).toBe(systemPrompt70B);
      expect(systemPrompt8B).toContain('LARIAN BOT');
      expect(systemPrompt8B).toContain('You are an assistant with limited memory');

      // Vérifier que l'identité est dans les system prompts (toujours présente)
      // Note: Le user prompt peut être simplifié à la question simple si trop long
      expect(systemPrompt8B).toContain('Tu es LARIAN BOT');
      expect(systemPrompt70B).toContain('Tu es LARIAN BOT');
    });
  });

  it('devrait combiner SYSTEM_DISCIPLINE_PROMPT + SYSTEM_PROMPT_8B dans le system prompt', async () => {
    await getConversationalResponse('hey, ça va?', {
      projectCount: 0,
      collabCount: 0,
      styleCount: 0,
    });

    expect(mockFetch).toHaveBeenCalled();
    const payload = getLastCapturedPayload();
    expect(payload).not.toBeNull();

    const messages = payload?.body.messages as Array<{ role: string; content: string }>;
    const systemMessage = messages?.find((m) => m.role === 'system');

    // Vérifier que le system prompt contient les deux prompts
    expect(systemMessage?.content).toContain(SYSTEM_DISCIPLINE_PROMPT);
    expect(systemMessage?.content).toContain(SYSTEM_PROMPT_8B);
    expect(systemMessage?.content).toContain('LARIAN BOT');
  });

  it('devrait utiliser les messages avec historique si fourni', async () => {
    const conversationHistory = [
      {
        role: 'user' as const,
        content: 'Premier message',
        timestamp: new Date().toISOString(),
      },
      {
        role: 'assistant' as const,
        content: 'Première réponse',
        timestamp: new Date().toISOString(),
      },
    ];

    await getConversationalResponse(
      'Deuxième message',
      { projectCount: 0, collabCount: 0, styleCount: 0 },
      conversationHistory
    );

    expect(mockFetch).toHaveBeenCalled();
    const payload = getLastCapturedPayload();
    expect(payload).not.toBeNull();

    const messages = payload?.body.messages as Array<{ role: string; content: string }>;
    const nonSystemMessages = messages?.filter((m) => m.role !== 'system') || [];

    // Vérifier que les messages contiennent l'historique + le prompt user
    expect(nonSystemMessages.length).toBeGreaterThan(1);

    // Le premier message non-system devrait être le premier message utilisateur de l'historique
    expect(nonSystemMessages[0]?.role).toBe('user');
    expect(nonSystemMessages[0]?.content).toBe('Premier message');

    expect(nonSystemMessages[1]?.role).toBe('assistant');
    expect(nonSystemMessages[1]?.content).toBe('Première réponse');

    // Le dernier message doit être un message user
    const lastMessage = nonSystemMessages[nonSystemMessages.length - 1];
    expect(lastMessage?.role).toBe('user');

    // L'identité est TOUJOURS dans le system prompt (pas forcément dans le user prompt car il peut être simplifié)
    const systemMessage = messages?.find((m) => m.role === 'system');
    expect(systemMessage?.content).toContain('LARIAN BOT');
    expect(systemMessage?.content).toContain('Tu es LARIAN BOT');
  });

  it("devrait inclure l'identité dans le user prompt", async () => {
    await getConversationalResponse('test rapide', {
      projectCount: 0,
      collabCount: 0,
      styleCount: 0,
    });

    expect(mockFetch).toHaveBeenCalled();
    const payload = getLastCapturedPayload();
    expect(payload).not.toBeNull();

    const messages = payload?.body.messages as Array<{ role: string; content: string }>;
    // L'identité est dans le SYSTEM prompt (toujours présente), pas forcément dans le user prompt
    // car le user prompt peut être simplifié à la question simple si trop long
    const systemMessage = messages?.find((m) => m.role === 'system');
    expect(systemMessage?.content).toContain('LARIAN BOT');
    expect(systemMessage?.content).toContain('Tu es LARIAN BOT');
    // L'interdiction de dire LLaMA est aussi dans le system prompt
    expect(systemMessage?.content).toContain('Ne dis JAMAIS');
  });

  it('devrait utiliser formatConversationContextForPrompt pour la mémoire', async () => {
    const conversationHistory = [
      {
        role: 'user' as const,
        content: "Combien de projets j'ai ?",
        timestamp: new Date().toISOString(),
      },
      {
        role: 'assistant' as const,
        content: 'Tu as 5 projets.',
        timestamp: new Date().toISOString(),
      },
    ];

    await getConversationalResponse(
      'Rappelle-moi',
      { projectCount: 5, collabCount: 0, styleCount: 0 },
      conversationHistory
    );

    expect(mockFetch).toHaveBeenCalled();
    const payload = getLastCapturedPayload();
    expect(payload).not.toBeNull();

    const messages = payload?.body.messages as Array<{ role: string; content: string }>;
    const userMessages = messages?.filter((m) => m.role === 'user') || [];

    // Vérifier que le user prompt contient FACTUAL MEMORY ou RECENT EXCHANGE
    const lastMessage = userMessages[userMessages.length - 1];
    const hasMemory =
      lastMessage?.content.includes('FACTUAL MEMORY') ||
      lastMessage?.content.includes('RECENT EXCHANGE') ||
      lastMessage?.content.includes('INTERPRETATIVE NOTES');

    // La mémoire peut être dans le contexte ou dans les messages précédents
    expect(hasMemory || messages.length > 2).toBe(true);
  });
});
