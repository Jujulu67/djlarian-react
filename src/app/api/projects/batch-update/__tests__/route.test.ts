/**
 * Tests d'intégration pour l'API batch-update
 *
 * Objectif : Vérifier que l'API refuse les requêtes sans scope
 * @jest-environment node
 */

import { POST } from '../route';
import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/auth';

// Mock des dépendances
jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    project: {
      count: jest.fn(),
      updateMany: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    assistantConfirmation: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

jest.mock('@/auth', () => ({
  auth: jest.fn(),
}));

jest.mock('next/cache', () => ({
  revalidateTag: jest.fn(),
}));

jest.mock('@sentry/nextjs', () => ({
  captureException: jest.fn(),
}));

jest.mock('@/lib/api/errorHandler', () => ({
  handleApiError: jest.fn((error) => {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }),
}));

const mockAuth = auth as jest.MockedFunction<typeof auth>;
const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('POST /api/projects/batch-update - Tests de sécurité', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuth.mockResolvedValue({
      user: { id: 'user1' },
    } as any);
  });

  describe('Server refuses empty scope', () => {
    it('should return 400 when no projectIds and no filters provided', async () => {
      const request = new NextRequest('http://localhost/api/projects/batch-update', {
        method: 'POST',
        body: JSON.stringify({
          newProgress: 20,
          // Pas de projectIds, pas de filtres
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('scope vide');
      expect(data.error).toContain("pas d'ids, pas de filtre");

      // Vérifier que Prisma n'a pas été appelé
      expect(mockPrisma.project.updateMany).not.toHaveBeenCalled();
    });

    it('should accept request with projectIds', async () => {
      const projectIds = ['1', '2', '3'];
      mockPrisma.project.updateMany.mockResolvedValue({ count: 3 } as any);

      const request = new NextRequest('http://localhost/api/projects/batch-update', {
        method: 'POST',
        body: JSON.stringify({
          projectIds,
          newProgress: 20,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.count).toBe(3);

      // Vérifier que Prisma a été appelé avec les IDs
      expect(mockPrisma.project.updateMany).toHaveBeenCalledWith({
        where: {
          userId: 'user1',
          id: { in: projectIds },
        },
        data: {
          progress: 20,
        },
      });
    });

    it('should accept request with filters', async () => {
      mockPrisma.project.count.mockResolvedValue(2);
      mockPrisma.project.updateMany.mockResolvedValue({ count: 2 } as any);

      const request = new NextRequest('http://localhost/api/projects/batch-update', {
        method: 'POST',
        body: JSON.stringify({
          status: 'EN_COURS',
          newProgress: 20,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.count).toBe(2);

      // Vérifier que Prisma a été appelé avec les filtres
      expect(mockPrisma.project.updateMany).toHaveBeenCalledWith({
        where: {
          userId: 'user1',
          status: 'EN_COURS',
        },
        data: {
          progress: 20,
        },
      });
    });

    it('should prioritize projectIds over filters when both are provided', async () => {
      const projectIds = ['1', '2'];
      mockPrisma.project.updateMany.mockResolvedValue({ count: 2 } as any);

      const request = new NextRequest('http://localhost/api/projects/batch-update', {
        method: 'POST',
        body: JSON.stringify({
          projectIds,
          status: 'EN_COURS', // Filtre fourni mais ignoré
          newProgress: 20,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.count).toBe(2);

      // Vérifier que Prisma a utilisé les IDs, pas le filtre
      expect(mockPrisma.project.updateMany).toHaveBeenCalledWith({
        where: {
          userId: 'user1',
          id: { in: projectIds },
        },
        data: {
          progress: 20,
        },
      });

      // Le filtre status ne devrait PAS être dans le where
      const whereClause = (mockPrisma.project.updateMany as jest.Mock).mock.calls[0][0].where;
      expect(whereClause).not.toHaveProperty('status');
    });
  });

  describe('Optimistic concurrency check', () => {
    it('should update when expectedUpdatedAtById matches', async () => {
      const projectIds = ['1', '2', '3'];
      const now = new Date('2024-01-15T10:00:00Z');
      const expectedUpdatedAtById = {
        '1': now.toISOString(),
        '2': now.toISOString(),
        '3': now.toISOString(),
      };

      // Mock: projets en base avec les mêmes updatedAt
      mockPrisma.project.findMany.mockResolvedValueOnce([
        { id: '1', updatedAt: now },
        { id: '2', updatedAt: now },
        { id: '3', updatedAt: now },
      ]);

      // Mock transaction pour idempotency + update
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        if (typeof callback === 'function') {
          const tx = {
            assistantConfirmation: {
              create: jest.fn().mockResolvedValue({}),
            },
            project: {
              updateMany: jest.fn().mockResolvedValue({ count: 3 }),
            },
          };
          return await callback(tx);
        }
        return [];
      });

      const request = new NextRequest('http://localhost/api/projects/batch-update', {
        method: 'POST',
        body: JSON.stringify({
          projectIds,
          expectedUpdatedAtById,
          confirmationId: 'test-confirmation-123',
          newProgress: 50,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.count).toBe(3);

      // Vérifier que findMany a été appelé pour vérifier la concurrency
      expect(mockPrisma.project.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'user1',
          id: { in: projectIds },
        },
        select: {
          id: true,
          updatedAt: true,
        },
      });

      // Vérifier que la transaction a été appelée (idempotency + update)
      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });

    it('should return 409 and NOT update when expectedUpdatedAtById mismatches', async () => {
      const projectIds = ['1', '2', '3'];
      const oldTime = new Date('2024-01-15T10:00:00Z');
      const newTime = new Date('2024-01-15T11:00:00Z'); // Différent
      const expectedUpdatedAtById = {
        '1': oldTime.toISOString(),
        '2': oldTime.toISOString(),
        '3': oldTime.toISOString(),
      };

      // Mock: projets en base avec updatedAt différent (conflit)
      mockPrisma.project.findMany.mockResolvedValueOnce([
        { id: '1', updatedAt: newTime }, // Conflit: updatedAt a changé
        { id: '2', updatedAt: oldTime }, // OK
        { id: '3', updatedAt: newTime }, // Conflit: updatedAt a changé
      ]);

      const request = new NextRequest('http://localhost/api/projects/batch-update', {
        method: 'POST',
        body: JSON.stringify({
          projectIds,
          expectedUpdatedAtById,
          confirmationId: 'test-confirmation-456',
          newProgress: 50,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error).toBe('Some projects changed since confirmation. Please re-list.');
      expect(data.details?.conflictCount).toBe(2);
      expect(data.details?.conflictProjectIds).toEqual(['1', '3']);

      // Vérifier que updateMany n'a PAS été appelé (pas de transaction non plus)
      expect(mockPrisma.project.updateMany).not.toHaveBeenCalled();
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });

    it('should return 409 when project is missing in database', async () => {
      const projectIds = ['1', '2', '3'];
      const now = new Date('2024-01-15T10:00:00Z');
      const expectedUpdatedAtById = {
        '1': now.toISOString(),
        '2': now.toISOString(),
        '3': now.toISOString(),
      };

      // Mock: seulement 2 projets en base (le 3ème manque)
      mockPrisma.project.findMany.mockResolvedValueOnce([
        { id: '1', updatedAt: now },
        { id: '2', updatedAt: now },
        // '3' manque → conflit
      ]);

      const request = new NextRequest('http://localhost/api/projects/batch-update', {
        method: 'POST',
        body: JSON.stringify({
          projectIds,
          expectedUpdatedAtById,
          confirmationId: 'test-confirmation-789',
          newProgress: 50,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.details?.conflictCount).toBe(1);
      expect(data.details?.conflictProjectIds).toEqual(['3']);

      // Vérifier que updateMany n'a PAS été appelé
      expect(mockPrisma.project.updateMany).not.toHaveBeenCalled();
    });
  });
});
