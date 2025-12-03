/**
 * Tests for /api/soundcloud/releases route
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

jest.mock('@/lib/services/soundcloud', () => ({
  searchSoundCloudArtistTracks: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('/api/soundcloud/releases', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return releases for admin user', async () => {
    const { auth } = await import('@/auth');
    const { default: prisma } = await import('@/lib/prisma');
    const { searchSoundCloudArtistTracks } = await import('@/lib/services/soundcloud');

    (auth as jest.Mock).mockResolvedValue({
      user: { id: 'admin1', email: 'admin@test.com', role: 'ADMIN' },
    });

    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      role: 'ADMIN',
    });

    (searchSoundCloudArtistTracks as jest.Mock).mockResolvedValue([]);

    const request = new NextRequest('http://localhost/api/soundcloud/releases?artistName=test');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.releases).toBeDefined();
  });

  it('should return 401 for unauthenticated user', async () => {
    const { auth } = await import('@/auth');
    (auth as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest('http://localhost/api/soundcloud/releases?artistName=test');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });
});
