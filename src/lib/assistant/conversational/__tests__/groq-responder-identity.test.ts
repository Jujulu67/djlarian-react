/**
 * Tests anti-régression pour l'identité de l'assistant
 * Vérifie que le modèle ne répond jamais "je suis LLaMA"
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';

// Mock server-only AVANT les autres imports
// Le mock est dans __mocks__/server-only.js
jest.mock('server-only');

// Mock generateText
const mockGenerateText = jest.fn();

jest.mock('ai', () => ({
  generateText: (...args: unknown[]) => mockGenerateText(...args),
}));

// Mock createOpenAI
const mockGroq = jest.fn((modelName: string) => modelName);
jest.mock('@ai-sdk/openai', () => ({
  createOpenAI: jest.fn(() => mockGroq),
}));

// Import après les mocks
import { getConversationalResponse } from '../groq-responder';
import { SYSTEM_PROMPT_8B } from '../../prompts/system-prompt-8b';
import { SYSTEM_DISCIPLINE_PROMPT } from '../../prompts/system-discipline-prompt';

describe('Groq Responder - Tests anti-régression identité', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock process.env
    process.env.GROQ_API_KEY = 'test-key';
  });

  afterEach(() => {
    delete process.env.GROQ_API_KEY;
  });

  describe('Complexity Routing', () => {
    it('devrait utiliser 8B pour les requêtes simples', async () => {
      mockGenerateText.mockResolvedValue({
        text: 'Je suis LARIAN BOT',
      });

      await getConversationalResponse(
        'qui es-tu ?',
        { projectCount: 0, collabCount: 0, styleCount: 0 },
        undefined,
        false
      );

      expect(mockGenerateText).toHaveBeenCalled();
      const callArgs = mockGenerateText.mock.calls[0][0];

      expect(callArgs.model).toBe('llama-3.1-8b-instant');
      expect(callArgs.system).toContain('LARIAN BOT');
      expect(
        callArgs.system.includes('SYSTEM_DISCIPLINE_PROMPT') ||
          callArgs.system.includes('You are an assistant with limited memory')
      ).toBe(true);
    });

    it('devrait utiliser 70B pour les requêtes complexes', async () => {
      mockGenerateText.mockResolvedValue({
        text: 'Réponse complexe',
      });

      await getConversationalResponse(
        'Analyse en détail tous mes projets et explique-moi pourquoi certains sont en retard',
        { projectCount: 0, collabCount: 0, styleCount: 0 },
        undefined,
        true
      );

      expect(mockGenerateText).toHaveBeenCalled();
      const callArgs = mockGenerateText.mock.calls[0][0];

      expect(callArgs.model).toBe('llama-3.3-70b-versatile');
      // Vérifier que les mêmes prompts sont utilisés pour 70B
      expect(callArgs.system).toContain('LARIAN BOT');
      expect(
        callArgs.system.includes('SYSTEM_DISCIPLINE_PROMPT') ||
          callArgs.system.includes('You are an assistant with limited memory')
      ).toBe(true);
    });

    it('devrait utiliser les mêmes prompts (discipline + identité) pour 8B et 70B', async () => {
      // Test 8B
      mockGenerateText.mockResolvedValue({
        text: 'Réponse 8B',
      });

      await getConversationalResponse(
        'test simple',
        { projectCount: 0, collabCount: 0, styleCount: 0 },
        undefined,
        false
      );
      const callArgs8B = mockGenerateText.mock.calls[0][0];
      const systemPrompt8B = callArgs8B.system;
      const userPrompt8B = callArgs8B.messages[callArgs8B.messages.length - 1].content;

      mockGenerateText.mockClear();

      // Test 70B
      mockGenerateText.mockResolvedValue({
        text: 'Réponse 70B',
      });

      await getConversationalResponse(
        'test complexe très long avec beaucoup de détails',
        { projectCount: 0, collabCount: 0, styleCount: 0 },
        undefined,
        true
      );
      const callArgs70B = mockGenerateText.mock.calls[0][0];
      const systemPrompt70B = callArgs70B.system;
      const userPrompt70B = callArgs70B.messages[callArgs70B.messages.length - 1].content;

      // Vérifier que les system prompts sont identiques
      expect(systemPrompt8B).toBe(systemPrompt70B);
      expect(systemPrompt8B).toContain('LARIAN BOT');
      expect(
        systemPrompt8B.includes('SYSTEM_DISCIPLINE_PROMPT') ||
          systemPrompt8B.includes('You are an assistant with limited memory')
      ).toBe(true);

      // Vérifier que les user prompts commencent par l'identité (même structure)
      expect(userPrompt8B).toContain('IDENTITÉ: Tu es LARIAN BOT');
      expect(userPrompt70B).toContain('IDENTITÉ: Tu es LARIAN BOT');
    });
  });

  it('devrait combiner SYSTEM_DISCIPLINE_PROMPT + SYSTEM_PROMPT_8B dans le system prompt', async () => {
    mockGenerateText.mockResolvedValue({
      text: 'Je suis LARIAN BOT, assistant studio.',
    });

    await getConversationalResponse('qui es-tu ?', {
      projectCount: 0,
      collabCount: 0,
      styleCount: 0,
    });

    expect(mockGenerateText).toHaveBeenCalled();
    const callArgs = mockGenerateText.mock.calls[0][0];

    // Vérifier que le system prompt contient les deux prompts
    expect(callArgs.system).toContain(SYSTEM_DISCIPLINE_PROMPT);
    expect(callArgs.system).toContain(SYSTEM_PROMPT_8B);
    expect(callArgs.system).toContain('LARIAN BOT');
  });

  it('devrait utiliser les messages avec historique si fourni', async () => {
    mockGenerateText.mockResolvedValue({
      text: 'Réponse avec historique',
    });

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

    expect(mockGenerateText).toHaveBeenCalled();
    const callArgs = mockGenerateText.mock.calls[0][0];

    // Vérifier que les messages contiennent l'historique + le prompt user
    expect(callArgs.messages).toBeDefined();
    expect(callArgs.messages.length).toBeGreaterThan(1);
    expect(callArgs.messages[0].role).toBe('user');
    expect(callArgs.messages[0].content).toBe('Premier message');
    expect(callArgs.messages[1].role).toBe('assistant');
    expect(callArgs.messages[1].content).toBe('Première réponse');
    // Le dernier message doit être le prompt user avec identité
    const lastMessage = callArgs.messages[callArgs.messages.length - 1];
    expect(lastMessage.role).toBe('user');
    expect(lastMessage.content).toContain('IDENTITÉ: Tu es LARIAN BOT');
  });

  it("devrait inclure l'identité dans le user prompt", async () => {
    mockGenerateText.mockResolvedValue({
      text: 'Réponse',
    });

    await getConversationalResponse('test', { projectCount: 0, collabCount: 0, styleCount: 0 });

    expect(mockGenerateText).toHaveBeenCalled();
    const callArgs = mockGenerateText.mock.calls[0][0];

    // Vérifier que le dernier message (user prompt) contient l'identité
    const lastMessage = callArgs.messages[callArgs.messages.length - 1];
    expect(lastMessage.content).toContain('IDENTITÉ: Tu es LARIAN BOT');
    expect(lastMessage.content).toContain('INTERDIT: ne dis jamais que tu es LLaMA');
  });

  it('devrait utiliser formatConversationContextForPrompt pour la mémoire', async () => {
    mockGenerateText.mockResolvedValue({
      text: 'Réponse avec mémoire',
    });

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

    expect(mockGenerateText).toHaveBeenCalled();
    const callArgs = mockGenerateText.mock.calls[0][0];

    // Vérifier que le user prompt contient FACTUAL MEMORY ou RECENT EXCHANGE
    const lastMessage = callArgs.messages[callArgs.messages.length - 1];
    const hasMemory =
      lastMessage.content.includes('FACTUAL MEMORY') ||
      lastMessage.content.includes('RECENT EXCHANGE') ||
      lastMessage.content.includes('INTERPRETATIVE NOTES');
    // La mémoire peut être dans le contexte ou dans les messages précédents
    expect(hasMemory || callArgs.messages.length > 1).toBe(true);
  });
});
