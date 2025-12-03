/**
 * Tests for /api/notifications/[id]/unarchive route
 * @jest-environment node
 */
import { NextRequest } from 'next/server';

import { PATCH } from '../route';

// Mock dependencies
jest.mock('@/auth', () => ({
  auth: jest.fn(),
}));

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    notification: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

describe('/api/notifications/[id]/unarchive', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should unarchive notification for authenticated user', async () => {
    const { auth } = await import('@/auth');
    const { default: prisma } = await import('@/lib/prisma');

    (auth as jest.Mock).mockResolvedValue({
      user: { id: 'user1' },
    });

    (prisma.notification.findUnique as jest.Mock).mockResolvedValue({
      id: 'notif1',
      userId: 'user1',
      isArchived: true,
    });

    (prisma.notification.update as jest.Mock).mockResolvedValue({
      id: 'notif1',
      userId: 'user1',
      type: 'MILESTONE',
      title: 'Test',
      message: 'Test message',
      metadata: null,
      isRead: false,
      isArchived: false,
      deletedAt: null,
      createdAt: new Date(),
      readAt: null,
      projectId: null,
      Project: null,
    });

    const request = new NextRequest('http://localhost/api/notifications/notif1/unarchive', {
      method: 'PATCH',
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: 'notif1' }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.isArchived).toBe(false);
    expect(data.message).toBe('Notification désarchivée');
  });

  it('should return 401 for unauthenticated user', async () => {
    const { auth } = await import('@/auth');
    (auth as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest('http://localhost/api/notifications/notif1/unarchive', {
      method: 'PATCH',
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: 'notif1' }) });
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Non autorisé');
  });

  it('should return 404 if notification not found', async () => {
    const { auth } = await import('@/auth');
    const { default: prisma } = await import('@/lib/prisma');

    (auth as jest.Mock).mockResolvedValue({
      user: { id: 'user1' },
    });

    (prisma.notification.findUnique as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest('http://localhost/api/notifications/notif1/unarchive', {
      method: 'PATCH',
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: 'notif1' }) });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Notification non trouvée');
  });

  it('should return 401 if notification belongs to another user', async () => {
    const { auth } = await import('@/auth');
    const { default: prisma } = await import('@/lib/prisma');

    (auth as jest.Mock).mockResolvedValue({
      user: { id: 'user1' },
    });

    (prisma.notification.findUnique as jest.Mock).mockResolvedValue({
      id: 'notif1',
      userId: 'user2',
      isArchived: true,
    });

    const request = new NextRequest('http://localhost/api/notifications/notif1/unarchive', {
      method: 'PATCH',
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: 'notif1' }) });
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Non autorisé');
  });
});
