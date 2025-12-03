/**
 * Tests for /api/spotify/scheduled route
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
  },
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('/api/spotify/scheduled', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.SPOTIFY_ARTIST_ID;
  });

  it('should return releases for admin user', async () => {
    const { auth } = await import('@/auth');
    const { default: prisma } = await import('@/lib/prisma');

    (auth as jest.Mock).mockResolvedValue({
      user: { email: 'admin@test.com' },
    });

    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      role: 'ADMIN',
    });

    process.env.SPOTIFY_ARTIST_ID = 'artist123';

    const request = new NextRequest('http://localhost/api/spotify/scheduled', {
      method: 'GET',
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.releases).toEqual([]);
    expect(data.message).toContain('Spotify for Artists API');
  });

  it('should return 401 for unauthenticated user', async () => {
    const { auth } = await import('@/auth');
    (auth as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest('http://localhost/api/spotify/scheduled', {
      method: 'GET',
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('should return 403 for non-admin user', async () => {
    const { auth } = await import('@/auth');
    const { default: prisma } = await import('@/lib/prisma');

    (auth as jest.Mock).mockResolvedValue({
      user: { email: 'user@test.com' },
    });

    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      role: 'USER',
    });

    const request = new NextRequest('http://localhost/api/spotify/scheduled', {
      method: 'GET',
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe('Forbidden');
  });

  it('should return 400 if artistId is missing', async () => {
    const { auth } = await import('@/auth');
    const { default: prisma } = await import('@/lib/prisma');

    (auth as jest.Mock).mockResolvedValue({
      user: { email: 'admin@test.com' },
    });

    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      role: 'ADMIN',
    });

    delete process.env.SPOTIFY_ARTIST_ID;

    const request = new NextRequest('http://localhost/api/spotify/scheduled', {
      method: 'GET',
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('artistId requis');
  });
});
