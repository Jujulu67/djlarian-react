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
  });
});
