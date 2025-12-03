/**
 * Tests for /api/projects/counts route
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
    project: {
      count: jest.fn(),
      groupBy: jest.fn(),
    },
  },
}));

jest.mock('next/cache', () => ({
  unstable_cache: jest.fn((fn) => fn),
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
  },
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
    ]);

    const request = new NextRequest('http://localhost/api/projects/counts');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data).toBeDefined();
    expect(data.data.total).toBe(10);
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

  it('should allow admin to view all projects', async () => {
    const { auth } = await import('@/auth');
    const { default: prisma } = await import('@/lib/prisma');

    (auth as jest.Mock).mockResolvedValue({
      user: { id: 'admin1', role: 'ADMIN' },
    });

    (prisma.project.count as jest.Mock).mockResolvedValue(50);
    (prisma.project.groupBy as jest.Mock).mockResolvedValue([]);

    const request = new NextRequest('http://localhost/api/projects/counts?all=true');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data).toBeDefined();
  });
});
