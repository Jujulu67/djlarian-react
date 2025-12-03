/**
 * Tests for /api/events route
 * @jest-environment node
 */
import { NextRequest } from 'next/server';

import { GET, POST } from '../route';

// Mock dependencies
jest.mock('@/auth', () => ({
  auth: jest.fn(),
}));

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    event: {
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
  },
}));

jest.mock('@/lib/api/rateLimiter', () => ({
  rateLimit: jest.fn(() => null),
}));

jest.mock('@/lib/api/webhooks', () => ({
  sendWebhook: jest.fn(() => Promise.resolve()),
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
  },
}));

describe('/api/events', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET', () => {
    it('should return events for authenticated user', async () => {
      const { auth } = await import('@/auth');
      const { default: prisma } = await import('@/lib/prisma');

      (auth as jest.Mock).mockResolvedValue({
        user: { id: 'user1', role: 'USER' },
      });

      const mockEvents = [
        {
          id: '1',
          title: 'Event 1',
          location: 'Location 1',
          startDate: new Date('2024-01-01'),
          isPublished: true,
          User: { name: 'User' },
          TicketInfo: null,
          RecurrenceConfig: null,
          Event: null,
        },
      ];

      (prisma.event.findMany as jest.Mock).mockResolvedValue(mockEvents);
      (prisma.event.count as jest.Mock).mockResolvedValue(1);

      const request = new NextRequest('http://localhost/api/events');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.events).toBeDefined();
      expect(data.data.pagination).toBeDefined();
      expect(prisma.event.findMany).toHaveBeenCalled();
    });

    it('should filter by title', async () => {
      const { auth } = await import('@/auth');
      const { default: prisma } = await import('@/lib/prisma');

      (auth as jest.Mock).mockResolvedValue({
        user: { id: 'user1', role: 'USER' },
      });

      (prisma.event.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.event.count as jest.Mock).mockResolvedValue(0);

      const request = new NextRequest('http://localhost/api/events?title=Test');
      await GET(request);

      expect(prisma.event.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            title: expect.objectContaining({
              contains: 'Test',
            }),
          }),
        })
      );
    });

    it('should show all events for admin', async () => {
      const { auth } = await import('@/auth');
      const { default: prisma } = await import('@/lib/prisma');

      (auth as jest.Mock).mockResolvedValue({
        user: { id: 'admin1', role: 'ADMIN' },
      });

      (prisma.event.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.event.count as jest.Mock).mockResolvedValue(0);

      const request = new NextRequest('http://localhost/api/events');
      await GET(request);

      expect(prisma.event.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.not.objectContaining({
            isPublished: true,
          }),
        })
      );
    });

    it('should auto-publish events with publishAt in past', async () => {
      const { auth } = await import('@/auth');
      const { default: prisma } = await import('@/lib/prisma');

      (auth as jest.Mock).mockResolvedValue({
        user: { id: 'user1', role: 'USER' },
      });

      const pastDate = new Date('2020-01-01');
      const mockEvents = [
        {
          id: '1',
          title: 'Event 1',
          publishAt: pastDate,
          isPublished: false,
          User: { name: 'User' },
          TicketInfo: null,
          RecurrenceConfig: null,
          Event: null,
        },
      ];

      (prisma.event.findMany as jest.Mock).mockResolvedValue(mockEvents);
      (prisma.event.count as jest.Mock).mockResolvedValue(1);
      (prisma.event.update as jest.Mock).mockResolvedValue({});

      const request = new NextRequest('http://localhost/api/events');
      await GET(request);

      expect(prisma.event.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { isPublished: true },
      });
    });
  });

  describe('POST', () => {
    it('should create event for admin', async () => {
      const { auth } = await import('@/auth');
      const { default: prisma } = await import('@/lib/prisma');
      const { sendWebhook } = await import('@/lib/api/webhooks');

      (auth as jest.Mock).mockResolvedValue({
        user: { id: 'admin1', role: 'ADMIN', email: 'admin@test.com' },
      });

      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 'admin1' });

      const newEvent = {
        id: 'new-event-1',
        title: 'New Event',
        location: 'Location',
        startDate: new Date('2024-01-01'),
      };

      (prisma.event.create as jest.Mock).mockResolvedValue(newEvent);

      const request = new Request('http://localhost/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'New Event',
          location: 'Location',
          startDate: '2024-01-01',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.event).toBeDefined();
      expect(sendWebhook).toHaveBeenCalled();
    });

    it('should return 403 for non-admin', async () => {
      const { auth } = await import('@/auth');

      (auth as jest.Mock).mockResolvedValue({
        user: { id: 'user1', role: 'USER' },
      });

      const request = new Request('http://localhost/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'New Event',
          location: 'Location',
          startDate: '2024-01-01',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Non autorisé');
    });

    it('should return 400 if required fields are missing', async () => {
      const { auth } = await import('@/auth');

      (auth as jest.Mock).mockResolvedValue({
        user: { id: 'admin1', role: 'ADMIN' },
      });

      const request = new Request('http://localhost/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'New Event',
          // location missing
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Titre, lieu et date de début sont requis');
    });

    it('should create recurring event', async () => {
      const { auth } = await import('@/auth');
      const { default: prisma } = await import('@/lib/prisma');

      (auth as jest.Mock).mockResolvedValue({
        user: { id: 'admin1', role: 'ADMIN', email: 'admin@test.com' },
      });

      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 'admin1' });

      const masterEvent = {
        id: 'master-event-1',
        title: 'Recurring Event',
        location: 'Location',
        startDate: new Date('2024-01-01'),
        isMasterEvent: true,
        RecurrenceConfig: {
          id: 'recurrence-1',
          frequency: 'weekly',
          day: null,
          endDate: null,
          excludedDates: null,
        },
      };

      (prisma.event.create as jest.Mock).mockResolvedValue(masterEvent);

      const request = new Request('http://localhost/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Recurring Event',
          location: 'Location',
          startDate: '2024-01-01',
          recurrence: {
            isRecurring: true,
            frequency: 'weekly',
          },
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.event).toBeDefined();
      expect(data.virtualOccurrencesCount).toBeDefined();
    });
  });
});
