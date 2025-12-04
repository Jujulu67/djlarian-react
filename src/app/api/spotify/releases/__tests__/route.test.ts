/**
 * Tests for /api/spotify/releases route
 * @jest-environment node
 */
import { NextRequest } from 'next/server';

import { GET } from '../route';

// Mock dependencies
jest.mock('@/auth', () => ({
  auth: jest.fn(),
}));

jest.mock('@/lib/prisma', () => {
  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
    },
    trackPlatform: {
      findMany: jest.fn(),
    },
  };
  return {
    __esModule: true,
    default: mockPrisma,
  };
});

jest.mock('@/lib/services/spotify', () => ({
  getArtistReleases: jest.fn(),
  searchArtist: jest.fn(),
  mapSpotifyAlbumTypeToTrackType: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
  },
}));

describe('/api/spotify/releases', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return releases for admin user', async () => {
    const { auth } = await import('@/auth');
    const { default: mockPrisma } = await import('@/lib/prisma');
    const { getArtistReleases } = await import('@/lib/services/spotify');

    (auth as jest.Mock).mockResolvedValue({
      user: { id: 'admin1', email: 'admin@test.com', role: 'ADMIN' },
    });

    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
      role: 'ADMIN',
    });

    (mockPrisma.trackPlatform.findMany as jest.Mock).mockResolvedValue([]);

    (getArtistReleases as jest.Mock).mockResolvedValue([
      {
        id: 'release-1',
        name: 'Release 1',
        artists: [{ name: 'Artist' }],
        release_date: '2024-01-01',
        release_date_precision: 'day',
        album_type: 'single',
        total_tracks: 1,
        external_urls: {
          spotify: 'https://spotify.com/release-1',
        },
        images: [{ url: 'https://image.com/release-1.jpg' }],
      },
    ]);

    const request = new NextRequest('http://localhost/api/spotify/releases?artistId=test-id');
    const response = await GET(request);
    const data = await response.json();

    if (response.status !== 200) {
      console.log(
        'Spotify Test Failed. Status:',
        response.status,
        'Data:',
        JSON.stringify(data, null, 2)
      );
    }
    expect(response.status).toBe(200);
    expect(data.releases).toBeDefined();
  });

  it('should return 401 for unauthenticated user', async () => {
    const { auth } = await import('@/auth');
    (auth as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest('http://localhost/api/spotify/releases?artistId=test-id');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('should return 403 for non-admin user', async () => {
    const { auth } = await import('@/auth');
    const { default: mockPrisma } = await import('@/lib/prisma');

    (auth as jest.Mock).mockResolvedValue({
      user: { id: 'user1', email: 'user@test.com', role: 'USER' },
    });

    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
      role: 'USER',
    });

    const request = new NextRequest('http://localhost/api/spotify/releases?artistId=test-id');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe('Forbidden');
  });
});
