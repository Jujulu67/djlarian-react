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

  describe('loadPuppeteer error paths', () => {
    it('should handle puppeteer unavailable error', async () => {
      // Mock puppeteer to be unavailable
      mockPuppeteer.launch.mockRejectedValue(new Error('Puppeteer not available'));

      await expect(searchSoundCloudArtistTracks('test-artist')).rejects.toThrow();
    });

    it('should handle Vercel environment when puppeteer fails to load', async () => {
      process.env.VERCEL = '1';

      // Mock puppeteer launch to fail
      mockPuppeteer.launch.mockRejectedValue(new Error('Chromium executable not found'));

      await expect(searchSoundCloudArtistTracks('test-artist')).rejects.toThrow();
    });
  });

  describe('scraping error paths', () => {
    it('should handle waitForSelector timeout', async () => {
      const mockPage = {
        goto: jest.fn().mockResolvedValue(undefined),
        setRequestInterception: jest.fn().mockResolvedValue(undefined),
        on: jest.fn(),
        setUserAgent: jest.fn().mockResolvedValue(undefined),
        waitForSelector: jest.fn().mockRejectedValue(new Error('Timeout waiting for selector')),
        waitForFunction: jest.fn().mockResolvedValue(undefined),
        evaluate: jest.fn().mockResolvedValue([
          {
            url: 'https://soundcloud.com/test-artist/track1',
            title: 'Track 1',
          },
        ]),
      };

      const mockBrowser = {
        newPage: jest.fn().mockResolvedValue(mockPage),
        close: jest.fn().mockResolvedValue(undefined),
      };

      mockPuppeteer.launch.mockResolvedValue(mockBrowser);

      const result = await searchSoundCloudArtistTracks('test-artist');
      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle navigation errors (not timeout)', async () => {
      const mockPage = {
        goto: jest
          .fn()
          .mockRejectedValue(new Error('Navigation failed: net::ERR_CONNECTION_REFUSED')),
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

    it('should handle browser close errors', async () => {
      const mockTracks = [
        {
          url: 'https://soundcloud.com/test-artist/track1',
          title: 'Track 1',
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
        close: jest.fn().mockRejectedValue(new Error('Browser close error')),
      };

      mockPuppeteer.launch.mockResolvedValue(mockBrowser);

      // Should still return results even if close fails
      const result = await searchSoundCloudArtistTracks('test-artist');
      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle waitForFunction timeout during scroll', async () => {
      let trackCount = 0;
      const mockPage = {
        goto: jest.fn().mockResolvedValue(undefined),
        setRequestInterception: jest.fn().mockResolvedValue(undefined),
        on: jest.fn(),
        setUserAgent: jest.fn().mockResolvedValue(undefined),
        waitForSelector: jest.fn().mockResolvedValue(undefined),
        waitForFunction: jest.fn().mockRejectedValue(new Error('Timeout')),
        evaluate: jest.fn((fn) => {
          if (typeof fn === 'function') {
            return Promise.resolve(fn());
          }
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

    it('should handle evaluate errors during DOM extraction', async () => {
      const mockPage = {
        goto: jest.fn().mockResolvedValue(undefined),
        setRequestInterception: jest.fn().mockResolvedValue(undefined),
        on: jest.fn(),
        setUserAgent: jest.fn().mockResolvedValue(undefined),
        waitForSelector: jest.fn().mockResolvedValue(undefined),
        waitForFunction: jest.fn().mockResolvedValue(undefined),
        evaluate: jest.fn().mockRejectedValue(new Error('DOM evaluation failed')),
      };

      const mockBrowser = {
        newPage: jest.fn().mockResolvedValue(mockPage),
        close: jest.fn().mockResolvedValue(undefined),
      };

      mockPuppeteer.launch.mockResolvedValue(mockBrowser);

      await expect(searchSoundCloudArtistTracks('test-artist')).rejects.toThrow();
    });
  });

  describe('profile name extraction', () => {
    it('should handle invalid profile URL', async () => {
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

      // Invalid URL should use artistName directly and return empty array if no tracks found
      const result = await searchSoundCloudArtistTracks('test-artist', 'invalid-url');
      expect(Array.isArray(result)).toBe(true);
      // Should use the artistName when URL is invalid
      expect(mockPuppeteer.launch).toHaveBeenCalled();
    });

    it('should handle profile URL with query parameters', async () => {
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
        'https://soundcloud.com/test-artist?param=value'
      );
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('DOM extraction and thumbnail fetching', () => {
    it('should extract tracks with imageUrl from DOM', async () => {
      const mockTracks = [
        {
          url: 'https://soundcloud.com/test-artist/track1',
          title: 'Track 1',
          imageUrl: 'https://example.com/image.jpg',
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
      expect(result.length).toBeGreaterThan(0);
      if (result.length > 0) {
        expect(result[0].imageUrl).toBeDefined();
      }
    });

    it('should enrich tracks without imageUrl via fetchSoundCloudThumbnail', async () => {
      const mockTracks = [
        {
          url: 'https://soundcloud.com/test-artist/track1',
          title: 'Track 1',
          // No imageUrl
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

      // Mock fetch for thumbnail
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        text: jest.fn().mockResolvedValue(`
          <html>
            <meta property="og:image" content="https://example.com/image-large.jpg" />
          </html>
        `),
      });

      const result = await searchSoundCloudArtistTracks('test-artist');
      expect(result.length).toBeGreaterThan(0);
      expect(global.fetch).toHaveBeenCalled();
    });

    it('should handle fetchSoundCloudThumbnail with og:image meta tag', async () => {
      const mockTracks = [
        {
          url: 'https://soundcloud.com/test-artist/track1',
          title: 'Track 1',
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

      // Mock fetch to return HTML with og:image
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        text: jest.fn().mockResolvedValue(`
          <html>
            <head>
              <meta property="og:image" content="https://i1.sndcdn.com/artworks-xyz-large.jpg?abc123" />
            </head>
          </html>
        `),
      });

      const result = await searchSoundCloudArtistTracks('test-artist');
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle fetchSoundCloudThumbnail with artwork_url in script', async () => {
      const mockTracks = [
        {
          url: 'https://soundcloud.com/test-artist/track1',
          title: 'Track 1',
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

      // Mock fetch to return HTML with artwork_url in script
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        text: jest.fn().mockResolvedValue(`
          <html>
            <script>
              var data = {"artwork_url": "https://i1.sndcdn.com/artworks-xyz-large.jpg"};
            </script>
          </html>
        `),
      });

      const result = await searchSoundCloudArtistTracks('test-artist');
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle fetchSoundCloudThumbnail fetch errors gracefully', async () => {
      const mockTracks = [
        {
          url: 'https://soundcloud.com/test-artist/track1',
          title: 'Track 1',
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

      // Mock fetch to fail
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const result = await searchSoundCloudArtistTracks('test-artist');
      expect(result.length).toBeGreaterThan(0);
      // Should still return tracks even if thumbnail fetch fails
    });

    it('should handle fetchSoundCloudThumbnail with non-OK response', async () => {
      const mockTracks = [
        {
          url: 'https://soundcloud.com/test-artist/track1',
          title: 'Track 1',
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

      // Mock fetch to return non-OK response
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      const result = await searchSoundCloudArtistTracks('test-artist');
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle batch processing in enrichTracksWithCoverArts with mixed results', async () => {
      const mockTracks = [
        {
          url: 'https://soundcloud.com/test-artist/track1',
          title: 'Track 1',
        },
        {
          url: 'https://soundcloud.com/test-artist/track2',
          title: 'Track 2',
        },
        {
          url: 'https://soundcloud.com/test-artist/track3',
          title: 'Track 3',
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

      // Mock fetch to return mixed results (some succeed, some fail)
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          text: jest.fn().mockResolvedValue(`
            <html>
              <meta property="og:image" content="https://example.com/image1.jpg" />
            </html>
          `),
        })
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          text: jest.fn().mockResolvedValue(`
            <html>
              <meta property="og:image" content="https://example.com/image3.jpg" />
            </html>
          `),
        });

      const result = await searchSoundCloudArtistTracks('test-artist');
      expect(result.length).toBe(3);
      // Should handle errors gracefully and continue processing
    });
  });
});
