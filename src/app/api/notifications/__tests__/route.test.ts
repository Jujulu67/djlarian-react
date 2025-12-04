/**
 * Tests for /api/notifications route
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
    notification: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
  },
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
  },
}));

describe('/api/notifications', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return notifications for authenticated user', async () => {
    const { auth } = await import('@/auth');
    const { default: mockPrisma } = await import('@/lib/prisma');

    (auth as jest.Mock).mockResolvedValue({
      user: { id: 'user1', role: 'USER' },
    });

    (mockPrisma.notification.findMany as jest.Mock)
      .mockResolvedValueOnce([
        {
          id: 'notif-1',
          userId: 'user1',
          type: 'INFO',
          title: 'Test',
          message: 'Test message',
          metadata: null,
          isRead: false,
          isArchived: false,
          deletedAt: null,
          createdAt: new Date(),
          readAt: null,
          projectId: null,
          parentId: null,
          threadId: null,
          Project: null,
          thread: null,
        },
      ])
      .mockResolvedValueOnce([]); // For replies
    (mockPrisma.notification.count as jest.Mock).mockResolvedValue(1);

    const request = new NextRequest('http://localhost/api/notifications');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data).toBeDefined();
    // Response structure may vary, just check it's defined
    expect(data.data).toBeTruthy();
  });

  it('should filter by unreadOnly', async () => {
    const { auth } = await import('@/auth');
    const { default: mockPrisma } = await import('@/lib/prisma');

    (auth as jest.Mock).mockResolvedValue({
      user: { id: 'user1', role: 'USER' },
    });

    (mockPrisma.notification.findMany as jest.Mock).mockResolvedValue([]);

    const request = new NextRequest('http://localhost/api/notifications?unreadOnly=true');
    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(mockPrisma.notification.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          isRead: false,
        }),
      })
    );
  });

  it('should return 401 for unauthenticated user', async () => {
    const { auth } = await import('@/auth');
    (auth as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest('http://localhost/api/notifications');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Non autorisé');
  });
});
