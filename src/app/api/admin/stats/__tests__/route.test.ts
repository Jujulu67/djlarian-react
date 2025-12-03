/**
 * Tests for /api/admin/stats route
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
    user: {
      count: jest.fn(),
    },
    event: {
      count: jest.fn(),
    },
    track: {
      count: jest.fn(),
    },
    $queryRaw: jest.fn(),
  },
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
  },
}));

describe('/api/admin/stats', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return stats for admin user', async () => {
    const { auth } = await import('@/auth');
    const { default: prisma } = await import('@/lib/prisma');

    (auth as jest.Mock).mockResolvedValue({
      user: { id: 'admin1', role: 'ADMIN' },
    });

    (prisma.user.count as jest.Mock).mockResolvedValue(10);
    (prisma.event.count as jest.Mock).mockResolvedValue(5);
    (prisma.track.count as jest.Mock).mockResolvedValue(20);
    (prisma.$queryRaw as jest.Mock).mockResolvedValue([{ count: BigInt(2) }]);

    const request = new NextRequest('http://localhost/api/admin/stats');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.usersCount).toBeDefined();
    expect(data.eventsCount).toBeDefined();
    expect(data.tracksCount).toBeDefined();
  });

  it('should return 401 for non-admin user', async () => {
    const { auth } = await import('@/auth');
    (auth as jest.Mock).mockResolvedValue({
      user: { id: 'user1', role: 'USER' },
    });

    const request = new NextRequest('http://localhost/api/admin/stats');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Non autorisé');
  });
});
