/**
 * Tests for /api/admin/live/consume-queue-skip route
 * @jest-environment node
 */
import { NextRequest } from 'next/server';

import { POST } from '../route';

// Mock dependencies
jest.mock('@/auth', () => ({
  auth: jest.fn(),
}));

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    liveItem: {
      findFirst: jest.fn(),
    },
    userLiveItem: {
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('/api/admin/live/consume-queue-skip', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should consume queue skip for admin user', async () => {
    const { auth } = await import('@/auth');
    const { default: prisma } = await import('@/lib/prisma');

    (auth as jest.Mock).mockResolvedValue({
      user: { id: 'admin1', role: 'ADMIN' },
    });

    (prisma.userLiveItem.findUnique as jest.Mock).mockResolvedValue({
      id: 'user-item-1',
      userId: 'user1',
      itemId: 'item-1',
      activatedQuantity: 1,
      LiveItem: {
        id: 'item-1',
        type: 'SKIP_QUEUE',
      },
    });

    (prisma.userLiveItem.delete as jest.Mock).mockResolvedValue({
      id: 'user-item-1',
    });

    const request = new NextRequest('http://localhost/api/admin/live/consume-queue-skip', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: 'user1', itemId: 'item-1' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data).toBeDefined();
  });

  it('should return 401 for non-admin user', async () => {
    const { auth } = await import('@/auth');
    (auth as jest.Mock).mockResolvedValue({
      user: { id: 'user1', role: 'USER' },
    });

    const request = new NextRequest('http://localhost/api/admin/live/consume-queue-skip', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: 'user1' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Non autorisé');
  });
});
