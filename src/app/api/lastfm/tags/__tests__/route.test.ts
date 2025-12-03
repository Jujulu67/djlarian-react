/**
 * Tests for /api/lastfm/tags route
 * @jest-environment node
 */
import { NextRequest } from 'next/server';

import { POST } from '../route';

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

jest.mock('@/lib/services/lastfm', () => ({
  getTrackInfo: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
  },
}));

describe('/api/lastfm/tags', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return track info for admin user', async () => {
    const { auth } = await import('@/auth');
    const { default: prisma } = await import('@/lib/prisma');
    const { getTrackInfo } = await import('@/lib/services/lastfm');

    (auth as jest.Mock).mockResolvedValue({
      user: { id: 'admin1', email: 'admin@test.com', role: 'ADMIN' },
    });

    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      role: 'ADMIN',
    });

    (getTrackInfo as jest.Mock).mockResolvedValue({
      tags: ['electronic', 'house'],
    });

    const request = new NextRequest('http://localhost/api/lastfm/tags', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ artist: 'Artist', title: 'Track' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toBeDefined();
  });

  it('should return 401 for unauthenticated user', async () => {
    const { auth } = await import('@/auth');
    (auth as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest('http://localhost/api/lastfm/tags', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ artist: 'Artist', title: 'Track' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });
});
