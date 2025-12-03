/**
 * Tests for /api/config/umami route
 * @jest-environment node
 */
import { NextRequest } from 'next/server';

import { GET } from '../route';

// Mock dependencies
jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    siteConfig: {
      findMany: jest.fn(),
    },
  },
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
  },
}));

describe('/api/config/umami', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return umami config', async () => {
    const { default: prisma } = await import('@/lib/prisma');
    (prisma.siteConfig.findMany as jest.Mock).mockResolvedValue([]);

    const request = new NextRequest('http://localhost/api/config/umami');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toBeDefined();
    expect(data.umamiEnabled).toBeDefined();
    expect(data.umamiSiteId).toBeDefined();
  });

  it('should handle database errors gracefully', async () => {
    const { default: prisma } = await import('@/lib/prisma');
    (prisma.siteConfig.findMany as jest.Mock).mockRejectedValue(new Error('Database error'));

    const request = new NextRequest('http://localhost/api/config/umami');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toBeDefined();
  });
});
