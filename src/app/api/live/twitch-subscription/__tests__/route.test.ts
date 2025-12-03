/**
 * Tests for /api/live/twitch-subscription route
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
    liveItem: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    userLiveItem: {
      findUnique: jest.fn(),
      create: jest.fn(),
      deleteMany: jest.fn(),
    },
  },
}));

jest.mock('@/lib/twitch/client', () => ({
  checkTwitchSubscription: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    debug: jest.fn(),
  },
}));

describe('/api/live/twitch-subscription', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should check subscription and create item for subscribed user', async () => {
    const { auth } = await import('@/auth');
    const { default: prisma } = await import('@/lib/prisma');
    const { checkTwitchSubscription } = await import('@/lib/twitch/client');

    (auth as jest.Mock).mockResolvedValue({
      user: { id: 'user1' },
    });

    (checkTwitchSubscription as jest.Mock).mockResolvedValue({
      isSubscribed: true,
      tier: '1000',
    });

    (prisma.liveItem.findUnique as jest.Mock).mockResolvedValue({
      id: 'item1',
      type: 'SUBSCRIBER_BONUS',
    });

    (prisma.userLiveItem.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.userLiveItem.create as jest.Mock).mockResolvedValue({
      id: 'userItem1',
      userId: 'user1',
      itemId: 'item1',
      quantity: 1,
    });

    const request = new NextRequest('http://localhost/api/live/twitch-subscription', {
      method: 'GET',
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.isSubscribed).toBe(true);
  });

  it('should remove item for unsubscribed user', async () => {
    const { auth } = await import('@/auth');
    const { default: prisma } = await import('@/lib/prisma');
    const { checkTwitchSubscription } = await import('@/lib/twitch/client');

    (auth as jest.Mock).mockResolvedValue({
      user: { id: 'user1' },
    });

    (checkTwitchSubscription as jest.Mock).mockResolvedValue({
      isSubscribed: false,
    });

    (prisma.liveItem.findUnique as jest.Mock).mockResolvedValue({
      id: 'item1',
      type: 'SUBSCRIBER_BONUS',
    });

    (prisma.userLiveItem.deleteMany as jest.Mock).mockResolvedValue({ count: 1 });

    const request = new NextRequest('http://localhost/api/live/twitch-subscription', {
      method: 'GET',
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.isSubscribed).toBe(false);
  });

  it('should return 401 for unauthenticated user', async () => {
    const { auth } = await import('@/auth');
    (auth as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest('http://localhost/api/live/twitch-subscription', {
      method: 'GET',
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Non authentifié');
  });
});
