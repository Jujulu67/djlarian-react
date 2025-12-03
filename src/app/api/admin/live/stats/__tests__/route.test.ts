/**
 * Tests for /api/admin/live/stats route
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
    liveSubmission: {
      findMany: jest.fn(),
    },
  },
}));

jest.mock('@/lib/live/calculations', () => ({
  calculateTicketWeight: jest.fn(() => 10),
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
  },
}));

describe('/api/admin/live/stats', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return stats for admin user', async () => {
    const { auth } = await import('@/auth');
    const { default: prisma } = await import('@/lib/prisma');

    (auth as jest.Mock).mockResolvedValue({
      user: { id: 'admin1', role: 'ADMIN' },
    });

    (prisma.liveSubmission.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'submission-1',
        userId: 'user1',
        isDraft: false,
        isRolled: false,
        User: {
          id: 'user1',
          UserLiveItem: [],
          UserTicket: [],
        },
      },
    ]);

    const request = new NextRequest('http://localhost/api/admin/live/stats');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data).toBeDefined();
    expect(data.data.totalTickets).toBeDefined();
  });

  it('should return 401 for non-admin user', async () => {
    const { auth } = await import('@/auth');
    (auth as jest.Mock).mockResolvedValue({
      user: { id: 'user1', role: 'USER' },
    });

    const request = new NextRequest('http://localhost/api/admin/live/stats');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Non autorisé');
  });
});
