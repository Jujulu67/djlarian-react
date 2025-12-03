/**
 * Tests for /api/projects/milestones/check route
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
  checkProjectMilestones: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
  },
}));

describe('/api/projects/milestones/check', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should check all milestones', async () => {
    const { auth } = await import('@/auth');
    const { checkAllUserMilestones } = await import('@/lib/utils/checkMilestoneNotifications');

    (auth as jest.Mock).mockResolvedValue({
      user: { id: 'user1', role: 'USER' },
    });

    (checkAllUserMilestones as jest.Mock).mockResolvedValue({
      created: 2,
      skipped: 1,
      errors: [],
    });

    const request = new NextRequest('http://localhost/api/projects/milestones/check');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data).toBeDefined();
  });

  it('should check specific project milestone', async () => {
    const { auth } = await import('@/auth');
    const { checkProjectMilestones } = await import('@/lib/utils/checkMilestoneNotifications');

    (auth as jest.Mock).mockResolvedValue({
      user: { id: 'user1', role: 'USER' },
    });

    (checkProjectMilestones as jest.Mock).mockResolvedValue({
      created: 1,
      skipped: 0,
      errors: [],
    });

    const request = new NextRequest(
      'http://localhost/api/projects/milestones/check?projectId=project-1'
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data).toBeDefined();
  });

  it('should return 401 for unauthenticated user', async () => {
    const { auth } = await import('@/auth');
    (auth as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest('http://localhost/api/projects/milestones/check');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Non autorisé');
  });
});
