/**
 * Tests for /api/projects/releases/check route
 * @jest-environment node
 */
import { NextRequest } from 'next/server';

import { GET } from '../route';

// Mock dependencies
jest.mock('@/auth', () => ({
  auth: jest.fn(),
}));

jest.mock('@/lib/utils/checkUpcomingReleases', () => ({
  checkAllUserUpcomingReleases: jest.fn(),
  checkProjectUpcomingRelease: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
  },
}));

describe('/api/projects/releases/check', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should check all releases', async () => {
    const { auth } = await import('@/auth');
    const { checkAllUserUpcomingReleases } = await import('@/lib/utils/checkUpcomingReleases');

    (auth as jest.Mock).mockResolvedValue({
      user: { id: 'user1', role: 'USER' },
    });

    (checkAllUserUpcomingReleases as jest.Mock).mockResolvedValue({
      created: 1,
      skipped: 0,
      errors: [],
    });

    const request = new NextRequest('http://localhost/api/projects/releases/check');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data).toBeDefined();
  });

  it('should return 401 for unauthenticated user', async () => {
    const { auth } = await import('@/auth');
    (auth as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest('http://localhost/api/projects/releases/check');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Non autorisé');
  });
});
