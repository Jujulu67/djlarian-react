/**
 * Tests for /api/projects/counts route
 * @jest-environment node
 */
import { NextRequest } from 'next/server';

import { GET } from '../counts/route';

// Mock dependencies
jest.mock('@/auth', () => ({
  auth: jest.fn(),
}));

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    project: {
      count: jest.fn(),
      groupBy: jest.fn(),
      findMany: jest.fn(),
    },
  },
}));

jest.mock('next/cache', () => ({
  unstable_cache: jest.fn((fn) => fn),
}));

describe('/api/projects/counts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return counts for authenticated user', async () => {
    const { auth } = await import('@/auth');
    const { default: prisma } = await import('@/lib/prisma');

    (auth as jest.Mock).mockResolvedValue({
      user: { id: 'user1', role: 'USER' },
    });

    (prisma.project.count as jest.Mock).mockResolvedValue(10);
    (prisma.project.groupBy as jest.Mock).mockResolvedValue([
      { status: 'EN_COURS', _count: { status: 5 } },
      { status: 'TERMINE', _count: { status: 3 } },
      { status: 'ANNULE', _count: { status: 2 } },
    ] as any);

    const request = new NextRequest('http://localhost/api/projects/counts');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.total).toBe(10);
    expect(data.data.statusBreakdown.EN_COURS).toBe(5);
    expect(data.data.statusBreakdown.TERMINE).toBe(3);
    expect(data.data.statusBreakdown.ANNULE).toBe(2);
  });

  it('should use aggregates instead of loading all projects', async () => {
    const { auth } = await import('@/auth');
    const { default: prisma } = await import('@/lib/prisma');

    (auth as jest.Mock).mockResolvedValue({
      user: { id: 'user1', role: 'USER' },
    });

    (prisma.project.count as jest.Mock).mockResolvedValue(100);
    (prisma.project.groupBy as jest.Mock).mockResolvedValue([]);

    const request = new NextRequest('http://localhost/api/projects/counts');
    await GET(request);

    // Should use count and groupBy, not findMany
    expect(prisma.project.count).toHaveBeenCalled();
    expect(prisma.project.groupBy).toHaveBeenCalled();
    expect(prisma.project.findMany).not.toHaveBeenCalled();
  });

  it('should allow admin to see all projects counts', async () => {
    const { auth } = await import('@/auth');
    const { default: prisma } = await import('@/lib/prisma');

    (auth as jest.Mock).mockResolvedValue({
      user: { id: 'admin1', role: 'ADMIN' },
    });

    (prisma.project.count as jest.Mock).mockResolvedValue(50);
    (prisma.project.groupBy as jest.Mock).mockResolvedValue([]);

    const request = new NextRequest('http://localhost/api/projects/counts?all=true');
    await GET(request);

    expect(prisma.project.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.not.objectContaining({
          userId: expect.anything(),
        }),
      })
    );
  });

  it('should filter by userId for admin', async () => {
    const { auth } = await import('@/auth');
    const { default: prisma } = await import('@/lib/prisma');

    (auth as jest.Mock).mockResolvedValue({
      user: { id: 'admin1', role: 'ADMIN' },
    });

    (prisma.project.count as jest.Mock).mockResolvedValue(5);
    (prisma.project.groupBy as jest.Mock).mockResolvedValue([]);

    const request = new NextRequest('http://localhost/api/projects/counts?userId=user2');
    await GET(request);

    expect(prisma.project.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'user2' },
      })
    );
  });

  it('should return 401 for unauthenticated user', async () => {
    const { auth } = await import('@/auth');
    (auth as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest('http://localhost/api/projects/counts');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Non autorisé');
  });

  it('should handle all status types in breakdown', async () => {
    const { auth } = await import('@/auth');
    const { default: prisma } = await import('@/lib/prisma');

    (auth as jest.Mock).mockResolvedValue({
      user: { id: 'user1', role: 'USER' },
    });

    (prisma.project.count as jest.Mock).mockResolvedValue(10);
    (prisma.project.groupBy as jest.Mock).mockResolvedValue([
      { status: 'TERMINE', _count: { status: 2 } },
      { status: 'EN_COURS', _count: { status: 3 } },
      { status: 'ANNULE', _count: { status: 1 } },
      { status: 'A_REWORK', _count: { status: 2 } },
      { status: 'GHOST_PRODUCTION', _count: { status: 2 } },
    ]);

    const request = new NextRequest('http://localhost/api/projects/counts');
    const response = await GET(request);
    const data = await response.json();

    expect(data.data.statusBreakdown.TERMINE).toBe(2);
    expect(data.data.statusBreakdown.EN_COURS).toBe(3);
    expect(data.data.statusBreakdown.ANNULE).toBe(1);
    expect(data.data.statusBreakdown.A_REWORK).toBe(2);
    expect(data.data.statusBreakdown.GHOST_PRODUCTION).toBe(2);
  });
});
