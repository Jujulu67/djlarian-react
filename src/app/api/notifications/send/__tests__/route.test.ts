/**
 * Tests for /api/notifications/send route
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
      findMany: jest.fn(),
    },
    notification: {
      create: jest.fn(),
      createMany: jest.fn(),
      findFirst: jest.fn(),
    },
    friendship: {
      findFirst: jest.fn(),
    },
  },
}));

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid'),
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('/api/notifications/send', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should send notification to specific user', async () => {
    const { auth } = await import('@/auth');
    const { default: prisma } = await import('@/lib/prisma');

    (auth as jest.Mock).mockResolvedValue({
      user: { id: 'user1', role: 'USER' },
    });

    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: 'user1',
      role: 'USER',
      name: 'Test User',
      email: 'test@test.com',
    });

    (prisma.user.findUnique as jest.Mock)
      .mockResolvedValueOnce({
        id: 'user1',
        role: 'USER',
        name: 'Test User',
        email: 'test@test.com',
      })
      .mockResolvedValueOnce({
        id: 'user2',
        role: 'USER',
        name: 'User 2',
        email: 'user2@test.com',
      });

    (prisma.friendship.findFirst as jest.Mock).mockResolvedValue({
      id: 'friendship-1',
      status: 'ACCEPTED',
    });

    (prisma.notification.create as jest.Mock)
      .mockResolvedValueOnce({
        id: 'notif-1',
        userId: 'user2',
        title: 'Test Notification',
        message: 'Test message',
      })
      .mockResolvedValueOnce({
        id: 'notif-2',
        userId: 'user1',
        title: 'Test Notification',
        message: 'Test message',
      });

    const request = new NextRequest('http://localhost/api/notifications/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: 'user2',
        title: 'Test Notification',
        message: 'Test message',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.data).toBeDefined();
    expect(data.message).toBe('Notification créée');
    expect(prisma.notification.create).toHaveBeenCalled();
  });

  it('should return 401 for unauthenticated user', async () => {
    const { auth } = await import('@/auth');
    (auth as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest('http://localhost/api/notifications/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: 'user2',
        title: 'Test Notification',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Non autorisé');
  });

  it('should return 400 if title is missing', async () => {
    const { auth } = await import('@/auth');
    const { default: prisma } = await import('@/lib/prisma');

    (auth as jest.Mock).mockResolvedValue({
      user: { id: 'user1', role: 'USER' },
    });

    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: 'user1',
      role: 'USER',
      name: 'Test User',
      email: 'test@test.com',
    });

    const request = new NextRequest('http://localhost/api/notifications/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: 'user2',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('title est requis');
  });

  it('should allow admin to send to all users', async () => {
    const { auth } = await import('@/auth');
    const { default: prisma } = await import('@/lib/prisma');

    (auth as jest.Mock).mockResolvedValue({
      user: { id: 'admin1', role: 'ADMIN' },
    });

    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: 'admin1',
      role: 'ADMIN',
      name: 'Admin',
      email: 'admin@test.com',
    });

    (prisma.user.findMany as jest.Mock).mockResolvedValue([{ id: 'user1' }, { id: 'user2' }]);

    (prisma.notification.createMany as jest.Mock).mockResolvedValue({ count: 2 });

    const request = new NextRequest('http://localhost/api/notifications/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Broadcast Notification',
        message: 'Test message',
        sendToAll: true,
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.data).toBeDefined();
    expect(data.data.count).toBe(2);
    expect(prisma.notification.createMany).toHaveBeenCalled();
  });

  it('should block sendToAll for non-admin', async () => {
    const { auth } = await import('@/auth');
    const { default: prisma } = await import('@/lib/prisma');

    (auth as jest.Mock).mockResolvedValue({
      user: { id: 'user1', role: 'USER' },
    });

    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: 'user1',
      role: 'USER',
      name: 'Test User',
      email: 'test@test.com',
    });

    const request = new NextRequest('http://localhost/api/notifications/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Broadcast Notification',
        sendToAll: true,
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toContain('administrateurs');
  });
});
