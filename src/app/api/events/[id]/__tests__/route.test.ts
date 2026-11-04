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

  it('should auto-publish a due event for a visitor instead of refusing it', async () => {
    const { auth } = await import('@/auth');
    const { default: prisma } = await import('@/lib/prisma');
    (auth as jest.Mock).mockResolvedValue(null);
    (prisma.event.findUnique as jest.Mock).mockResolvedValue({
      id: 'event-2',
      isPublished: false,
      publishAt: new Date(Date.now() - 60_000),
      startDate: new Date(),
      endDate: new Date(),
      User: { name: 'User 1' },
      TicketInfo: [],
      RecurrenceConfig: null,
      Event: [],
      other_Event: [],
    });

    const request = new NextRequest('http://localhost/api/events/event-2');
    const response = await GET(request, { params: Promise.resolve({ id: 'event-2' }) });

    expect(response.status).toBe(200);
    expect(prisma.event.update).toHaveBeenCalledWith({
      where: { id: 'event-2' },
      data: { isPublished: true },
    });
  });

  it('should refuse an unpublished event not yet due to a visitor', async () => {
    const { auth } = await import('@/auth');
    const { default: prisma } = await import('@/lib/prisma');
    (auth as jest.Mock).mockResolvedValue(null);
    (prisma.event.findUnique as jest.Mock).mockResolvedValue({
      id: 'event-3',
      isPublished: false,
      publishAt: new Date(Date.now() + 3_600_000),
      startDate: new Date(),
      endDate: new Date(),
    });

    const request = new NextRequest('http://localhost/api/events/event-3');
    const response = await GET(request, { params: Promise.resolve({ id: 'event-3' }) });

    expect(response.status).toBe(403);
    expect(prisma.event.update).not.toHaveBeenCalled();
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
