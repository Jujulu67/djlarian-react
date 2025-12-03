/**
 * Tests for /api/projects/purge route
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
    project: {
      deleteMany: jest.fn(),
    },
  },
}));

jest.mock('next/cache', () => ({
  revalidateTag: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
  },
}));

describe('/api/projects/purge', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should purge all user projects', async () => {
    const { auth } = await import('@/auth');
    const { default: prisma } = await import('@/lib/prisma');

    (auth as jest.Mock).mockResolvedValue({
      user: { id: 'user1', role: 'USER' },
    });

    (prisma.project.deleteMany as jest.Mock).mockResolvedValue({
      count: 5,
    });

    const request = new NextRequest('http://localhost/api/projects/purge', {
      method: 'DELETE',
    });

    const response = await DELETE(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.deletedCount).toBe(5);
  });

  it('should return 401 for unauthenticated user', async () => {
    const { auth } = await import('@/auth');
    (auth as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest('http://localhost/api/projects/purge', {
      method: 'DELETE',
    });

    const response = await DELETE(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Non autorisé');
  });
});
