/**
 * Tests for /api/projects/reorder route
 * @jest-environment node
 */
import { NextRequest } from 'next/server';

import { PATCH } from '../reorder/route';

// Mock dependencies
jest.mock('@/auth', () => ({
  auth: jest.fn(),
}));

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    project: {
      findMany: jest.fn(),
      $transaction: jest.fn(),
    },
  },
}));

jest.mock('next/cache', () => ({
  revalidateTag: jest.fn(),
}));

jest.mock('@/lib/utils/serializeProject', () => ({
  serializeProjects: jest.fn((projects) => projects),
}));

describe('/api/projects/reorder', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should reorder projects', async () => {
    const { auth } = await import('@/auth');
    const { default: prisma } = await import('@/lib/prisma');
    const { revalidateTag } = await import('next/cache');

    (auth as jest.Mock).mockResolvedValue({
      user: { id: 'user1', role: 'USER' },
    });

    (prisma.project.findMany as jest.Mock).mockResolvedValue([
      { id: '1', userId: 'user1' },
      { id: '2', userId: 'user1' },
    ]);

    (prisma.project.$transaction as jest.Mock).mockResolvedValue([]);

    (prisma.project.findMany as jest.Mock).mockResolvedValueOnce([
      {
        id: '1',
        userId: 'user1',
        order: 0,
        User: { id: 'user1', name: 'User', email: 'user@test.com' },
      },
      {
        id: '2',
        userId: 'user1',
        order: 1,
        User: { id: 'user1', name: 'User', email: 'user@test.com' },
      },
    ]);

    const request = new NextRequest('http://localhost/api/projects/reorder', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectOrders: [
          { id: '2', order: 0 },
          { id: '1', order: 1 },
        ],
      }),
    });

    const response = await PATCH(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(prisma.project.$transaction).toHaveBeenCalled();
    expect(revalidateTag).toHaveBeenCalled();
  });

  it('should return 403 for projects not owned by user', async () => {
    const { auth } = await import('@/auth');
    const { default: prisma } = await import('@/lib/prisma');

    (auth as jest.Mock).mockResolvedValue({
      user: { id: 'user1', role: 'USER' },
    });

    (prisma.project.findMany as jest.Mock).mockResolvedValue([
      { id: '1', userId: 'user2' }, // Different user
    ]);

    const request = new NextRequest('http://localhost/api/projects/reorder', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectOrders: [{ id: '1', order: 0 }],
      }),
    });

    const response = await PATCH(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("n'existe pas ou ne vous appartient pas");
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

  it('should validate projectOrders is an array', async () => {
    const { auth } = await import('@/auth');
    (auth as jest.Mock).mockResolvedValue({
      user: { id: 'user1', role: 'USER' },
    });

    const request = new NextRequest('http://localhost/api/projects/reorder', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectOrders: 'not-an-array',
      }),
    });

    const response = await PATCH(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('tableau projectOrders');
  });
});
