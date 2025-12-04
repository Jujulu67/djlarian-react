import { describe, it, expect, beforeEach, jest } from '@jest/globals';

import * as platformSearchService from '../platform-search';

// Mock fetch
global.fetch = jest.fn();

describe('Platform Search Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('searchYouTube', () => {
    it('should return YouTube result when API key is configured', async () => {
      process.env.YOUTUBE_API_KEY = 'test_api_key';

      const mockResponse = {
        items: [
          {
            id: { videoId: 'test123' },
            snippet: {
              title: 'Test Track',
              thumbnails: {
                high: { url: 'https://img.youtube.com/vi/test123/hqdefault.jpg' },
              },
            },
          },
        ],
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await platformSearchService.searchYouTube('Larian', 'Test Track');

      expect(result).toEqual({
        url: 'https://www.youtube.com/watch?v=test123',
        embedId: 'test123',
        title: 'Test Track',
        thumbnail: 'https://img.youtube.com/vi/test123/hqdefault.jpg',
      });
    });

    it('should return null when API key is not configured', async () => {
      delete process.env.YOUTUBE_API_KEY;

      const result = await platformSearchService.searchYouTube('Larian', 'Test Track');

      expect(result).toBeNull();
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should handle API error response', async () => {
      process.env.YOUTUBE_API_KEY = 'test_api_key';

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 403,
      });

      const result = await platformSearchService.searchYouTube('Larian', 'Test Track');

      expect(result).toBeNull();
    });

    it('should handle empty results', async () => {
      process.env.YOUTUBE_API_KEY = 'test_api_key';

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ items: [] }),
      });

      const result = await platformSearchService.searchYouTube('Larian', 'Test Track');

      expect(result).toBeNull();
    });

    it('should use default thumbnail when high is not available', async () => {
      process.env.YOUTUBE_API_KEY = 'test_api_key';

      const mockResponse = {
        items: [
          {
            id: { videoId: 'test123' },
            snippet: {
              title: 'Test Track',
              thumbnails: {
                default: { url: 'https://img.youtube.com/vi/test123/default.jpg' },
              },
            },
          },
        ],
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await platformSearchService.searchYouTube('Larian', 'Test Track');

      expect(result?.thumbnail).toBe('https://img.youtube.com/vi/test123/default.jpg');
    });

    it('should handle fetch error', async () => {
      process.env.YOUTUBE_API_KEY = 'test_api_key';

      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const result = await platformSearchService.searchYouTube('Larian', 'Test Track');

      expect(result).toBeNull();
    });
  });

  describe('searchAppleMusic', () => {
    it('should return Apple Music result', async () => {
      const mockResponse = {
        results: [
          {
            trackName: 'Test Track',
            artistName: 'Larian',
            trackViewUrl: 'https://music.apple.com/track/123',
          },
        ],
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await platformSearchService.searchAppleMusic('Larian', 'Test Track');

      expect(result).toEqual({
        url: 'https://music.apple.com/track/123',
        title: 'Test Track',
      });
    });

    it('should return null when no results found', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ results: [] }),
      });

      const result = await platformSearchService.searchAppleMusic('Unknown', 'Unknown');

      expect(result).toBeNull();
    });

    it('should handle fetch error', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const result = await platformSearchService.searchAppleMusic('Larian', 'Test Track');

      expect(result).toBeNull();
    });

    it('should handle non-ok response', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const result = await platformSearchService.searchAppleMusic('Larian', 'Test Track');

      expect(result).toBeNull();
    });
  });

  describe('searchDeezer', () => {
    it('should return Deezer result', async () => {
      const mockResponse = {
        data: [
          {
            id: 123456,
            title: 'Test Track',
            link: 'https://www.deezer.com/track/123456',
          },
        ],
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await platformSearchService.searchDeezer('Larian', 'Test Track');

      expect(result).toEqual({
        url: 'https://www.deezer.com/track/123456',
        embedId: '123456',
        title: 'Test Track',
      });
    });

    it('should return null when no results found', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [] }),
      });

      const result = await platformSearchService.searchDeezer('Unknown', 'Unknown');

      expect(result).toBeNull();
    });

    it('should handle fetch error', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const result = await platformSearchService.searchDeezer('Larian', 'Test Track');

      expect(result).toBeNull();
    });

    it('should handle non-ok response', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const result = await platformSearchService.searchDeezer('Larian', 'Test Track');

      expect(result).toBeNull();
    });
  });

  describe('searchTrackOnAllPlatforms', () => {
    it('should search on all platforms and return combined results', async () => {
      process.env.YOUTUBE_API_KEY = 'test_key';

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            items: [
              {
                id: { videoId: 'yt123' },
                snippet: { title: 'Test', thumbnails: { default: { url: 'thumb.jpg' } } },
              },
            ],
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            results: [{ trackName: 'Test', trackViewUrl: 'https://apple.com/track/1' }],
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: [{ id: 123, title: 'Test', link: 'https://deezer.com/track/123' }],
          }),
        });

      const results = await platformSearchService.searchTrackOnAllPlatforms('Larian', 'Test');

      expect(results.youtube).toBeDefined();
      expect(results.apple).toBeDefined();
      expect(results.deezer).toBeDefined();
    });

    it('should handle partial results when some platforms fail', async () => {
      process.env.YOUTUBE_API_KEY = 'test_key';

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            items: [
              {
                id: { videoId: 'yt123' },
                snippet: { title: 'Test', thumbnails: { default: { url: 'thumb.jpg' } } },
              },
            ],
          }),
        })
        .mockRejectedValueOnce(new Error('Apple error'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: [{ id: 123, title: 'Test', link: 'https://deezer.com/track/123' }],
          }),
        });

      const results = await platformSearchService.searchTrackOnAllPlatforms('Larian', 'Test');

      expect(results.youtube).toBeDefined();
      expect(results.apple).toBeUndefined();
      expect(results.deezer).toBeDefined();
    });

    it('should handle when YouTube API key is missing', async () => {
      delete process.env.YOUTUBE_API_KEY;

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            results: [{ trackName: 'Test', trackViewUrl: 'https://apple.com/track/1' }],
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: [{ id: 123, title: 'Test', link: 'https://deezer.com/track/123' }],
          }),
        });

      const results = await platformSearchService.searchTrackOnAllPlatforms('Larian', 'Test');

      expect(results.youtube).toBeUndefined();
      expect(results.apple).toBeDefined();
      expect(results.deezer).toBeDefined();
    });
  });

  describe('searchSoundCloud', () => {
    it('should return null when Google API keys are not configured', async () => {
      delete process.env.GOOGLE_SEARCH_API_KEY;
      delete process.env.GOOGLE_SEARCH_CX;

      const result = await platformSearchService.searchSoundCloud('Larian', 'Test Track');

      expect(result).toBeNull();
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should search SoundCloud when Google API keys are configured', async () => {
      process.env.GOOGLE_SEARCH_API_KEY = 'test_key';
      process.env.GOOGLE_SEARCH_CX = 'test_cx';

      const mockResponse = {
        items: [
          {
            link: 'https://soundcloud.com/larian/test-track',
            title: 'Test Track by Larian',
          },
        ],
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await platformSearchService.searchSoundCloud('Larian', 'Test Track');

      expect(result).toEqual({
        url: 'https://soundcloud.com/larian/test-track',
        embedId: 'larian/test-track',
        title: 'Test Track by Larian',
      });
    });

    it('should try multiple artists when artist string contains collaborators', async () => {
      process.env.GOOGLE_SEARCH_API_KEY = 'test_key';
      process.env.GOOGLE_SEARCH_CX = 'test_cx';

      const mockResponse = {
        items: [
          {
            link: 'https://soundcloud.com/larian/test-track',
            title: 'Test Track',
          },
        ],
      };

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: false,
          status: 403,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse,
        });

      const result = await platformSearchService.searchSoundCloud(
        'Artist1, Larian & Artist2',
        'Test Track'
      );

      expect(result).toBeDefined();
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('should return null when no results found', async () => {
      process.env.GOOGLE_SEARCH_API_KEY = 'test_key';
      process.env.GOOGLE_SEARCH_CX = 'test_cx';

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ items: [] }),
      });

      const result = await platformSearchService.searchSoundCloud('Unknown', 'Unknown');

      expect(result).toBeNull();
    });

    it('should handle fetch error', async () => {
      process.env.GOOGLE_SEARCH_API_KEY = 'test_key';
      process.env.GOOGLE_SEARCH_CX = 'test_cx';

      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const result = await platformSearchService.searchSoundCloud('Larian', 'Test Track');

      expect(result).toBeNull();
    });

    it('should try all artists together if individual searches fail', async () => {
      process.env.GOOGLE_SEARCH_API_KEY = 'test_key';
      process.env.GOOGLE_SEARCH_CX = 'test_cx';

      const mockResponse = {
        items: [
          {
            link: 'https://soundcloud.com/larian/test-track',
            title: 'Test Track',
          },
        ],
      };

      // First 2 calls fail (for individual artists), third succeeds (all artists together)
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: false, status: 403 })
        .mockResolvedValueOnce({ ok: false, status: 403 })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse,
        });

      const result = await platformSearchService.searchSoundCloud(
        'Artist1, Larian & Artist2',
        'Test Track'
      );

      expect(result).toBeDefined();
      expect(global.fetch).toHaveBeenCalledTimes(3);
    });

    it('should skip results that are not SoundCloud URLs', async () => {
      process.env.GOOGLE_SEARCH_API_KEY = 'test_key';
      process.env.GOOGLE_SEARCH_CX = 'test_cx';

      const mockResponse = {
        items: [
          {
            link: 'https://example.com/not-soundcloud',
            title: 'Test Track',
          },
        ],
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await platformSearchService.searchSoundCloud('Larian', 'Test Track');

      // Should continue searching or return null
      expect(result).toBeNull();
    });

    it('should handle URL without embedId match', async () => {
      process.env.GOOGLE_SEARCH_API_KEY = 'test_key';
      process.env.GOOGLE_SEARCH_CX = 'test_cx';

      const mockResponse = {
        items: [
          {
            link: 'https://soundcloud.com/invalid-url-format',
            title: 'Test Track',
          },
        ],
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await platformSearchService.searchSoundCloud('Larian', 'Test Track');

      expect(result).toBeDefined();
      expect(result?.url).toBe('https://soundcloud.com/invalid-url-format');
      expect(result?.embedId).toBeUndefined();
    });
  });

  describe('searchTrackOnAllPlatforms edge cases', () => {
    it('should handle all platforms returning null', async () => {
      delete process.env.YOUTUBE_API_KEY;
      delete process.env.GOOGLE_SEARCH_API_KEY;

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ results: [] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: [] }),
        });

      const results = await platformSearchService.searchTrackOnAllPlatforms('Unknown', 'Unknown');

      expect(results.youtube).toBeUndefined();
      expect(results.soundcloud).toBeUndefined();
      expect(results.apple).toBeUndefined();
      expect(results.deezer).toBeUndefined();
    });
  });
});
