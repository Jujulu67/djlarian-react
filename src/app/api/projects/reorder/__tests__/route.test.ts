/**
 * Tests for /api/projects/reorder route
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
    project: {
      findMany: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn((promises) => Promise.all(promises)),
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

describe('/api/projects/reorder', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should reorder projects', async () => {
    const { auth } = await import('@/auth');
    const { default: prisma } = await import('@/lib/prisma');

    (auth as jest.Mock).mockResolvedValue({
      user: { id: 'user1', role: 'USER' },
    });

    (prisma.project.findMany as jest.Mock).mockResolvedValue([
      { id: 'project-1' },
      { id: 'project-2' },
    ]);

    (prisma.project.update as jest.Mock).mockResolvedValue({
      id: 'project-1',
      order: 1,
    });

    (prisma.project.findMany as jest.Mock)
      .mockResolvedValueOnce([{ id: 'project-1' }, { id: 'project-2' }])
      .mockResolvedValueOnce([
        {
          id: 'project-1',
          order: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
          User: { id: 'user1', name: 'User', email: 'user@test.com' },
        },
      ]);

    const request = new NextRequest('http://localhost/api/projects/reorder', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectOrders: [
          { id: 'project-1', order: 1 },
          { id: 'project-2', order: 2 },
        ],
      }),
    });

    const response = await PATCH(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data).toBeDefined();
  });

  it('should return 401 for unauthenticated user', async () => {
    const { auth } = await import('@/auth');
    (auth as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest('http://localhost/api/projects/reorder', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectOrders: [] }),
    });

    const response = await PATCH(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Non autorisé');
  });
});
