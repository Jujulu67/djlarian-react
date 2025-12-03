/**
 * Tests for /api/live/inventory route
 * @jest-environment node
 */
import { NextRequest } from 'next/server';

import { GET, PUT } from '../route';

// Mock dependencies
jest.mock('@/auth', () => ({
  auth: jest.fn(),
}));

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    userLiveItem: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    userTicket: {
      findMany: jest.fn(),
    },
  },
}));

jest.mock('@/lib/db-performance', () => ({
  createDbPerformanceLogger: jest.fn(() => ({
    start: jest.fn(() => Date.now()),
    end: jest.fn(),
    logQuery: jest.fn(),
  })),
}));

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('/api/live/inventory', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET', () => {
    it('should return inventory for authenticated user', async () => {
      const { auth } = await import('@/auth');
      const { default: prisma } = await import('@/lib/prisma');

      (auth as jest.Mock).mockResolvedValue({
        user: { id: 'user1', role: 'USER' },
      });

      const mockItems = [
        {
          id: 'item1',
          userId: 'user1',
          itemId: 'live-item-1',
          quantity: 5,
          activatedQuantity: 2,
          LiveItem: { id: 'live-item-1', name: 'Item 1', type: 'TICKET' },
        },
      ];

      (prisma.userLiveItem.findMany as jest.Mock).mockResolvedValue(mockItems);
      (prisma.userTicket.findMany as jest.Mock).mockResolvedValue([]);

      const request = new NextRequest('http://localhost/api/live/inventory');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.activatedItems).toBeDefined();
      expect(data.data.unactivatedItems).toBeDefined();
      expect(data.data.totalTickets).toBeDefined();
    });

    it('should return 401 for unauthenticated user', async () => {
      const { auth } = await import('@/auth');
      (auth as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/live/inventory');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Non authentifié');
    });
  });

  describe('PUT', () => {
    it('should activate item', async () => {
      const { auth } = await import('@/auth');
      const { default: prisma } = await import('@/lib/prisma');

      (auth as jest.Mock).mockResolvedValue({
        user: { id: 'user1', role: 'USER' },
      });

      const userItem = {
        id: 'user-item-1',
        userId: 'user1',
        itemId: 'live-item-1',
        quantity: 5,
        activatedQuantity: 0,
        activatedAt: null,
        LiveItem: { id: 'live-item-1', name: 'Item 1', type: 'TICKET' },
      };

      (prisma.userLiveItem.findUnique as jest.Mock).mockResolvedValue(userItem);
      (prisma.userLiveItem.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.userLiveItem.update as jest.Mock).mockResolvedValue({
        ...userItem,
        activatedQuantity: 1,
        isActivated: true,
      });

      const request = new NextRequest('http://localhost/api/live/inventory', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId: 'live-item-1',
          action: 'activate',
        }),
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toContain('activé');
    });

    it('should deactivate item', async () => {
      const { auth } = await import('@/auth');
      const { default: prisma } = await import('@/lib/prisma');

      (auth as jest.Mock).mockResolvedValue({
        user: { id: 'user1', role: 'USER' },
      });

      const userItem = {
        id: 'user-item-1',
        userId: 'user1',
        itemId: 'live-item-1',
        quantity: 5,
        activatedQuantity: 2,
        activatedAt: new Date(),
        LiveItem: { id: 'live-item-1', name: 'Item 1', type: 'TICKET' },
      };

      (prisma.userLiveItem.findUnique as jest.Mock).mockResolvedValue(userItem);
      (prisma.userLiveItem.update as jest.Mock).mockResolvedValue({
        ...userItem,
        activatedQuantity: 1,
      });

      const request = new NextRequest('http://localhost/api/live/inventory', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId: 'live-item-1',
          action: 'deactivate',
        }),
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toContain('désactivé');
    });

    it('should return 404 if item not found', async () => {
      const { auth } = await import('@/auth');
      const { default: prisma } = await import('@/lib/prisma');

      (auth as jest.Mock).mockResolvedValue({
        user: { id: 'user1', role: 'USER' },
      });

      (prisma.userLiveItem.findUnique as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/live/inventory', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId: 'non-existent',
          action: 'activate',
        }),
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Item non trouvé dans votre inventaire');
    });

    it('should return 400 if validation fails', async () => {
      const { auth } = await import('@/auth');

      (auth as jest.Mock).mockResolvedValue({
        user: { id: 'user1', role: 'USER' },
      });

      const request = new NextRequest('http://localhost/api/live/inventory', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId: 'live-item-1',
          action: 'invalid-action',
        }),
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Données invalides');
    });
  });
});
