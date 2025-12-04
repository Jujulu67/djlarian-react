import { fetchThumbnailFromPlatforms } from '../fetchThumbnailFromPlatforms';
import { getSpotifyToken } from '@/lib/services/spotify';
import { extractPlatformId } from '@/lib/utils/music-service';
import { logger } from '@/lib/logger';
import * as cheerio from 'cheerio';

// Mock dependencies
jest.mock('@/lib/services/spotify', () => ({
  getSpotifyToken: jest.fn(),
}));

jest.mock('@/lib/utils/music-service', () => ({
  extractPlatformId: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  },
}));

jest.mock('cheerio', () => ({
  load: jest.fn(),
}));

// Mock global fetch
global.fetch = jest.fn();

describe('fetchThumbnailFromPlatforms', () => {
  const mockGetSpotifyToken = getSpotifyToken as jest.MockedFunction<typeof getSpotifyToken>;
  const mockExtractPlatformId = extractPlatformId as jest.MockedFunction<typeof extractPlatformId>;
  const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
  const mockCheerioLoad = cheerio.load as jest.MockedFunction<typeof cheerio.load>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Spotify', () => {
    it('should fetch thumbnail from Spotify album', async () => {
      mockGetSpotifyToken.mockResolvedValue('test-token');
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          images: [{ url: 'https://spotify.com/image.jpg', height: 640, width: 640 }],
        }),
      } as Response);

      const result = await fetchThumbnailFromPlatforms({
        spotify: 'https://open.spotify.com/album/123',
      });

      expect(result).toEqual({
        url: 'https://spotify.com/image.jpg',
        source: 'spotify',
      });
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.spotify.com/v1/albums/123',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
          }),
        })
      );
    });

    it('should fetch thumbnail from Spotify track', async () => {
      mockGetSpotifyToken.mockResolvedValue('test-token');
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          album: {
            images: [{ url: 'https://spotify.com/track-image.jpg', height: 640, width: 640 }],
          },
        }),
      } as Response);

      const result = await fetchThumbnailFromPlatforms({
        spotify: 'https://open.spotify.com/track/456',
      });

      expect(result).toEqual({
        url: 'https://spotify.com/track-image.jpg',
        source: 'spotify',
      });
    });

    it('should return null if Spotify URL is invalid', async () => {
      const result = await fetchThumbnailFromPlatforms({
        spotify: 'https://invalid-url.com',
      });

      expect(result).toBeNull();
    });

    it('should handle Spotify API errors', async () => {
      mockGetSpotifyToken.mockResolvedValue('test-token');
      mockFetch.mockResolvedValueOnce({
        ok: false,
      } as Response);

      const result = await fetchThumbnailFromPlatforms({
        spotify: 'https://open.spotify.com/album/123',
      });

      expect(result).toBeNull();
    });
  });

  describe('SoundCloud', () => {
    it('should fetch thumbnail from SoundCloud using og:image', async () => {
      const mockMetaOgImage = {
        attr: jest.fn(() => 'https://soundcloud.com/image.jpg'),
      };
      const mockCheerio = jest.fn((selector: string) => {
        if (selector === 'meta[property="og:image"]') {
          return mockMetaOgImage;
        }
        return { attr: jest.fn(() => null), length: 0 };
      });
      mockCheerioLoad.mockReturnValue(mockCheerio as any);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () =>
          '<html><meta property="og:image" content="https://soundcloud.com/image.jpg"></html>',
      } as Response);

      const result = await fetchThumbnailFromPlatforms({
        soundcloud: 'https://soundcloud.com/track',
      });

      expect(result).toEqual({
        url: 'https://soundcloud.com/image.jpg',
        source: 'soundcloud',
      });
    });

    it('should fallback to sc-artwork if og:image not available', async () => {
      const mockMetaOgImage = {
        attr: jest.fn(() => null),
      };
      const mockScArtwork = {
        attr: jest.fn(() => 'https://soundcloud.com/artwork.jpg'),
      };
      const mockCheerio = jest.fn((selector: string) => {
        if (selector === 'meta[property="og:image"]') {
          return mockMetaOgImage;
        }
        if (selector === 'img.sc-artwork') {
          return mockScArtwork;
        }
        return { attr: jest.fn(() => null), length: 0 };
      });
      mockCheerioLoad.mockReturnValue(mockCheerio as any);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () =>
          '<html><img class="sc-artwork" src="https://soundcloud.com/artwork.jpg"></html>',
      } as Response);

      const result = await fetchThumbnailFromPlatforms({
        soundcloud: 'https://soundcloud.com/track',
      });

      expect(result).toEqual({
        url: 'https://soundcloud.com/artwork.jpg',
        source: 'soundcloud',
      });
    });

    it('should return null if SoundCloud fetch fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
      } as Response);

      const result = await fetchThumbnailFromPlatforms({
        soundcloud: 'https://soundcloud.com/track',
      });

      expect(result).toBeNull();
    });
  });

  describe('YouTube', () => {
    it('should fetch thumbnail from YouTube using maxresdefault', async () => {
      mockExtractPlatformId.mockReturnValue('video123');
      mockFetch.mockResolvedValueOnce({
        ok: true,
      } as Response);

      const result = await fetchThumbnailFromPlatforms({
        youtube: 'https://youtube.com/watch?v=video123',
      });

      expect(result).toEqual({
        url: 'https://img.youtube.com/vi/video123/maxresdefault.jpg',
        source: 'youtube',
      });
    });

    it('should fallback to hqdefault if maxresdefault not available', async () => {
      mockExtractPlatformId.mockReturnValue('video456');
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
        } as Response);

      const result = await fetchThumbnailFromPlatforms({
        youtube: 'https://youtube.com/watch?v=video456',
      });

      expect(result).toEqual({
        url: 'https://img.youtube.com/vi/video456/hqdefault.jpg',
        source: 'youtube',
      });
    });

    it('should return null if YouTube video ID cannot be extracted', async () => {
      mockExtractPlatformId.mockReturnValue(null);

      const result = await fetchThumbnailFromPlatforms({
        youtube: 'https://invalid-youtube-url.com',
      });

      expect(result).toBeNull();
    });

    it('should return null if both YouTube thumbnails fail', async () => {
      mockExtractPlatformId.mockReturnValue('video789');
      // First call for maxresdefault fails
      mockFetch.mockResolvedValueOnce({
        ok: false,
      } as Response);
      // Second call for hqdefault also fails
      mockFetch.mockResolvedValueOnce({
        ok: false,
      } as Response);

      const result = await fetchThumbnailFromPlatforms({
        youtube: 'https://youtube.com/watch?v=video789',
      });

      expect(result).toBeNull();
    });
  });

  describe('Priority order', () => {
    it('should prioritize Spotify over SoundCloud and YouTube', async () => {
      mockGetSpotifyToken.mockResolvedValue('test-token');
      // Only mock the Spotify API call, not YouTube
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          images: [{ url: 'https://spotify.com/image.jpg', height: 640, width: 640 }],
        }),
      } as Response);

      const result = await fetchThumbnailFromPlatforms({
        spotify: 'https://open.spotify.com/album/123',
        soundcloud: 'https://soundcloud.com/track',
        youtube: 'https://youtube.com/watch?v=123',
      });

      expect(result?.source).toBe('spotify');
      // Should only call Spotify API, not SoundCloud or YouTube
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should use SoundCloud if Spotify fails', async () => {
      mockGetSpotifyToken.mockResolvedValue('test-token');
      const mockMeta = {
        attr: jest.fn(() => 'https://soundcloud.com/image.jpg'),
      };
      const mockCheerio = jest.fn((selector: string) => {
        if (selector === 'meta[property="og:image"]') {
          return mockMeta;
        }
        return { attr: jest.fn(() => null), length: 0 };
      });
      mockCheerioLoad.mockReturnValue(mockCheerio as any);
      // First call: Spotify API fails
      mockFetch.mockResolvedValueOnce({
        ok: false,
      } as Response);
      // Second call: SoundCloud fetch succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () =>
          '<html><meta property="og:image" content="https://soundcloud.com/image.jpg"></html>',
      } as Response);

      const result = await fetchThumbnailFromPlatforms({
        spotify: 'https://open.spotify.com/album/123',
        soundcloud: 'https://soundcloud.com/track',
      });

      expect(result?.source).toBe('soundcloud');
    });

    it('should use YouTube if Spotify and SoundCloud fail', async () => {
      mockGetSpotifyToken.mockResolvedValue('test-token');
      mockExtractPlatformId.mockReturnValue('video123');
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
        } as Response)
        .mockResolvedValueOnce({
          ok: false,
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
        } as Response);

      const result = await fetchThumbnailFromPlatforms({
        spotify: 'https://open.spotify.com/album/123',
        soundcloud: 'https://soundcloud.com/track',
        youtube: 'https://youtube.com/watch?v=video123',
      });

      expect(result?.source).toBe('youtube');
    });

    it('should return null if all platforms fail', async () => {
      mockGetSpotifyToken.mockResolvedValue('test-token');
      mockFetch.mockResolvedValue({
        ok: false,
      } as Response);

      const result = await fetchThumbnailFromPlatforms({
        spotify: 'https://open.spotify.com/album/123',
        soundcloud: 'https://soundcloud.com/track',
        youtube: 'https://youtube.com/watch?v=123',
      });

      expect(result).toBeNull();
    });
  });
});
