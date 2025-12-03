/**
 * Tests for /api/live/rewards route
 * @jest-environment node
 */
import { NextRequest } from 'next/server';

import { GET, POST } from '../route';

// Mock dependencies
jest.mock('@/auth', () => ({
  auth: jest.fn(),
}));

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    userLiveItem: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    liveItem: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  },
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('/api/live/rewards', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET', () => {
    it('should return rewards for authenticated user', async () => {
      const { auth } = await import('@/auth');
      const { default: prisma } = await import('@/lib/prisma');

      (auth as jest.Mock).mockResolvedValue({
        user: { id: 'user1', role: 'USER' },
      });

      (prisma.userLiveItem.findFirst as jest.Mock)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);

      const request = new NextRequest('http://localhost/api/live/rewards');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toBeDefined();
    });

    it('should return 401 for unauthenticated user', async () => {
      const { auth } = await import('@/auth');
      (auth as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/live/rewards');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Non authentifié');
    });
  });

  describe('POST', () => {
    it('should update rewards for authenticated user', async () => {
      const { auth } = await import('@/auth');
      const { default: prisma } = await import('@/lib/prisma');

      (auth as jest.Mock).mockResolvedValue({
        user: { id: 'user1', role: 'USER' },
      });

      (prisma.liveItem.findUnique as jest.Mock).mockResolvedValue({
        id: 'item-1',
        type: 'LOYALTY_BONUS',
      });

      (prisma.userLiveItem.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.userLiveItem.create as jest.Mock).mockResolvedValue({
        id: 'user-item-1',
      });

      const request = new NextRequest('http://localhost/api/live/rewards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ loyalty: 5 }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toBeDefined();
    });
  });
});
