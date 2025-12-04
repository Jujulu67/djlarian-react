import {
  getSpotifyToken,
  searchArtist,
  getArtistReleases,
  getAlbumTracks,
  getTrackAudioFeatures,
  getAlbumGenres,
  formatMusicalKey,
  mapSpotifyAlbumTypeToTrackType,
} from '../spotify';

// Mock logger
jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

// Mock fetch
global.fetch = jest.fn();

// Mock Buffer
global.Buffer = Buffer;

describe('spotify service', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset token cache by resetting modules
    jest.resetModules();
    process.env = {
      ...originalEnv,
      SPOTIFY_CLIENT_ID: 'test-client-id',
      SPOTIFY_CLIENT_SECRET: 'test-client-secret',
    };
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.resetModules();
  });

  describe('getSpotifyToken', () => {
    it('should fetch and cache token', async () => {
      const { getSpotifyToken: getToken } = await import('../spotify');
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: 'test-token-123',
          expires_in: 3600,
        }),
      });

      const token = await getToken();
      expect(token).toBe('test-token-123');
      expect(global.fetch).toHaveBeenCalledWith(
        'https://accounts.spotify.com/api/token',
        expect.objectContaining({
          method: 'POST',
        })
      );
    });

    it('should use cached token if still valid', async () => {
      const { getSpotifyToken: getToken } = await import('../spotify');
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: 'cached-token',
          expires_in: 3600,
        }),
      });

      await getToken();
      jest.clearAllMocks();

      const token2 = await getToken();
      expect(token2).toBe('cached-token');
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should throw error if credentials are missing', async () => {
      process.env.SPOTIFY_CLIENT_ID = '';
      process.env.SPOTIFY_CLIENT_SECRET = '';
      const { getSpotifyToken: getToken } = await import('../spotify');

      await expect(getToken()).rejects.toThrow();
    });

    it('should handle API errors', async () => {
      const { getSpotifyToken: getToken } = await import('../spotify');
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => 'Unauthorized',
      });

      await expect(getToken()).rejects.toThrow();
    });
  });

  describe('searchArtist', () => {
    it('should search and return artist', async () => {
      const { searchArtist: search } = await import('../spotify');
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            access_token: 'test-token',
            expires_in: 3600,
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            artists: {
              items: [{ id: 'artist-1', name: 'Test Artist' }],
            },
          }),
        });

      const artist = await search('Test Artist');
      expect(artist).not.toBeNull();
      expect(artist?.name).toBe('Test Artist');
    });

    it('should return null if no artist found', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            access_token: 'test-token',
            expires_in: 3600,
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            artists: { items: [] },
          }),
        });

      const artist = await searchArtist('Unknown Artist');
      expect(artist).toBeNull();
    });
  });

  describe('getArtistReleases', () => {
    it('should fetch and return releases', async () => {
      const { getArtistReleases: getReleases } = await import('../spotify');
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            access_token: 'test-token',
            expires_in: 3600,
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            items: [
              { id: 'album-1', name: 'Album 1', release_date: '2024-01-01', album_type: 'album' },
              { id: 'album-2', name: 'Album 2', release_date: '2024-02-01', album_type: 'album' },
            ],
            next: null,
          }),
        });

      const releases = await getReleases('artist-1');
      expect(releases).toHaveLength(2);
      expect(releases[0].name).toBe('Album 2'); // Should be sorted by date
    });
  });

  describe('getAlbumTracks', () => {
    it('should fetch and return tracks', async () => {
      const { getAlbumTracks: getTracks } = await import('../spotify');
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            access_token: 'test-token',
            expires_in: 3600,
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            items: [{ id: 'track-1', name: 'Track 1', duration_ms: 180000 }],
          }),
        });

      const tracks = await getTracks('album-1');
      expect(tracks).toHaveLength(1);
      expect(tracks[0].name).toBe('Track 1');
    });
  });

  describe('getTrackAudioFeatures', () => {
    it('should fetch and return audio features', async () => {
      const { getTrackAudioFeatures: getFeatures } = await import('../spotify');
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            access_token: 'test-token',
            expires_in: 3600,
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            tempo: 128.5,
            key: 0,
            mode: 1,
            time_signature: 4,
          }),
        });

      const features = await getFeatures('track-1');
      expect(features).not.toBeNull();
      expect(features?.tempo).toBe(129); // Rounded
    });

    it('should handle 403 error', async () => {
      const { getTrackAudioFeatures: getFeatures } = await import('../spotify');
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            access_token: 'test-token',
            expires_in: 3600,
          }),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 403,
        });

      const features = await getFeatures('track-1');
      expect(features).toBeNull();
    });
  });

  describe('getAlbumGenres', () => {
    it('should fetch and return genres', async () => {
      const { getAlbumGenres: getGenres } = await import('../spotify');
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            access_token: 'test-token',
            expires_in: 3600,
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            genres: ['Electronic', 'House'],
          }),
        });

      const genres = await getGenres('album-1');
      expect(genres).toEqual(['Electronic', 'House']);
    });
  });

  describe('formatMusicalKey', () => {
    it('should format major key', () => {
      const key = formatMusicalKey(0, 1); // C major
      expect(key).toBe('C maj');
    });

    it('should format minor key', () => {
      const key = formatMusicalKey(0, 0); // C minor
      expect(key).toBe('C min');
    });

    it('should return undefined for invalid input', () => {
      expect(formatMusicalKey(undefined, 1)).toBeUndefined();
      expect(formatMusicalKey(0, undefined)).toBeUndefined();
    });
  });

  describe('mapSpotifyAlbumTypeToTrackType', () => {
    it('should map single', () => {
      expect(mapSpotifyAlbumTypeToTrackType('single', false)).toBe('single');
      expect(mapSpotifyAlbumTypeToTrackType('album', true)).toBe('single');
    });

    it('should map compilation to ep', () => {
      expect(mapSpotifyAlbumTypeToTrackType('compilation', false)).toBe('ep');
    });

    it('should map album to album', () => {
      expect(mapSpotifyAlbumTypeToTrackType('album', false)).toBe('album');
    });
  });
});
