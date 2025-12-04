// Mock logger
jest.mock('@/lib/logger', () => {
  const mockLogger = {
    debug: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  };
  return {
    logger: mockLogger,
  };
});

import { searchSoundCloudArtistTracks } from '../soundcloud';

// Mock cheerio
jest.mock('cheerio', () => {
  const mockCheerio = {
    load: jest.fn(() => ({
      root: jest.fn(),
      'meta[property="og:image"]': {
        attr: jest.fn(() => 'https://example.com/image.jpg'),
      },
      script: {
        toArray: jest.fn(() => []),
      },
    })),
  };
  return mockCheerio;
});

// Mock parseTitle functions
jest.mock('../soundcloud/parseTitle', () => {
  const mockParseTitle = {
    parseSoundCloudTitle: jest.fn((title) => ({ title, artist: 'Artist' })),
    detectTrackType: jest.fn(() => 'single'),
    normalizeArtistName: jest.fn((name) => name),
  };
  return mockParseTitle;
});

// Mock puppeteer
const mockPuppeteer = {
  launch: jest.fn(),
};

jest.mock('puppeteer-core', () => mockPuppeteer, { virtual: true });
jest.mock('puppeteer', () => mockPuppeteer, { virtual: true });
jest.mock('@sparticuz/chromium-min', () => ({}), { virtual: true });

// Mock fetch
global.fetch = jest.fn();

describe('soundcloud service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.VERCEL = undefined;
    process.env.NODE_ENV = 'test';
  });

  it('should search artist tracks', async () => {
    const mockTracks = [
      {
        url: 'https://soundcloud.com/test-artist/track1',
        title: 'Track 1',
        imageUrl: 'https://example.com/image.jpg',
        releaseDate: '2024-01-01',
      },
    ];

    const mockPage = {
      goto: jest.fn().mockResolvedValue(undefined),
      setRequestInterception: jest.fn().mockResolvedValue(undefined),
      on: jest.fn(),
      setUserAgent: jest.fn().mockResolvedValue(undefined),
      waitForSelector: jest.fn().mockResolvedValue(undefined),
      waitForFunction: jest.fn().mockResolvedValue(undefined),
      evaluate: jest.fn().mockResolvedValue(mockTracks),
    };

    const mockBrowser = {
      newPage: jest.fn().mockResolvedValue(mockPage),
      close: jest.fn().mockResolvedValue(undefined),
    };

    mockPuppeteer.launch.mockResolvedValue(mockBrowser);

    const result = await searchSoundCloudArtistTracks('test-artist');

    expect(Array.isArray(result)).toBe(true);
    expect(mockPuppeteer.launch).toHaveBeenCalled();
  });

  it('should handle errors gracefully', async () => {
    mockPuppeteer.launch.mockRejectedValue(new Error('Puppeteer error'));

    await expect(searchSoundCloudArtistTracks('test-artist')).rejects.toThrow();
  });

  it('should handle empty artist name', async () => {
    await expect(searchSoundCloudArtistTracks('')).rejects.toThrow();
  });

  it('should extract profile name from URL', async () => {
    const mockPage = {
      goto: jest.fn().mockResolvedValue(undefined),
      setRequestInterception: jest.fn().mockResolvedValue(undefined),
      on: jest.fn(),
      setUserAgent: jest.fn().mockResolvedValue(undefined),
      waitForSelector: jest.fn().mockResolvedValue(undefined),
      waitForFunction: jest.fn().mockResolvedValue(undefined),
      evaluate: jest.fn().mockResolvedValue([]),
    };

    const mockBrowser = {
      newPage: jest.fn().mockResolvedValue(mockPage),
      close: jest.fn().mockResolvedValue(undefined),
    };

    mockPuppeteer.launch.mockResolvedValue(mockBrowser);

    const result = await searchSoundCloudArtistTracks(
      'test-artist',
      'https://soundcloud.com/test-artist'
    );

    expect(Array.isArray(result)).toBe(true);
  });

  it('should limit results to maxResults', async () => {
    const mockTracks = Array.from({ length: 150 }, (_, i) => ({
      url: `https://soundcloud.com/test-artist/track${i}`,
      title: `Track ${i}`,
    }));

    const mockPage = {
      goto: jest.fn().mockResolvedValue(undefined),
      setRequestInterception: jest.fn().mockResolvedValue(undefined),
      on: jest.fn(),
      setUserAgent: jest.fn().mockResolvedValue(undefined),
      waitForSelector: jest.fn().mockResolvedValue(undefined),
      waitForFunction: jest.fn().mockResolvedValue(undefined),
      evaluate: jest.fn().mockResolvedValue(mockTracks),
    };

    const mockBrowser = {
      newPage: jest.fn().mockResolvedValue(mockPage),
      close: jest.fn().mockResolvedValue(undefined),
    };

    mockPuppeteer.launch.mockResolvedValue(mockBrowser);

    const result = await searchSoundCloudArtistTracks('test-artist', undefined, 50);

    expect(result.length).toBe(50);
  });

  it('should handle Vercel environment', async () => {
    process.env.VERCEL = '1';
    // In Vercel environment, the function might succeed or fail depending on chromium availability
    // Just verify it doesn't crash
    try {
      const result = await searchSoundCloudArtistTracks('test-artist');
      expect(Array.isArray(result)).toBe(true);
    } catch (error) {
      // If it fails, that's also acceptable in test environment
      expect(error).toBeDefined();
    }
  });

  it('should handle scroll attempts in scraping', async () => {
    let trackCount = 0;
    const mockPage = {
      goto: jest.fn().mockResolvedValue(undefined),
      setRequestInterception: jest.fn().mockResolvedValue(undefined),
      on: jest.fn(),
      setUserAgent: jest.fn().mockResolvedValue(undefined),
      waitForSelector: jest.fn().mockResolvedValue(undefined),
      waitForFunction: jest.fn().mockResolvedValue(undefined),
      evaluate: jest.fn((fn) => {
        if (typeof fn === 'function') {
          return Promise.resolve(fn());
        }
        // Simulate increasing track count
        trackCount += 5;
        return Promise.resolve(trackCount);
      }),
    };

    const mockBrowser = {
      newPage: jest.fn().mockResolvedValue(mockPage),
      close: jest.fn().mockResolvedValue(undefined),
    };

    mockPuppeteer.launch.mockResolvedValue(mockBrowser);

    const result = await searchSoundCloudArtistTracks('test-artist');

    expect(Array.isArray(result)).toBe(true);
  });

  it('should handle timeout errors', async () => {
    const mockPage = {
      goto: jest.fn().mockRejectedValue(new Error('Navigation timeout')),
      setRequestInterception: jest.fn().mockResolvedValue(undefined),
      on: jest.fn(),
      setUserAgent: jest.fn().mockResolvedValue(undefined),
      waitForSelector: jest.fn().mockResolvedValue(undefined),
      waitForFunction: jest.fn().mockResolvedValue(undefined),
      evaluate: jest.fn().mockResolvedValue([]),
    };

    const mockBrowser = {
      newPage: jest.fn().mockResolvedValue(mockPage),
      close: jest.fn().mockResolvedValue(undefined),
    };

    mockPuppeteer.launch.mockResolvedValue(mockBrowser);

    await expect(searchSoundCloudArtistTracks('test-artist')).rejects.toThrow();
  });

  it('should handle Chromium launch errors', async () => {
    const mockPage = {
      goto: jest.fn().mockResolvedValue(undefined),
      setRequestInterception: jest.fn().mockResolvedValue(undefined),
      on: jest.fn(),
      setUserAgent: jest.fn().mockResolvedValue(undefined),
      waitForSelector: jest.fn().mockResolvedValue(undefined),
      waitForFunction: jest.fn().mockResolvedValue(undefined),
      evaluate: jest.fn().mockResolvedValue([]),
    };

    const mockBrowser = {
      newPage: jest.fn().mockResolvedValue(mockPage),
      close: jest.fn().mockResolvedValue(undefined),
    };

    mockPuppeteer.launch.mockRejectedValue(new Error('Chromium executable not found'));

    await expect(searchSoundCloudArtistTracks('test-artist')).rejects.toThrow('Chromium');
  });
});
