/**
 * Tests for /api/notifications/[id]/delete route
 * @jest-environment node
 */
import { NextRequest } from 'next/server';

import { DELETE } from '../route';

// Mock dependencies
jest.mock('@/auth', () => ({
  auth: jest.fn(),
}));

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    notification: {
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
  },
}));

describe('/api/notifications/[id]/delete', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should delete notification', async () => {
    const { auth } = await import('@/auth');
    const { default: prisma } = await import('@/lib/prisma');

    (auth as jest.Mock).mockResolvedValue({
      user: { id: 'user1', role: 'USER' },
    });

    (prisma.notification.findUnique as jest.Mock).mockResolvedValue({
      id: 'notif-1',
      userId: 'user1',
    });

    (prisma.notification.delete as jest.Mock).mockResolvedValue({
      id: 'notif-1',
    });

    const request = new NextRequest('http://localhost/api/notifications/notif-1/delete', {
      method: 'DELETE',
    });

    const response = await DELETE(request, { params: Promise.resolve({ id: 'notif-1' }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data).toBeDefined();
  });

  it('should return 401 for unauthenticated user', async () => {
    const { auth } = await import('@/auth');
    (auth as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest('http://localhost/api/notifications/notif-1/delete', {
      method: 'DELETE',
    });

    const response = await DELETE(request, { params: Promise.resolve({ id: 'notif-1' }) });
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Non autorisé');
  });
});
