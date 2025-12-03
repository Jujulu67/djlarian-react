/**
 * Tests for /api/youtube route
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
    user: {
      findUnique: jest.fn(),
    },
    trackPlatform: {
      findMany: jest.fn(),
    },
  },
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock fetch
global.fetch = jest.fn();

describe('/api/youtube', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.YOUTUBE_API_KEY;
  });

  it('should return 401 for unauthenticated user', async () => {
    const { auth } = await import('@/auth');
    (auth as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest('http://localhost/api/youtube?q=test');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('should return 403 for non-admin user', async () => {
    const { auth } = await import('@/auth');
    const { default: prisma } = await import('@/lib/prisma');

    (auth as jest.Mock).mockResolvedValue({
      user: { id: 'user1', email: 'user@test.com', role: 'USER' },
    });

    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      role: 'USER',
    });

    const request = new NextRequest('http://localhost/api/youtube?q=test');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe('Forbidden');
  });

  it('should return 500 if API key not configured', async () => {
    const { auth } = await import('@/auth');
    const { default: prisma } = await import('@/lib/prisma');

    (auth as jest.Mock).mockResolvedValue({
      user: { id: 'admin1', email: 'admin@test.com', role: 'ADMIN' },
    });

    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      role: 'ADMIN',
    });

    const request = new NextRequest('http://localhost/api/youtube?q=test');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toContain('not configured');
  });
});
