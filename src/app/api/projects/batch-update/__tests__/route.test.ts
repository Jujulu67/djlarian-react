/**
 * Tests d'intégration pour l'API batch-update
 *
 * Objectif : Vérifier que l'API refuse les requêtes sans scope
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
  },
}));

jest.mock('@/auth', () => ({
  auth: jest.fn(),
}));

jest.mock('next/cache', () => ({
  revalidateTag: jest.fn(),
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
});
