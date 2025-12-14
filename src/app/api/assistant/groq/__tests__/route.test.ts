/**
 * @jest-environment node
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock Next.js server components AVANT les imports
jest.mock('next/server', () => {
  const mockRequest = class MockRequest {
    json = jest.fn();
    constructor(
      public url: string,
      public init?: any
    ) {}
  };
  return {
    NextRequest: mockRequest,
    NextResponse: {
      json: jest.fn((data, init) => ({
        json: async () => data,
        status: init?.status || 200,
      })),
    },
  };
});

// Mock Groq responder
const mockGetConversationalResponse = jest.fn().mockResolvedValue('Réponse de test de Groq');

jest.mock('@/lib/assistant/conversational/groq-responder', () => ({
  getConversationalResponse: (...args: unknown[]) => mockGetConversationalResponse(...args),
}));

// Mock Sentry si nécessaire
jest.mock('@sentry/nextjs', () => ({
  captureException: jest.fn(),
}));

// Import après les mocks
import { POST } from '../route';
import { NextRequest } from 'next/server';

describe('/api/assistant/groq', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Validation', () => {
    it('devrait retourner 400 si message est vide', async () => {
      const request = new NextRequest('http://localhost/api/assistant/groq', {
        method: 'POST',
        body: JSON.stringify({
          message: '',
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });
      request.json = jest.fn().mockResolvedValue({
        message: '',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Message is required and must be a non-empty string');
      expect(mockGetConversationalResponse).not.toHaveBeenCalled();
    });

    it('devrait retourner 400 si message est manquant', async () => {
      const request = new NextRequest('http://localhost/api/assistant/groq', {
        method: 'POST',
        body: JSON.stringify({}),
        headers: {
          'Content-Type': 'application/json',
        },
      });
      request.json = jest.fn().mockResolvedValue({});

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Message is required and must be a non-empty string');
      expect(mockGetConversationalResponse).not.toHaveBeenCalled();
    });

    it("devrait retourner 400 si message n'est pas une string", async () => {
      const request = new NextRequest('http://localhost/api/assistant/groq', {
        method: 'POST',
        body: JSON.stringify({
          message: 123,
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });
      request.json = jest.fn().mockResolvedValue({
        message: 123,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Message is required and must be a non-empty string');
      expect(mockGetConversationalResponse).not.toHaveBeenCalled();
    });
  });

  describe('Réponses valides', () => {
    it('devrait retourner 200 avec { text } pour un message valide', async () => {
      const mockResponse = 'Réponse conversationnelle de Groq';
      mockGetConversationalResponse.mockResolvedValue(mockResponse);

      const request = new NextRequest('http://localhost/api/assistant/groq', {
        method: 'POST',
        body: JSON.stringify({
          message: 'Bonjour, comment vas-tu ?',
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });
      request.json = jest.fn().mockResolvedValue({
        message: 'Bonjour, comment vas-tu ?',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.text).toBe(mockResponse);
      expect(mockGetConversationalResponse).toHaveBeenCalledWith(
        'Bonjour, comment vas-tu ?',
        {
          projectCount: 0,
          collabCount: 0,
          styleCount: 0,
        },
        undefined,
        false, // isComplex (non fourni, default false)
        expect.any(String), // requestId
        true // isFirstAssistantTurn (calculé: pas d'historique)
      );
    });

    it('devrait passer le contexte si fourni', async () => {
      const mockResponse = 'Réponse avec contexte';
      mockGetConversationalResponse.mockResolvedValue(mockResponse);

      const request = new NextRequest('http://localhost/api/assistant/groq', {
        method: 'POST',
        body: JSON.stringify({
          message: "Combien de projets j'ai ?",
          context: {
            projectCount: 42,
            collabCount: 5,
            styleCount: 3,
          },
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });
      request.json = jest.fn().mockResolvedValue({
        message: "Combien de projets j'ai ?",
        context: {
          projectCount: 42,
          collabCount: 5,
          styleCount: 3,
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.text).toBe(mockResponse);
      expect(mockGetConversationalResponse).toHaveBeenCalledWith(
        "Combien de projets j'ai ?",
        {
          projectCount: 42,
          collabCount: 5,
          styleCount: 3,
        },
        undefined,
        false, // isComplex
        expect.any(String), // requestId
        true // isFirstAssistantTurn (pas d'historique)
      );
    });

    it("devrait passer l'historique conversationnel si fourni", async () => {
      const mockResponse = 'Réponse avec historique';
      mockGetConversationalResponse.mockResolvedValue(mockResponse);

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

      const request = new NextRequest('http://localhost/api/assistant/groq', {
        method: 'POST',
        body: JSON.stringify({
          message: 'Deuxième message',
          conversationHistory,
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });
      request.json = jest.fn().mockResolvedValue({
        message: 'Deuxième message',
        conversationHistory,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.text).toBe(mockResponse);
      expect(mockGetConversationalResponse).toHaveBeenCalledWith(
        'Deuxième message',
        {
          projectCount: 0,
          collabCount: 0,
          styleCount: 0,
        },
        expect.arrayContaining([
          expect.objectContaining({
            role: 'user',
            content: 'Premier message',
          }),
          expect.objectContaining({
            role: 'assistant',
            content: 'Première réponse',
          }),
        ]),
        false, // isComplex
        expect.any(String), // requestId
        false // isFirstAssistantTurn (historique non vide)
      );
    });

    it("devrait filtrer l'historique invalide", async () => {
      const mockResponse = 'Réponse avec historique filtré';
      mockGetConversationalResponse.mockResolvedValue(mockResponse);

      const conversationHistory = [
        {
          role: 'user' as const,
          content: 'Message valide',
          timestamp: new Date().toISOString(),
        },
        {
          role: 'user' as const,
          content: '', // Message invalide (vide)
          timestamp: new Date().toISOString(),
        },
        {
          role: 'invalid' as any, // Rôle invalide
          content: 'Message invalide',
          timestamp: new Date().toISOString(),
        },
      ];

      const request = new NextRequest('http://localhost/api/assistant/groq', {
        method: 'POST',
        body: JSON.stringify({
          message: 'Message avec historique filtré',
          conversationHistory,
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });
      request.json = jest.fn().mockResolvedValue({
        message: 'Message avec historique filtré',
        conversationHistory,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.text).toBe(mockResponse);
      // Vérifier que seul le message valide est passé
      expect(mockGetConversationalResponse).toHaveBeenCalledWith(
        'Message avec historique filtré',
        {
          projectCount: 0,
          collabCount: 0,
          styleCount: 0,
        },
        expect.arrayContaining([
          expect.objectContaining({
            role: 'user',
            content: 'Message valide',
          }),
        ]),
        false, // isComplex
        expect.any(String), // requestId
        false // isFirstAssistantTurn (historique filtré contient un message)
      );
      // Vérifier que les messages invalides ne sont pas passés
      const callArgs = mockGetConversationalResponse.mock.calls[0];
      const passedHistory = callArgs[2];
      expect(passedHistory).toHaveLength(1);
    });
  });

  describe('Gestion des erreurs', () => {
    it('devrait retourner 500 si getConversationalResponse échoue', async () => {
      const mockError = new Error('Groq API error');
      mockGetConversationalResponse.mockRejectedValue(mockError);

      const request = new NextRequest('http://localhost/api/assistant/groq', {
        method: 'POST',
        body: JSON.stringify({
          message: 'Message qui cause une erreur',
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });
      request.json = jest.fn().mockResolvedValue({
        message: 'Message qui cause une erreur',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error while processing Groq request');
    });
  });

  describe('Tests anti-régression - Identité et prompts', () => {
    it('devrait appeler getConversationalResponse avec les bons paramètres pour "qui es-tu ?"', async () => {
      const mockResponse = 'Je suis LARIAN BOT, assistant studio de gestion de projets musicaux.';
      mockGetConversationalResponse.mockResolvedValue(mockResponse);

      const request = new NextRequest('http://localhost/api/assistant/groq', {
        method: 'POST',
        body: JSON.stringify({
          message: 'qui es-tu ?',
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });
      request.json = jest.fn().mockResolvedValue({
        message: 'qui es-tu ?',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.text).toBe(mockResponse);
      expect(mockGetConversationalResponse).toHaveBeenCalledWith(
        'qui es-tu ?',
        {
          projectCount: 0,
          collabCount: 0,
          styleCount: 0,
        },
        undefined,
        false, // isComplex
        expect.any(String), // requestId
        true // isFirstAssistantTurn (pas d'historique)
      );
    });
  });

  describe('Complexity Routing (isComplex)', () => {
    it('devrait transmettre isComplex=true à getConversationalResponse', async () => {
      const mockResponse = 'Réponse complexe';
      mockGetConversationalResponse.mockResolvedValue(mockResponse);

      const request = new NextRequest('http://localhost/api/assistant/groq', {
        method: 'POST',
        body: JSON.stringify({
          message: 'Analyse en détail tous mes projets',
          isComplex: true,
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });
      request.json = jest.fn().mockResolvedValue({
        message: 'Analyse en détail tous mes projets',
        isComplex: true,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.text).toBe(mockResponse);
      expect(mockGetConversationalResponse).toHaveBeenCalledWith(
        'Analyse en détail tous mes projets',
        {
          projectCount: 0,
          collabCount: 0,
          styleCount: 0,
        },
        undefined,
        true, // isComplex
        expect.any(String), // requestId
        true // isFirstAssistantTurn (calculé: pas d'historique)
      );
    });

    it('devrait transmettre isComplex=false à getConversationalResponse', async () => {
      const mockResponse = 'Réponse simple';
      mockGetConversationalResponse.mockResolvedValue(mockResponse);

      const request = new NextRequest('http://localhost/api/assistant/groq', {
        method: 'POST',
        body: JSON.stringify({
          message: 'Bonjour',
          isComplex: false,
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });
      request.json = jest.fn().mockResolvedValue({
        message: 'Bonjour',
        isComplex: false,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.text).toBe(mockResponse);
      expect(mockGetConversationalResponse).toHaveBeenCalledWith(
        'Bonjour',
        {
          projectCount: 0,
          collabCount: 0,
          styleCount: 0,
        },
        undefined,
        false, // isComplex
        expect.any(String), // requestId
        true // isFirstAssistantTurn (calculé: pas d'historique)
      );
    });
  });

  describe('First Assistant Turn (isFirstAssistantTurn)', () => {
    it("devrait transmettre isFirstAssistantTurn=true quand pas d'historique", async () => {
      const mockResponse = 'Première réponse';
      mockGetConversationalResponse.mockResolvedValue(mockResponse);

      const request = new NextRequest('http://localhost/api/assistant/groq', {
        method: 'POST',
        body: JSON.stringify({
          message: 'Salut',
          isFirstAssistantTurn: true,
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });
      request.json = jest.fn().mockResolvedValue({
        message: 'Salut',
        isFirstAssistantTurn: true,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.text).toBe(mockResponse);
      expect(mockGetConversationalResponse).toHaveBeenCalledWith(
        'Salut',
        {
          projectCount: 0,
          collabCount: 0,
          styleCount: 0,
        },
        undefined,
        false, // isComplex (non fourni, default false)
        expect.any(String), // requestId
        true // isFirstAssistantTurn
      );
    });

    it('devrait calculer isFirstAssistantTurn=true si historique vide', async () => {
      const mockResponse = 'Première réponse';
      mockGetConversationalResponse.mockResolvedValue(mockResponse);

      const request = new NextRequest('http://localhost/api/assistant/groq', {
        method: 'POST',
        body: JSON.stringify({
          message: 'Salut',
          conversationHistory: [],
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });
      request.json = jest.fn().mockResolvedValue({
        message: 'Salut',
        conversationHistory: [],
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.text).toBe(mockResponse);
      // Vérifier que isFirstAssistantTurn est calculé à true (historique vide)
      expect(mockGetConversationalResponse).toHaveBeenCalledWith(
        'Salut',
        {
          projectCount: 0,
          collabCount: 0,
          styleCount: 0,
        },
        undefined, // Historique filtré (vide)
        false, // isComplex (non fourni)
        expect.any(String), // requestId
        true // isFirstAssistantTurn (calculé)
      );
    });

    it('devrait calculer isFirstAssistantTurn=false si historique non vide', async () => {
      const mockResponse = 'Réponse suivante';
      mockGetConversationalResponse.mockResolvedValue(mockResponse);

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

      const request = new NextRequest('http://localhost/api/assistant/groq', {
        method: 'POST',
        body: JSON.stringify({
          message: 'Deuxième message',
          conversationHistory,
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });
      request.json = jest.fn().mockResolvedValue({
        message: 'Deuxième message',
        conversationHistory,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.text).toBe(mockResponse);
      // Vérifier que isFirstAssistantTurn est calculé à false (historique non vide)
      expect(mockGetConversationalResponse).toHaveBeenCalledWith(
        'Deuxième message',
        {
          projectCount: 0,
          collabCount: 0,
          styleCount: 0,
        },
        expect.arrayContaining([
          expect.objectContaining({
            role: 'user',
            content: 'Premier message',
          }),
        ]),
        false, // isComplex (non fourni)
        expect.any(String), // requestId
        false // isFirstAssistantTurn (calculé)
      );
    });
  });
});
