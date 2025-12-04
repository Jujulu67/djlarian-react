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

jest.mock('@/lib/services/soundcloud', () => ({
  searchSoundCloudArtistTracks: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
  },
}));

describe('/api/soundcloud/releases', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return releases for admin user', async () => {
    const { auth } = await import('@/auth');
    const { default: mockPrisma } = await import('@/lib/prisma');
    const { searchSoundCloudArtistTracks } = await import('@/lib/services/soundcloud');

    (auth as jest.Mock).mockResolvedValue({
      user: { id: 'admin1', email: 'admin@test.com', role: 'ADMIN' },
    });

    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
      role: 'ADMIN',
    });

    (mockPrisma.trackPlatform.findMany as jest.Mock).mockResolvedValue([]);

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
