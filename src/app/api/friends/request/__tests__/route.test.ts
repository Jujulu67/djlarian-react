/**
 * Tests for /api/friends/request route
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
    user: {
      findUnique: jest.fn(),
    },
    friendship: {
      findFirst: jest.fn(),
      create: jest.fn(),
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

describe('/api/friends/request', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create friend request', async () => {
    const { auth } = await import('@/auth');
    const { default: prisma } = await import('@/lib/prisma');

    (auth as jest.Mock).mockResolvedValue({
      user: { id: 'user1', role: 'USER' },
    });

    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: 'user2',
    });

    (prisma.friendship.findFirst as jest.Mock).mockResolvedValue(null);

    (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({
      id: 'user1',
      name: 'User 1',
      email: 'user1@test.com',
    });

    (prisma.friendship.create as jest.Mock).mockResolvedValue({
      id: 'friendship-1',
      requesterId: 'user1',
      recipientId: 'user2',
      status: 'PENDING',
      createdAt: new Date(),
      Recipient: {
        id: 'user2',
        name: 'User 2',
        email: 'user2@test.com',
        image: null,
      },
    });

    (prisma.notification.create as jest.Mock).mockResolvedValue({
      id: 'notif-1',
    });

    const request = new NextRequest('http://localhost/api/friends/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: 'user2' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.data).toBeDefined();
  });

  it('should return 401 for unauthenticated user', async () => {
    const { auth } = await import('@/auth');
    (auth as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest('http://localhost/api/friends/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: 'user2' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Non autorisé');
  });

  it('should return 400 if userId is missing', async () => {
    const { auth } = await import('@/auth');
    (auth as jest.Mock).mockResolvedValue({
      user: { id: 'user1', role: 'USER' },
    });

    const request = new NextRequest('http://localhost/api/friends/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('userId est requis');
  });

  it('should return 400 if trying to add self', async () => {
    const { auth } = await import('@/auth');
    (auth as jest.Mock).mockResolvedValue({
      user: { id: 'user1', role: 'USER' },
    });

    const request = new NextRequest('http://localhost/api/friends/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: 'user1' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('vous-même');
  });
});
