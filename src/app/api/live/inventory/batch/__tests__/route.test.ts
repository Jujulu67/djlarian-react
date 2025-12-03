/**
 * Tests for /api/live/inventory/batch route
 * @jest-environment node
 */
import { NextRequest } from 'next/server';
import { z } from 'zod';

import { POST } from '../route';

// Mock dependencies
jest.mock('@/auth', () => ({
  auth: jest.fn(),
}));

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    userLiveItem: {
      findMany: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn((promises) => Promise.all(promises)),
  },
}));

jest.mock('@/lib/db-performance', () => ({
  createDbPerformanceLogger: jest.fn(() => ({
    start: jest.fn(() => Date.now()),
    end: jest.fn(),
    logQuery: jest.fn(),
  })),
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('/api/live/inventory/batch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should process batch actions for authenticated user', async () => {
    const { auth } = await import('@/auth');
    const { default: prisma } = await import('@/lib/prisma');

    (auth as jest.Mock).mockResolvedValue({
      user: { id: 'user1', role: 'USER' },
    });

    (prisma.userLiveItem.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'user-item-1',
        userId: 'user1',
        itemId: 'item-1',
        quantity: 5,
        activatedQuantity: 0,
        isActivated: false,
        activatedAt: null,
        LiveItem: {
          id: 'item-1',
          type: 'TICKET',
          name: 'Test Item',
        },
      },
    ]);

    (prisma.userLiveItem.update as jest.Mock).mockResolvedValue({
      id: 'user-item-1',
      activatedQuantity: 1,
      quantity: 5,
    });

    const request = new NextRequest('http://localhost/api/live/inventory/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        actions: [{ itemId: 'item-1', action: 'activate' }],
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data).toBeDefined();
    expect(data.data.results).toBeDefined();
  });

  it('should return 401 for unauthenticated user', async () => {
    const { auth } = await import('@/auth');
    (auth as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest('http://localhost/api/live/inventory/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        actions: [{ itemId: 'item-1', action: 'activate' }],
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Non authentifié');
  });

  it('should return 400 for invalid data', async () => {
    const { auth } = await import('@/auth');
    (auth as jest.Mock).mockResolvedValue({
      user: { id: 'user1', role: 'USER' },
    });

    const request = new NextRequest('http://localhost/api/live/inventory/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        actions: [],
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Données invalides');
  });

  it('should return 404 if items not found', async () => {
    const { auth } = await import('@/auth');
    const { default: prisma } = await import('@/lib/prisma');

    (auth as jest.Mock).mockResolvedValue({
      user: { id: 'user1', role: 'USER' },
    });

    (prisma.userLiveItem.findMany as jest.Mock).mockResolvedValue([]);

    const request = new NextRequest('http://localhost/api/live/inventory/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        actions: [{ itemId: 'item-1', action: 'activate' }],
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Certains items ne sont pas trouvés');
  });
});
