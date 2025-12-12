import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { processProjectCommand } from '../assistant';

// Mock de l'authentification
const mockAuth = jest.fn();
jest.mock('@/auth', () => ({
  auth: () => mockAuth(),
}));

// Mock de Prisma
const mockUpdateMany = jest.fn();
jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    project: {
      updateMany: (...args: any[]) => mockUpdateMany(...args),
    },
  },
}));

// Mock de revalidatePath
const mockRevalidatePath = jest.fn();
jest.mock('next/cache', () => ({
  revalidatePath: (...args: any[]) => mockRevalidatePath(...args),
}));

// Mock de l'AI SDK
const mockGenerateText = jest.fn();
const mockToolExecute = jest.fn();

jest.mock('ai', () => ({
  generateText: (...args: any[]) => mockGenerateText(...args),
  tool: jest.fn((config) => ({
    ...config,
    execute: async (...args: any[]) => {
      // Appeler la fonction execute mockée
      return await mockToolExecute(config.execute, ...args);
    },
  })),
}));

// Mock de createOpenAI
jest.mock('@ai-sdk/openai', () => ({
  createOpenAI: jest.fn(() => (modelName: string) => modelName),
}));

describe('Assistant IA - processProjectCommand', () => {
  const mockUserId = 'test-user-id-123';
  const mockSession = {
    user: {
      id: mockUserId,
      name: 'Test User',
      email: 'test@example.com',
    },
  };

  beforeEach(() => {
    // Reset des mocks
    jest.clearAllMocks();
    mockAuth.mockResolvedValue(mockSession);
    mockUpdateMany.mockResolvedValue({ count: 0 });
    mockRevalidatePath.mockReturnValue(undefined);

    // Mock par défaut pour toolExecute qui appelle la vraie fonction execute
    mockToolExecute.mockImplementation(async (originalExecute, ...args) => {
      if (originalExecute) {
        return await originalExecute(...args);
      }
      return { count: 0, message: 'No execution' };
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Authentification', () => {
    it("devrait retourner une erreur si l'utilisateur n'est pas connecté", async () => {
      mockAuth.mockResolvedValue(null);

      const result = await processProjectCommand('Bonjour');

      expect(result).toContain('connecté');
      expect(mockGenerateText).not.toHaveBeenCalled();
    });

    it("devrait fonctionner si l'utilisateur est connecté", async () => {
      mockGenerateText.mockResolvedValue({
        text: 'Bonjour ! Comment puis-je vous aider ?',
        toolResults: [],
      });

      const result = await processProjectCommand('Bonjour');

      expect(mockAuth).toHaveBeenCalled();
      expect(mockGenerateText).toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });

  describe('Questions simples (sans modifications)', () => {
    it('devrait répondre de manière conversationnelle à une question simple', async () => {
      mockGenerateText.mockResolvedValue({
        text: 'Vous avez actuellement 5 projets en cours.',
        toolResults: [],
      });

      const result = await processProjectCommand("Combien de projets j'ai ?");

      expect(result).toContain('projets');
      expect(mockUpdateMany).not.toHaveBeenCalled();
      expect(mockRevalidatePath).not.toHaveBeenCalled();
    });

    it("devrait répondre à une demande d'information sur les statuts", async () => {
      mockGenerateText.mockResolvedValue({
        text: 'Les statuts disponibles sont : EN_COURS, TERMINE, ANNULE, A_REWORK, GHOST_PRODUCTION, ARCHIVE.',
        toolResults: [],
      });

      const result = await processProjectCommand('Quels sont les statuts disponibles ?');

      expect(result).toContain('statuts');
      expect(mockUpdateMany).not.toHaveBeenCalled();
    });

    it('devrait répondre à une salutation', async () => {
      mockGenerateText.mockResolvedValue({
        text: 'Bonjour ! Je suis votre assistant de gestion de projet. Comment puis-je vous aider ?',
        toolResults: [],
      });

      const result = await processProjectCommand('Bonjour');

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
      expect(mockUpdateMany).not.toHaveBeenCalled();
    });
  });

  describe('Commandes de modification - Deadlines', () => {
    it('devrait mettre à jour les deadlines pour des projets avec progression spécifique', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowISO = tomorrow.toISOString().split('T')[0];

      mockUpdateMany.mockResolvedValue({ count: 3 });

      // Simuler que l'IA appelle l'outil avec les bons paramètres
      mockGenerateText.mockImplementation(async (config) => {
        // Simuler l'appel de l'outil updateProjects
        const toolResult = await mockToolExecute(config.tools.updateProjects.execute, {
          minProgress: 80,
          newDeadline: 'demain',
        });

        return {
          text: 'Mise à jour effectuée',
          toolResults: [
            {
              toolCallId: 'test-id',
              toolName: 'updateProjects',
              result: toolResult,
            },
          ],
        };
      });

      const result = await processProjectCommand(
        'Déplace la deadline à demain pour les projets finis à 80%'
      );

      expect(mockUpdateMany).toHaveBeenCalled();
      expect(mockUpdateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: mockUserId,
            progress: expect.objectContaining({
              gte: 80,
            }),
          }),
          data: expect.objectContaining({
            deadline: expect.any(Date),
          }),
        })
      );
      expect(mockRevalidatePath).toHaveBeenCalledWith('/projects');
      expect(result).toContain('3');
    });

    it('devrait gérer les dates relatives comme "semaine prochaine"', async () => {
      mockUpdateMany.mockResolvedValue({ count: 2 });
      mockGenerateText.mockImplementation(async (config) => {
        // Call the actual updateProjects tool
        const toolResult = await mockToolExecute(config.tools.updateProjects?.execute, {
          newDeadline: 'semaine prochaine',
        });
        return {
          text: 'Mise à jour effectuée',
          toolResults: [
            {
              toolCallId: 'test-id',
              toolName: 'updateProjects',
              result: toolResult,
            },
          ],
        };
      });

      const result = await processProjectCommand(
        'Déplace la deadline à la semaine prochaine pour tous les projets'
      );

      expect(mockUpdateMany).toHaveBeenCalled();
      expect(mockRevalidatePath).toHaveBeenCalled();
      expect(result).toContain('2');
    });
  });

  describe('Commandes de modification - Statuts', () => {
    it('devrait mettre à jour le statut des projets terminés', async () => {
      mockUpdateMany.mockResolvedValue({ count: 5 });
      mockGenerateText.mockImplementation(async (config) => {
        const toolResult = await mockToolExecute(config.tools.updateProjects?.execute, {
          minProgress: 100,
          maxProgress: 100,
          newStatus: 'TERMINE',
        });
        return {
          text: 'Mise à jour effectuée',
          toolResults: [
            {
              toolCallId: 'test-id',
              toolName: 'updateProjects',
              result: toolResult,
            },
          ],
        };
      });

      const result = await processProjectCommand('Marque comme TERMINE les projets à 100%');

      expect(mockUpdateMany).toHaveBeenCalled();
      expect(mockUpdateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: mockUserId,
            progress: expect.objectContaining({
              gte: 100,
            }),
          }),
          data: expect.objectContaining({
            status: 'TERMINE',
          }),
        })
      );
      expect(mockRevalidatePath).toHaveBeenCalledWith('/projects');
      expect(result).toContain('5');
    });

    it('devrait mettre à jour le statut en EN_COURS', async () => {
      mockUpdateMany.mockResolvedValue({ count: 1 });
      mockGenerateText.mockImplementation(async (config) => {
        const toolResult = await mockToolExecute(config.tools.updateProjects?.execute, {
          minProgress: 50,
          maxProgress: 50,
          newStatus: 'EN_COURS',
        });
        return {
          text: 'Mise à jour effectuée',
          toolResults: [
            {
              toolCallId: 'test-id',
              toolName: 'updateProjects',
              result: toolResult,
            },
          ],
        };
      });

      const result = await processProjectCommand(
        'Change le statut en EN_COURS pour les projets à 50%'
      );

      expect(mockUpdateMany).toHaveBeenCalled();
      expect(mockUpdateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'EN_COURS',
          }),
        })
      );
      expect(result).toContain('1');
    });
  });

  describe('Commandes de modification - Filtres de progression', () => {
    it('devrait filtrer par progression minimum', async () => {
      mockUpdateMany.mockResolvedValue({ count: 4 });
      mockGenerateText.mockImplementation(async (config) => {
        const toolResult = await mockToolExecute(config.tools.updateProjects?.execute, {
          minProgress: 75,
          newStatus: 'TERMINE',
        });
        return {
          text: 'Mise à jour effectuée',
          toolResults: [
            {
              toolCallId: 'test-id',
              toolName: 'updateProjects',
              result: toolResult,
            },
          ],
        };
      });

      const result = await processProjectCommand(
        'Marque comme TERMINE les projets avec au moins 75% de progression'
      );

      expect(mockUpdateMany).toHaveBeenCalled();
      expect(mockUpdateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            progress: expect.objectContaining({
              gte: 75,
            }),
          }),
        })
      );
      expect(result).toContain('4');
    });

    it('devrait filtrer par progression maximum', async () => {
      mockUpdateMany.mockResolvedValue({ count: 2 });
      mockGenerateText.mockImplementation(async (config) => {
        const toolResult = await mockToolExecute(config.tools.updateProjects?.execute, {
          maxProgress: 25,
          newStatus: 'A_REWORK',
        });
        return {
          text: 'Mise à jour effectuée',
          toolResults: [
            {
              toolCallId: 'test-id',
              toolName: 'updateProjects',
              result: toolResult,
            },
          ],
        };
      });

      const result = await processProjectCommand(
        'Marque comme A_REWORK les projets avec moins de 25% de progression'
      );

      expect(mockUpdateMany).toHaveBeenCalled();
      expect(mockUpdateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            progress: expect.objectContaining({
              lte: 25,
            }),
          }),
        })
      );
      expect(result).toContain('2');
    });

    it('devrait filtrer par plage de progression', async () => {
      mockUpdateMany.mockResolvedValue({ count: 3 });
      mockGenerateText.mockImplementation(async (config) => {
        const toolResult = await mockToolExecute(config.tools.updateProjects?.execute, {
          minProgress: 50,
          maxProgress: 80,
          newStatus: 'EN_COURS',
        });
        return {
          text: 'Mise à jour effectuée',
          toolResults: [
            {
              toolCallId: 'test-id',
              toolName: 'updateProjects',
              result: toolResult,
            },
          ],
        };
      });

      const result = await processProjectCommand(
        'Marque comme EN_COURS les projets entre 50% et 80% de progression'
      );

      expect(mockUpdateMany).toHaveBeenCalled();
      const callArgs = mockUpdateMany.mock.calls[0][0] as any;
      expect(callArgs.where.progress.gte).toBe(50);
      expect(callArgs.where.progress.lte).toBe(80);
      expect(result).toContain('3');
    });
  });

  describe('Sécurité - Filtrage par utilisateur', () => {
    it('devrait toujours filtrer par userId dans les requêtes', async () => {
      mockUpdateMany.mockResolvedValue({ count: 1 });
      mockGenerateText.mockImplementation(async (config) => {
        const toolResult = await mockToolExecute(config.tools.updateProjects?.execute, {
          newStatus: 'TERMINE',
        });
        return {
          text: 'Mise à jour effectuée',
          toolResults: [
            {
              toolCallId: 'test-id',
              toolName: 'updateProjects',
              result: toolResult,
            },
          ],
        };
      });

      await processProjectCommand('Marque tous les projets comme TERMINE');

      expect(mockUpdateMany).toHaveBeenCalled();
      const callArgs = mockUpdateMany.mock.calls[0][0] as any;
      expect(callArgs.where.userId).toBe(mockUserId);
    });
  });

  describe('Gestion des erreurs', () => {
    it("devrait gérer les erreurs de l'API Groq", async () => {
      const error = new Error('GROQ_API_KEY is not set');
      mockGenerateText.mockRejectedValue(error);

      const result = await processProjectCommand('Bonjour');

      expect(result).toContain('GROQ_API_KEY');
      expect(result).toContain('configurée');
    });

    it('devrait gérer les erreurs génériques', async () => {
      const error = new Error('Network error');
      mockGenerateText.mockRejectedValue(error);

      const result = await processProjectCommand('Bonjour');

      expect(result).toContain('erreur');
      expect(result.length).toBeGreaterThan(0);
    });

    it('devrait gérer les cas où aucun projet ne correspond aux critères', async () => {
      mockUpdateMany.mockResolvedValue({ count: 0 });
      mockGenerateText.mockImplementation(async (config) => {
        const toolResult = await mockToolExecute(config.tools.updateProjects?.execute, {
          minProgress: 200,
          newStatus: 'TERMINE',
        });
        return {
          text: 'Mise à jour effectuée',
          toolResults: [
            {
              toolCallId: 'test-id',
              toolName: 'updateProjects',
              result: toolResult,
            },
          ],
        };
      });

      const result = await processProjectCommand('Marque comme TERMINE les projets à 200%');

      expect(result).toContain('Aucun projet');
      expect(mockUpdateMany).toHaveBeenCalled();
    });
  });

  describe('Cohérence des réponses', () => {
    it('devrait retourner une réponse non vide pour toute demande', async () => {
      mockGenerateText.mockResolvedValue({
        text: 'Réponse de test',
        toolResults: [],
      });

      const result = await processProjectCommand('Test');

      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('devrait inclure le nombre de projets modifiés dans la réponse', async () => {
      mockUpdateMany.mockResolvedValue({ count: 7 });
      mockGenerateText.mockResolvedValue({
        text: 'Mise à jour effectuée',
        toolResults: [
          {
            toolCallId: 'test-id',
            toolName: 'updateProjects',
            result: {
              count: 7,
              message: `Mise à jour réussie pour 7 projet(s).`,
            },
          },
        ],
      });

      const result = await processProjectCommand('Modifie tous les projets');

      expect(result).toContain('7');
    });

    it('devrait appeler revalidatePath après une modification réussie', async () => {
      mockUpdateMany.mockResolvedValue({ count: 1 });
      mockGenerateText.mockResolvedValue({
        text: 'Mise à jour effectuée',
        toolResults: [
          {
            toolCallId: 'test-id',
            toolName: 'updateProjects',
            result: {
              count: 1,
              message: `Mise à jour réussie pour 1 projet(s).`,
            },
          },
        ],
      });

      await processProjectCommand('Modifie un projet');

      expect(mockRevalidatePath).toHaveBeenCalledWith('/projects');
    });

    it('ne devrait pas appeler revalidatePath pour une question simple', async () => {
      mockGenerateText.mockResolvedValue({
        text: 'Vous avez 5 projets.',
        toolResults: [],
      });

      await processProjectCommand("Combien de projets j'ai ?");

      expect(mockRevalidatePath).not.toHaveBeenCalled();
    });
  });
});
