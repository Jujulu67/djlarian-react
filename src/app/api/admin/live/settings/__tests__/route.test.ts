/**
 * Tests for /api/admin/live/settings route
 * @jest-environment node
 */
import { NextRequest } from 'next/server';

import { GET, PATCH } from '../route';

// Mock dependencies
jest.mock('@/auth', () => ({
  auth: jest.fn(),
}));

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    adminSettings: {
      findMany: jest.fn(),
      upsert: jest.fn(),
    },
  },
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('/api/admin/live/settings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET', () => {
    it('should return settings for admin user', async () => {
      const { auth } = await import('@/auth');
      const { default: prisma } = await import('@/lib/prisma');

      (auth as jest.Mock).mockResolvedValue({
        user: { id: 'admin1', role: 'ADMIN' },
      });

      (prisma.adminSettings.findMany as jest.Mock).mockResolvedValue([]);

      const request = new NextRequest('http://localhost/api/admin/live/settings');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toBeDefined();
    });

    it('should return 401 for non-admin user', async () => {
      const { auth } = await import('@/auth');
      (auth as jest.Mock).mockResolvedValue({
        user: { id: 'user1', role: 'USER' },
      });

      const request = new NextRequest('http://localhost/api/admin/live/settings');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Non autorisé');
    });
  });

  describe('PATCH', () => {
    it('should update setting for admin user', async () => {
      const { auth } = await import('@/auth');
      const { default: prisma } = await import('@/lib/prisma');

      (auth as jest.Mock).mockResolvedValue({
        user: { id: 'admin1', role: 'ADMIN' },
      });

      (prisma.adminSettings.upsert as jest.Mock).mockResolvedValue({
        key: 'trackSubmissions',
        value: 'true',
      });

      const request = new NextRequest('http://localhost/api/admin/live/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'trackSubmissions', value: true }),
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toBeDefined();
    });
  });
});
