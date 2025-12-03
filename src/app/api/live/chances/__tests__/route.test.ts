/**
 * Tests for /api/live/chances route
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
    userTicket: {
      findMany: jest.fn(),
    },
    userLiveItem: {
      findMany: jest.fn(),
    },
    liveSubmission: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
    adminSettings: {
      findUnique: jest.fn(),
    },
  },
}));

jest.mock('@/lib/live/calculations', () => ({
  calculateMultiplier: jest.fn(() => 1.0),
  calculateActiveTickets: jest.fn(() => 0),
  calculateTicketWeight: jest.fn(() => 0),
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
  },
}));

describe('/api/live/chances', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return chances for authenticated user', async () => {
    const { auth } = await import('@/auth');
    const { default: prisma } = await import('@/lib/prisma');

    (auth as jest.Mock).mockResolvedValue({
      user: { id: 'user1', role: 'USER' },
    });

    (prisma.userTicket.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.userLiveItem.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.liveSubmission.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.liveSubmission.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.adminSettings.findUnique as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest('http://localhost/api/live/chances');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data).toBeDefined();
    expect(data.data.chancePercentage).toBeDefined();
    expect(data.data.multiplier).toBeDefined();
  });

  it('should return 401 for unauthenticated user', async () => {
    const { auth } = await import('@/auth');
    (auth as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest('http://localhost/api/live/chances');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Non authentifié');
  });

  it('should handle database errors', async () => {
    const { auth } = await import('@/auth');
    const { default: prisma } = await import('@/lib/prisma');

    (auth as jest.Mock).mockResolvedValue({
      user: { id: 'user1', role: 'USER' },
    });

    (prisma.userTicket.findMany as jest.Mock).mockRejectedValue(new Error('Database error'));

    const request = new NextRequest('http://localhost/api/live/chances');
    const response = await GET(request);

    expect(response.status).toBe(500);
  });
});
