/**
 * Tests for /api/notifications/check-all route
 * @jest-environment node
 */
import { NextRequest } from 'next/server';

import { GET } from '../route';

// Mock dependencies
jest.mock('@/auth', () => ({
  auth: jest.fn(),
}));

jest.mock('@/lib/utils/checkMilestoneNotifications', () => ({
  checkAllUserMilestones: jest.fn(),
}));

jest.mock('@/lib/utils/checkUpcomingReleases', () => ({
  checkAllUserUpcomingReleases: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
  },
}));

describe('/api/notifications/check-all', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should check all notifications', async () => {
    const { auth } = await import('@/auth');
    const { checkAllUserMilestones } = await import('@/lib/utils/checkMilestoneNotifications');
    const { checkAllUserUpcomingReleases } = await import('@/lib/utils/checkUpcomingReleases');

    (auth as jest.Mock).mockResolvedValue({
      user: { id: 'user1', role: 'USER' },
    });

    (checkAllUserMilestones as jest.Mock).mockResolvedValue({
      created: 2,
      skipped: 1,
      errors: [],
    });

    (checkAllUserUpcomingReleases as jest.Mock).mockResolvedValue({
      created: 1,
      skipped: 0,
      errors: [],
    });

    const request = new NextRequest('http://localhost/api/notifications/check-all');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data).toBeDefined();
    expect(data.data.totalCreated).toBe(3);
  });

  it('should return 401 for unauthenticated user', async () => {
    const { auth } = await import('@/auth');
    (auth as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest('http://localhost/api/notifications/check-all');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Non autorisé');
  });
});
