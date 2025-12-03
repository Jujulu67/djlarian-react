/**
 * Tests for /api/friends route
 * @jest-environment node
 */
import { NextRequest } from 'next/server';

import { GET } from '../route';

// Mock dependencies
jest.mock('@/auth', () => ({
  auth: jest.fn(),
}));

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    friendship: {
      findMany: jest.fn(),
    },
  },
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
  },
}));

describe('/api/friends', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return friends for authenticated user', async () => {
    const { auth } = await import('@/auth');
    const { default: prisma } = await import('@/lib/prisma');

    (auth as jest.Mock).mockResolvedValue({
      user: { id: 'user1', role: 'USER' },
    });

    (prisma.friendship.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'friendship-1',
        requesterId: 'user1',
        recipientId: 'user2',
        status: 'ACCEPTED',
        createdAt: new Date(),
        Requester: {
          id: 'user1',
          name: 'User 1',
          email: 'user1@test.com',
          image: null,
          role: 'USER',
        },
        Recipient: {
          id: 'user2',
          name: 'User 2',
          email: 'user2@test.com',
          image: null,
          role: 'USER',
        },
      },
    ]);

    const request = new NextRequest('http://localhost/api/friends');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data).toBeDefined();
    expect(data.data.friends).toBeDefined();
    expect(data.data.pendingReceived).toBeDefined();
    expect(data.data.pendingSent).toBeDefined();
  });

  it('should return 401 for unauthenticated user', async () => {
    const { auth } = await import('@/auth');
    (auth as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest('http://localhost/api/friends');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Non autorisé');
  });

  it('should handle database errors', async () => {
    const { auth } = await import('@/auth');
    const { default: prisma } = await import('@/lib/prisma');

    (auth as jest.Mock).mockResolvedValue({
      user: { id: 'user1', role: 'USER' },
    });

    (prisma.friendship.findMany as jest.Mock).mockRejectedValue(new Error('Database error'));

    const request = new NextRequest('http://localhost/api/friends');
    const response = await GET(request);

    expect(response.status).toBe(500);
  });
});
