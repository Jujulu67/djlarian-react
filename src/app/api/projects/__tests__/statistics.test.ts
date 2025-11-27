/**
 * Tests for /api/projects/statistics route
 * @jest-environment node
 */
import { NextRequest } from 'next/server';

import { GET } from '../statistics/route';

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

describe('/api/projects/statistics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return statistics using aggregates', async () => {
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
    (prisma.project.findMany as jest.Mock)
      .mockResolvedValueOnce([]) // terminatedProjects
      .mockResolvedValueOnce([]); // projectsWithStreamsData

    const request = new NextRequest('http://localhost/api/projects/statistics');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.totalProjects).toBe(10);
    expect(data.data.statusBreakdown).toBeDefined();
    expect(data.data.projectsByYear).toBeDefined();
    expect(data.data.streamsEvolution).toBeDefined();
    expect(data.data.metrics).toBeDefined();
  });

  it('should use aggregates for counts instead of loading all projects', async () => {
    const { auth } = await import('@/auth');
    const { default: prisma } = await import('@/lib/prisma');

    (auth as jest.Mock).mockResolvedValue({
      user: { id: 'user1', role: 'USER' },
    });

    (prisma.project.count as jest.Mock).mockResolvedValue(100);
    (prisma.project.groupBy as jest.Mock).mockResolvedValue([]);
    (prisma.project.findMany as jest.Mock).mockResolvedValueOnce([]).mockResolvedValueOnce([]);

    const request = new NextRequest('http://localhost/api/projects/statistics');
    await GET(request);

    // Should use count and groupBy for totals, not findMany
    expect(prisma.project.count).toHaveBeenCalled();
    expect(prisma.project.groupBy).toHaveBeenCalled();
  });

  it('should only load necessary fields for terminated projects', async () => {
    const { auth } = await import('@/auth');
    const { default: prisma } = await import('@/lib/prisma');

    (auth as jest.Mock).mockResolvedValue({
      user: { id: 'user1', role: 'USER' },
    });

    (prisma.project.count as jest.Mock).mockResolvedValue(10);
    (prisma.project.groupBy as jest.Mock).mockResolvedValue([]);
    (prisma.project.findMany as jest.Mock)
      .mockResolvedValueOnce([
        {
          id: '1',
          name: 'Project 1',
          status: 'TERMINE',
          releaseDate: new Date('2024-01-01'),
        },
      ])
      .mockResolvedValueOnce([]);

    const request = new NextRequest('http://localhost/api/projects/statistics');
    await GET(request);

    // First findMany should only select necessary fields
    expect(prisma.project.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        select: expect.objectContaining({
          id: true,
          name: true,
          status: true,
          releaseDate: true,
        }),
      })
    );
  });

  it('should only load necessary fields for projects with streams', async () => {
    const { auth } = await import('@/auth');
    const { default: prisma } = await import('@/lib/prisma');

    (auth as jest.Mock).mockResolvedValue({
      user: { id: 'user1', role: 'USER' },
    });

    (prisma.project.count as jest.Mock).mockResolvedValue(10);
    (prisma.project.groupBy as jest.Mock).mockResolvedValue([]);
    (prisma.project.findMany as jest.Mock).mockResolvedValueOnce([]).mockResolvedValueOnce([
      {
        id: '1',
        name: 'Project 1',
        releaseDate: new Date('2024-01-01'),
        streamsJ7: 1000,
        streamsJ14: 2000,
      },
    ]);

    const request = new NextRequest('http://localhost/api/projects/statistics');
    await GET(request);

    // Second findMany should only select stream fields
    const calls = (prisma.project.findMany as jest.Mock).mock.calls;
    const secondCall = calls[1];
    expect(secondCall[0].select).toEqual({
      id: true,
      name: true,
      releaseDate: true,
      streamsJ7: true,
      streamsJ14: true,
      streamsJ21: true,
      streamsJ28: true,
      streamsJ56: true,
      streamsJ84: true,
    });
  });

  it('should calculate projects by year correctly', async () => {
    const { auth } = await import('@/auth');
    const { default: prisma } = await import('@/lib/prisma');

    (auth as jest.Mock).mockResolvedValue({
      user: { id: 'user1', role: 'USER' },
    });

    (prisma.project.count as jest.Mock).mockResolvedValue(5);
    (prisma.project.groupBy as jest.Mock).mockResolvedValue([]);
    (prisma.project.findMany as jest.Mock)
      .mockResolvedValueOnce([
        {
          id: '1',
          name: 'Project 2023',
          status: 'TERMINE',
          releaseDate: new Date('2023-06-01'),
        },
        {
          id: '2',
          name: 'Project 2024',
          status: 'TERMINE',
          releaseDate: new Date('2024-01-01'),
        },
        {
          id: '3',
          name: 'Project No Date',
          status: 'TERMINE',
          releaseDate: null,
        },
      ])
      .mockResolvedValueOnce([]);

    const request = new NextRequest('http://localhost/api/projects/statistics');
    const response = await GET(request);
    const data = await response.json();

    expect(data.data.projectsByYear).toBeDefined();
    const years = data.data.projectsByYear.map((p: { year: string }) => p.year);
    expect(years).toContain('2023');
    expect(years).toContain('2024');
  });

  it('should return 401 for unauthenticated user', async () => {
    const { auth } = await import('@/auth');
    (auth as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest('http://localhost/api/projects/statistics');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Non autorisé');
  });
});
