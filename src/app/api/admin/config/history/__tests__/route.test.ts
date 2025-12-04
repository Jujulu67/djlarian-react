/**
 * Tests for /api/admin/config/history route
 * @jest-environment node
 */
import { NextRequest } from 'next/server';

import { GET, POST } from '../route';

// Mock dependencies
jest.mock('@/auth', () => ({
  auth: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
  },
}));

jest.mock('@/lib/prisma', () => {
  const mockPrisma = {
    configHistory: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
    siteConfig: {
      findUnique: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
    configSnapshot: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
  };
  return {
    __esModule: true,
    default: mockPrisma,
  };
});

describe('/api/admin/config/history', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET', () => {
    it('should return changes history for admin user', async () => {
      const { auth } = await import('@/auth');
      const { default: mockPrisma } = await import('@/lib/prisma');

      (auth as jest.Mock).mockResolvedValue({
        user: { id: 'admin1', role: 'ADMIN' },
      });

      const mockHistory = [
        {
          id: 'history1',
          configId: 'config1',
          previousValue: 'old',
          newValue: 'new',
          createdAt: new Date(),
          config: { id: 'config1', section: 'general', key: 'siteName' },
        },
      ];

      (mockPrisma.configHistory.findMany as jest.Mock).mockResolvedValue(mockHistory);

      const request = new NextRequest('http://localhost/api/admin/config/history?type=changes', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(JSON.parse(JSON.stringify(mockHistory)));
    });

    it('should return snapshots for admin user', async () => {
      const { auth } = await import('@/auth');
      const { default: mockPrisma } = await import('@/lib/prisma');

      (auth as jest.Mock).mockResolvedValue({
        user: { id: 'admin1', role: 'ADMIN' },
      });

      const mockSnapshots = [
        {
          id: 'snapshot1',
          name: 'Snapshot 1',
          data: { general: { siteName: 'Test' } },
          createdAt: new Date(),
        },
      ];

      (mockPrisma.configSnapshot.findMany as jest.Mock).mockResolvedValue(mockSnapshots);

      const request = new NextRequest('http://localhost/api/admin/config/history?type=snapshots', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(JSON.parse(JSON.stringify(mockSnapshots)));
    });

    it('should return 400 for invalid type', async () => {
      const { auth } = await import('@/auth');
      (auth as jest.Mock).mockResolvedValue({
        user: { id: 'admin1', role: 'ADMIN' },
      });

      const request = new NextRequest('http://localhost/api/admin/config/history?type=invalid', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Type non valide');
    });

    it('should return 401 for non-admin user', async () => {
      const { auth } = await import('@/auth');
      (auth as jest.Mock).mockResolvedValue({
        user: { id: 'user1', role: 'USER' },
      });

      const request = new NextRequest('http://localhost/api/admin/config/history', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Non autorisé');
    });
  });

  describe('POST', () => {
    it('should revert a change for admin user', async () => {
      const { auth } = await import('@/auth');
      const { default: mockPrisma } = await import('@/lib/prisma');

      (auth as jest.Mock).mockResolvedValue({
        user: { id: 'admin1', role: 'ADMIN', email: 'admin@test.com' },
      });

      const mockHistoryItem = {
        id: 'history1',
        configId: 'config1',
        previousValue: 'old',
        newValue: 'new',
        createdAt: new Date(),
        config: { id: 'config1', section: 'general', key: 'siteName' },
      };

      (mockPrisma.configHistory.findUnique as jest.Mock).mockResolvedValue(mockHistoryItem);
      (mockPrisma.siteConfig.findUnique as jest.Mock).mockResolvedValue({
        id: 'config1',
        section: 'general',
        key: 'siteName',
        value: 'new',
      });
      (mockPrisma.siteConfig.update as jest.Mock).mockResolvedValue({});
      (mockPrisma.configHistory.update as jest.Mock).mockResolvedValue({});
      (mockPrisma.configHistory.create as jest.Mock).mockResolvedValue({});

      const request = new NextRequest('http://localhost/api/admin/config/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'revert-change', id: 'history1' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should apply snapshot for admin user', async () => {
      const { auth } = await import('@/auth');
      const { default: mockPrisma } = await import('@/lib/prisma');

      (auth as jest.Mock).mockResolvedValue({
        user: { id: 'admin1', role: 'ADMIN', email: 'admin@test.com' },
      });

      const mockSnapshot = {
        id: 'snapshot1',
        name: 'Snapshot 1',
        data: { general: { siteName: 'Test' } },
      };

      (mockPrisma.configSnapshot.findUnique as jest.Mock).mockResolvedValue(mockSnapshot);
      (mockPrisma.siteConfig.findUnique as jest.Mock).mockResolvedValue({
        id: 'config1',
        section: 'general',
        key: 'siteName',
        value: 'old',
      });
      (mockPrisma.siteConfig.update as jest.Mock).mockResolvedValue({});
      (mockPrisma.configHistory.create as jest.Mock).mockResolvedValue({});

      const request = new NextRequest('http://localhost/api/admin/config/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'apply-snapshot', id: 'snapshot1' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should return 400 for invalid action', async () => {
      const { auth } = await import('@/auth');
      (auth as jest.Mock).mockResolvedValue({
        user: { id: 'admin1', role: 'ADMIN' },
      });

      const request = new NextRequest('http://localhost/api/admin/config/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'invalid-action', id: 'test' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Action non valide');
    });
  });
});
