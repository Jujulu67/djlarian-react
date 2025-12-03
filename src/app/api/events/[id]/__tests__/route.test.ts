/**
 * Tests for /api/events/[id] route
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
    event: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('/api/events/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return event for authenticated user', async () => {
    const { auth } = await import('@/auth');
    const { default: prisma } = await import('@/lib/prisma');

    (auth as jest.Mock).mockResolvedValue({
      user: { id: 'user1', role: 'USER' },
    });

    (prisma.event.findUnique as jest.Mock).mockResolvedValue({
      id: 'event-1',
      isPublished: true,
      startDate: new Date(),
      endDate: new Date(),
      User: { name: 'User 1' },
      TicketInfo: [],
      RecurrenceConfig: null,
      Event: [],
      other_Event: [],
    });

    const request = new NextRequest('http://localhost/api/events/event-1');
    const response = await GET(request, { params: Promise.resolve({ id: 'event-1' }) });

    expect(response.status).toBe(200);
  });

  it('should return 404 for non-existent event', async () => {
    const { auth } = await import('@/auth');
    const { default: prisma } = await import('@/lib/prisma');

    (auth as jest.Mock).mockResolvedValue({
      user: { id: 'user1', role: 'USER' },
    });

    (prisma.event.findUnique as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest('http://localhost/api/events/invalid');
    const response = await GET(request, { params: Promise.resolve({ id: 'invalid' }) });

    expect(response.status).toBeGreaterThanOrEqual(400);
  });
});
