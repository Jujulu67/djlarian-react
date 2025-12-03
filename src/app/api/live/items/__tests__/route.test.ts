/**
 * Tests for /api/live/items route
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
      findMany: jest.fn(),
    },
  },
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
  },
}));

describe('/api/live/items', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return items for authenticated user', async () => {
    const { auth } = await import('@/auth');
    const { default: prisma } = await import('@/lib/prisma');

    (auth as jest.Mock).mockResolvedValue({
      user: { id: 'user1', role: 'USER' },
    });

    const mockItems = [
      {
        id: 'item1',
        name: 'Item 1',
        type: 'TICKET',
        isActive: true,
      },
    ];

    (prisma.liveItem.findMany as jest.Mock).mockResolvedValue(mockItems);

    const request = new NextRequest('http://localhost/api/live/items');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data).toEqual(mockItems);
    expect(data.message).toBe('Items récupérés');
    expect(prisma.liveItem.findMany).toHaveBeenCalledWith({
      where: {
        isActive: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  });

  it('should return 401 for unauthenticated user', async () => {
    const { auth } = await import('@/auth');
    (auth as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest('http://localhost/api/live/items');
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

    (prisma.liveItem.findMany as jest.Mock).mockRejectedValue(new Error('Database error'));

    const request = new NextRequest('http://localhost/api/live/items');
    const response = await GET(request);

    expect(response.status).toBe(500);
  });
});
