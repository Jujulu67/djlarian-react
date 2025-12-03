/**
 * Tests for /api/spotify/enrich route
 * @jest-environment node
 */
import { NextRequest } from 'next/server';

import { POST } from '../route';

// Mock dependencies
jest.mock('@/auth', () => ({
  auth: jest.fn(),
}));

jest.mock('@/lib/services/spotify', () => ({
  getAlbumGenres: jest.fn(),
  getAlbumTracks: jest.fn(),
  getTrackAudioFeatures: jest.fn(),
  formatMusicalKey: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

describe('/api/spotify/enrich', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should enrich album data', async () => {
    const { auth } = await import('@/auth');
    const { getAlbumGenres, getAlbumTracks, getTrackAudioFeatures, formatMusicalKey } =
      await import('@/lib/services/spotify');

    (auth as jest.Mock).mockResolvedValue({
      user: { id: 'user1', role: 'USER' },
    });

    (getAlbumGenres as jest.Mock).mockResolvedValue(['Electronic']);
    (getAlbumTracks as jest.Mock).mockResolvedValue([{ id: 'track-1' }]);
    (getTrackAudioFeatures as jest.Mock).mockResolvedValue({
      tempo: 128,
      key: 0,
      mode: 1,
    });
    (formatMusicalKey as jest.Mock).mockReturnValue('C Major');

    const request = new NextRequest('http://localhost/api/spotify/enrich', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ albumId: 'album-1' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.genres).toBeDefined();
  });

  it('should return 401 for unauthenticated user', async () => {
    const { auth } = await import('@/auth');
    (auth as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest('http://localhost/api/spotify/enrich', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ albumId: 'album-1' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });
});
