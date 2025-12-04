/**
 * Tests for SoundCloud service
 * @jest-environment node
 */
import { searchSoundCloudArtistTracks } from '../soundcloud';

// Mock logger
jest.mock('@/lib/logger', () => ({
  logger: {
    debug: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
  },
}));

// Mock puppeteer
const mockPage = {
  setRequestInterception: jest.fn(),
  on: jest.fn(),
  setUserAgent: jest.fn(),
  goto: jest.fn(),
  waitForSelector: jest.fn(),
  evaluate: jest.fn(),
  waitForFunction: jest.fn(),
};

const mockBrowser = {
  newPage: jest.fn().mockResolvedValue(mockPage),
  close: jest.fn(),
};

jest.mock('puppeteer', () => ({
  launch: jest.fn().mockResolvedValue(mockBrowser),
}));

describe('SoundCloud Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.VERCEL = undefined; // Ensure we are testing "local" mode by default
  });

  describe('searchSoundCloudArtistTracks', () => {
    it('should throw error if no artist name provided', async () => {
      await expect(searchSoundCloudArtistTracks('')).rejects.toThrow(
        "Recherche SoundCloud: nom d'artiste ou URL de profil requis"
      );
    });

    it('should extract artist name from profile URL', async () => {
      // Mock empty result to avoid complex scraping logic for this test
      mockPage.evaluate.mockResolvedValue([]);

      await searchSoundCloudArtistTracks('', 'https://soundcloud.com/larian');

      expect(mockPage.goto).toHaveBeenCalledWith(
        'https://soundcloud.com/larian/tracks',
        expect.any(Object)
      );
    });

    it('should return tracks when scraping is successful', async () => {
      const mockTracks = [
        {
          url: 'https://soundcloud.com/artist/track1',
          title: 'Track 1',
          imageUrl: 'http://image.url/1.jpg',
          releaseDate: '2023-01-01',
        },
      ];

      // Mock evaluate to return tracks
      mockPage.evaluate.mockImplementation((fn) => {
        // If it's the track extraction call (which takes an arg)
        if (typeof fn === 'function' && fn.length === 1) {
          return mockTracks;
        }
        // If it's the scroll height or track count check
        return 1;
      });

      const result = await searchSoundCloudArtistTracks('artist');

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Track 1');
      expect(result[0].url).toBe('https://soundcloud.com/artist/track1');
    });

    it('should handle empty results', async () => {
      mockPage.evaluate.mockResolvedValue([]);

      const result = await searchSoundCloudArtistTracks('artist');

      expect(result).toEqual([]);
    });

    it('should limit results to maxResults', async () => {
      const mockTracks = Array(5)
        .fill(null)
        .map((_, i) => ({
          url: `https://soundcloud.com/artist/track${i}`,
          title: `Track ${i}`,
        }));

      mockPage.evaluate.mockImplementation((fn) => {
        if (typeof fn === 'function' && fn.length === 1) {
          return mockTracks;
        }
        return 5;
      });

      const result = await searchSoundCloudArtistTracks('artist', undefined, 2);

      expect(result).toHaveLength(2);
    });
  });
});
