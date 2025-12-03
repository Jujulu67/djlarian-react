/**
 * Tests for /api/friends/[id]/reject route
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
    friendship: {
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    notification: {
      create: jest.fn(),
    },
  },
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
  },
}));

describe('/api/friends/[id]/reject', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should reject friend request', async () => {
    const { auth } = await import('@/auth');
    const { default: prisma } = await import('@/lib/prisma');

    (auth as jest.Mock).mockResolvedValue({
      user: { id: 'user2', role: 'USER' },
    });

    (prisma.friendship.findUnique as jest.Mock).mockResolvedValue({
      id: 'friendship-1',
      requesterId: 'user1',
      recipientId: 'user2',
      status: 'PENDING',
      Requester: {
        id: 'user1',
        name: 'User 1',
        email: 'user1@test.com',
        image: null,
      },
    });

    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: 'user2',
      name: 'User 2',
      email: 'user2@test.com',
    });

    (prisma.friendship.delete as jest.Mock).mockResolvedValue({
      id: 'friendship-1',
    });

    (prisma.notification.create as jest.Mock).mockResolvedValue({
      id: 'notif-1',
    });

    const request = new NextRequest('http://localhost/api/friends/friendship-1/reject', {
      method: 'POST',
    });

    const response = await POST(request, { params: Promise.resolve({ id: 'friendship-1' }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data).toBeDefined();
  });

  it('should return 401 for unauthenticated user', async () => {
    const { auth } = await import('@/auth');
    (auth as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest('http://localhost/api/friends/friendship-1/reject', {
      method: 'POST',
    });

    const response = await POST(request, { params: Promise.resolve({ id: 'friendship-1' }) });
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Non autorisé');
  });
});
