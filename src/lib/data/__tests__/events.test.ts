/**
 * Tests for lib/data/events
 */

// Mock dependencies BEFORE imports
jest.mock('@/auth', () => ({
  auth: jest.fn(),
}));
jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    event: {
      findMany: jest.fn(),
      update: jest.fn(),
    },
  },
}));
jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

import { auth } from '@/auth';
import { logger } from '@/lib/logger';
import prisma from '@/lib/prisma';

import { getUpcomingEvents } from '../events';

describe('getUpcomingEvents', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-15T10:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should return upcoming events for regular user', async () => {
    (auth as jest.Mock).mockResolvedValue({
      user: { id: 'user1', role: 'USER' },
    });

    const mockEvents = [
      {
        id: '1',
        title: 'Event 1',
        description: 'Description 1',
        startDate: new Date('2024-01-20T10:00:00Z'),
        location: 'Location 1',
        imageId: 'img1',
        isPublished: true,
        publishAt: null,
        User: { name: 'User 1' },
        TicketInfo: { buyUrl: 'https://tickets.com' },
        RecurrenceConfig: null,
        Event: null,
      },
    ];

    (prisma.event.findMany as jest.Mock).mockResolvedValue(mockEvents);

    const result = await getUpcomingEvents(3);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      id: '1',
      title: 'Event 1',
      description: 'Description 1',
      date: '2024-01-20T10:00:00.000Z',
      location: 'Location 1',
      imageId: 'img1',
      ticketUrl: 'https://tickets.com',
      isVirtual: false,
    });

    expect(prisma.event.findMany).toHaveBeenCalledWith({
      where: {
        isPublished: true,
        OR: [
          {
            startDate: {
              gte: expect.any(Date),
            },
          },
          {
            RecurrenceConfig: { isNot: null },
          },
        ],
      },
      orderBy: { startDate: 'asc' },
      include: {
        User: {
          select: {
            name: true,
          },
        },
        TicketInfo: true,
        RecurrenceConfig: true,
        Event: {
          select: {
            id: true,
          },
        },
      },
    });
  });

  it('should return upcoming events for admin (including unpublished)', async () => {
    (auth as jest.Mock).mockResolvedValue({
      user: { id: 'admin1', role: 'ADMIN' },
    });

    const mockEvents = [
      {
        id: '1',
        title: 'Event 1',
        description: 'Description 1',
        startDate: new Date('2024-01-20T10:00:00Z'),
        location: 'Location 1',
        imageId: 'img1',
        isPublished: false,
        publishAt: null,
        User: { name: 'Admin' },
        TicketInfo: null,
        RecurrenceConfig: null,
        Event: null,
      },
    ];

    (prisma.event.findMany as jest.Mock).mockResolvedValue(mockEvents);

    const result = await getUpcomingEvents(3);

    expect(result).toHaveLength(1);
    expect(prisma.event.findMany).toHaveBeenCalledWith({
      where: {
        OR: [
          {
            startDate: {
              gte: expect.any(Date),
            },
          },
          {
            RecurrenceConfig: { isNot: null },
          },
        ],
      },
      orderBy: { startDate: 'asc' },
      include: {
        User: {
          select: {
            name: true,
          },
        },
        TicketInfo: true,
        RecurrenceConfig: true,
        Event: {
          select: {
            id: true,
          },
        },
      },
    });
  });

  it('should handle events without ticket info', async () => {
    (auth as jest.Mock).mockResolvedValue({
      user: { id: 'user1', role: 'USER' },
    });

    const mockEvents = [
      {
        id: '1',
        title: 'Event 1',
        description: 'Description 1',
        startDate: new Date('2024-01-20T10:00:00Z'),
        location: 'Location 1',
        imageId: 'img1',
        isPublished: true,
        publishAt: null,
        User: { name: 'User 1' },
        TicketInfo: null,
        RecurrenceConfig: null,
        Event: null,
      },
    ];

    (prisma.event.findMany as jest.Mock).mockResolvedValue(mockEvents);

    const result = await getUpcomingEvents(3);

    expect(result[0].ticketUrl).toBeUndefined();
  });

  it('should respect the limit parameter', async () => {
    (auth as jest.Mock).mockResolvedValue({
      user: { id: 'user1', role: 'USER' },
    });

    const events = Array(10)
      .fill(null)
      .map((_, i) => ({
        id: String(i),
        title: `Event ${i}`,
        startDate: new Date('2024-01-20T10:00:00Z'),
        isPublished: true,
        RecurrenceConfig: null,
      }));
    (prisma.event.findMany as jest.Mock).mockResolvedValue(events);

    const result = await getUpcomingEvents(5);

    expect(result).toHaveLength(5);
    expect(prisma.event.findMany).toHaveBeenCalled();
  });

  it('should handle errors gracefully', async () => {
    (auth as jest.Mock).mockResolvedValue({
      user: { id: 'user1', role: 'USER' },
    });

    (prisma.event.findMany as jest.Mock).mockRejectedValue(new Error('Database error'));

    const result = await getUpcomingEvents(3);

    expect(result).toEqual([]);
    expect(logger.error).toHaveBeenCalledWith(
      'Erreur lors de la récupération des événements',
      expect.any(Error)
    );
  });

  it('should handle null description', async () => {
    (auth as jest.Mock).mockResolvedValue({
      user: { id: 'user1', role: 'USER' },
    });

    const mockEvents = [
      {
        id: '1',
        title: 'Event 1',
        description: null,
        startDate: new Date('2024-01-20T10:00:00Z'),
        location: 'Location 1',
        imageId: 'img1',
        isPublished: true,
        publishAt: null,
        User: { name: 'User 1' },
        TicketInfo: null,
        RecurrenceConfig: null,
        Event: null,
      },
    ];

    (prisma.event.findMany as jest.Mock).mockResolvedValue(mockEvents);

    const result = await getUpcomingEvents(3);

    expect(result[0].description).toBe('');
  });
});
