// Mock logger
jest.mock('@/lib/logger', () => ({
  logger: {
    warn: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock fetch
global.fetch = jest.fn();

// Mock environment variables
const originalEnv = process.env;

describe('analytics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset module cache to clear token cache
    jest.resetModules();
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_UMAMI_URL: 'https://test.umami.is',
      NEXT_PUBLIC_UMAMI_WEBSITE_ID: 'test-website-id',
      NEXT_PUBLIC_UMAMI_USERNAME: 'test-user',
      NEXT_PUBLIC_UMAMI_PASSWORD: 'test-pass',
    };
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.resetModules();
  });

  describe('getUmamiToken', () => {
    it('should return empty string if credentials are not configured', async () => {
      process.env.NEXT_PUBLIC_UMAMI_USERNAME = '';
      process.env.NEXT_PUBLIC_UMAMI_PASSWORD = '';

      const { getUmamiToken: getToken } = await import('../analytics');
      const token = await getToken();
      expect(token).toBe('');
    });

    it('should fetch and cache token', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ token: 'test-token-123' }),
      });

      const { getUmamiToken: getToken } = await import('../analytics');
      const token = await getToken();
      expect(token).toBe('test-token-123');
      expect(global.fetch).toHaveBeenCalledWith(
        'https://test.umami.is/api/auth/login',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });

    it('should use cached token if still valid', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ token: 'cached-token', expires_in: 3600 }),
      });

      const { getUmamiToken: getToken } = await import('../analytics');
      await getToken();
      jest.clearAllMocks();

      const token2 = await getToken();
      expect(token2).toBe('cached-token');
      // Should use cache, so fetch should not be called again
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should handle authentication errors', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        text: async () => 'Invalid credentials',
      });

      const { getUmamiToken: getToken } = await import('../analytics');
      const token = await getToken();
      expect(token).toBe('');
    });

    it('should handle network errors', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const { getUmamiToken: getToken } = await import('../analytics');
      const token = await getToken();
      expect(token).toBe('');
    });
  });

  describe('getUmamiStats', () => {
    it('should return null if website ID is not configured', async () => {
      process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID = '';

      const { getUmamiStats: getStats } = await import('../analytics');
      const stats = await getStats();
      expect(stats).toBeNull();
    });

    it('should fetch and return stats', async () => {
      const mockStats = {
        metrics: {
          pageviews: { value: 1000, change: 10 },
          uniques: { value: 500, change: 5 },
          bounces: { value: 200, change: -5 },
          totalTime: { value: 3600, change: 20 },
        },
        pageviews: [{ x: '2024-01-01', y: 100 }],
        pages: [{ x: '/home', y: 50 }],
        referrers: [{ x: 'google', y: 30 }],
        browsers: [{ x: 'Chrome', y: 60 }],
        os: [{ x: 'Windows', y: 40 }],
        devices: [{ x: 'Desktop', y: 70 }],
        countries: [{ x: 'US', y: 80 }],
      };

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ token: 'test-token' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockStats,
        });

      const { getUmamiStats: getStats } = await import('../analytics');
      const stats = await getStats();
      expect(stats).toEqual(mockStats);
    });

    it('should handle missing metrics and reconstruct them', async () => {
      const mockData = {
        pageviews: { value: 100, change: 5 },
        pageviews: [{ x: '2024-01-01', y: 50 }],
      };

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ token: 'test-token' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockData,
        });

      const { getUmamiStats: getStats } = await import('../analytics');
      const stats = await getStats();
      expect(stats).not.toBeNull();
      expect(stats?.metrics.pageviews.value).toBeGreaterThanOrEqual(0);
    });

    it('should handle API errors', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ token: 'test-token' }),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
        });

      const { getUmamiStats: getStats } = await import('../analytics');
      const stats = await getStats();
      expect(stats).toBeNull();
    });
  });

  describe('getTopPages', () => {
    it('should return empty array if website ID is not configured', async () => {
      process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID = '';

      const { getTopPages: getPages } = await import('../analytics');
      const pages = await getPages();
      expect(pages).toEqual([]);
    });

    it('should fetch and return top pages', async () => {
      const mockPages = [
        { x: '/home', y: 100 },
        { x: '/about', y: 50 },
      ];

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ token: 'test-token' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockPages,
        });

      const { getTopPages: getPages } = await import('../analytics');
      const pages = await getPages();
      expect(pages).toEqual(mockPages);
    });

    it('should handle empty data', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ token: 'test-token' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [],
        });

      const { getTopPages: getPages } = await import('../analytics');
      const pages = await getPages();
      expect(pages).toEqual([]);
    });
  });

  describe('getTrafficSources', () => {
    it('should return empty array if website ID is not configured', async () => {
      process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID = '';

      const { getTrafficSources: getSources } = await import('../analytics');
      const sources = await getSources();
      expect(sources).toEqual([]);
    });

    it('should fetch and format traffic sources', async () => {
      const mockReferrers = [
        { x: 'google.com', y: 100 },
        { x: '(direct)', y: 50 },
        { x: 'facebook.com', y: 30 },
      ];

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ token: 'test-token' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockReferrers,
        });

      const { getTrafficSources: getSources } = await import('../analytics');
      const sources = await getSources();
      expect(sources).toHaveLength(3);
      expect(sources[0].source).toBe('Google');
      expect(sources[1].source).toBe('Accès direct');
      expect(sources[2].source).toBe('Réseaux sociaux');
    });

    it('should calculate percentages correctly', async () => {
      const mockReferrers = [
        { x: 'google.com', y: 100 },
        { x: '(direct)', y: 50 },
      ];

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ token: 'test-token' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockReferrers,
        });

      const { getTrafficSources: getSources } = await import('../analytics');
      const sources = await getSources();
      expect(sources.length).toBeGreaterThan(0);
      if (sources.length > 0) {
        const total = 150;
        expect(sources[0].percentage).toBe(Math.round((100 / total) * 100));
        if (sources.length > 1) {
          expect(sources[1].percentage).toBe(Math.round((50 / total) * 100));
        }
      }
    });
  });

  describe('getStatistics', () => {
    it('should return null if website ID is not configured', async () => {
      process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID = '';

      const { getStatistics: getStats } = await import('../analytics');
      const stats = await getStats('daily');
      expect(stats.umami).toBeNull();
    });

    it('should fetch statistics for daily period', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ token: 'test-token' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            metrics: {
              pageviews: { value: 100, change: 10 },
              uniques: { value: 50, change: 5 },
              bounces: { value: 20, change: -5 },
              totalTime: { value: 3600, change: 20 },
            },
            pageviews: [{ x: '2024-01-01', y: 10 }],
            pages: [{ x: '/home', y: 5 }],
            referrers: [{ x: 'google', y: 3 }],
          }),
        });

      const { getStatistics: getStats } = await import('../analytics');
      const stats = await getStats('daily');
      expect(stats.umami).not.toBeNull();
      expect(stats.umami?.metrics).toBeDefined();
      expect(stats.umami?.pageviews).toBeDefined();
    });

    it('should handle weekly period', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ token: 'test-token' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            metrics: {
              pageviews: { value: 100, change: 10 },
              uniques: { value: 50, change: 5 },
              bounces: { value: 20, change: -5 },
              totalTime: { value: 3600, change: 20 },
            },
            pageviews: [],
            pages: [],
            referrers: [],
          }),
        });

      const { getStatistics: getStats } = await import('../analytics');
      const stats = await getStats('weekly');
      expect(stats.umami).not.toBeNull();
    });

    it('should handle monthly period', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ token: 'test-token' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            metrics: {
              pageviews: { value: 100, change: 10 },
              uniques: { value: 50, change: 5 },
              bounces: { value: 20, change: -5 },
              totalTime: { value: 3600, change: 20 },
            },
            pageviews: [],
            pages: [],
            referrers: [],
          }),
        });

      const { getStatistics: getStats } = await import('../analytics');
      const stats = await getStats('monthly');
      expect(stats.umami).not.toBeNull();
    });

    it('should handle missing token', async () => {
      process.env.NEXT_PUBLIC_UMAMI_USERNAME = '';
      process.env.NEXT_PUBLIC_UMAMI_PASSWORD = '';

      const { getStatistics: getStats } = await import('../analytics');
      const stats = await getStats('daily');
      expect(stats.umami).toBeNull();
    });

    it('should handle getUmamiStats with custom dates', async () => {
      const startAt = Date.now() - 7 * 24 * 60 * 60 * 1000;
      const endAt = Date.now();

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ token: 'test-token' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            metrics: {
              pageviews: { value: 100, change: 10 },
              uniques: { value: 50, change: 5 },
              bounces: { value: 20, change: -5 },
              totalTime: { value: 3600, change: 20 },
            },
            pageviews: [{ x: '2024-01-01', y: 10 }],
            pages: [{ x: '/home', y: 5 }],
            referrers: [{ x: 'google', y: 3 }],
            browsers: [],
            os: [],
            devices: [],
            countries: [],
          }),
        });

      const { getUmamiStats: getStats } = await import('../analytics');
      const stats = await getStats(startAt, endAt, 'day');
      expect(stats).not.toBeNull();
      expect(stats?.metrics.pageviews.value).toBe(100);
    });

    it('should handle getUmamiStats with month unit', async () => {
      const startAt = Date.now() - 30 * 24 * 60 * 60 * 1000;
      const endAt = Date.now();

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ token: 'test-token' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            metrics: {
              pageviews: { value: 100, change: 10 },
              uniques: { value: 50, change: 5 },
              bounces: { value: 20, change: -5 },
              totalTime: { value: 3600, change: 20 },
            },
            pageviews: [{ x: '2024-01-01', y: 10 }],
            pages: [],
            referrers: [],
            browsers: [],
            os: [],
            devices: [],
            countries: [],
          }),
        });

      const { getUmamiStats: getStats } = await import('../analytics');
      const stats = await getStats(startAt, endAt, 'month');
      expect(stats).not.toBeNull();
    });

    it('should handle getUmamiStats with year unit', async () => {
      const startAt = Date.now() - 365 * 24 * 60 * 60 * 1000;
      const endAt = Date.now();

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ token: 'test-token' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            metrics: {
              pageviews: { value: 100, change: 10 },
              uniques: { value: 50, change: 5 },
              bounces: { value: 20, change: -5 },
              totalTime: { value: 3600, change: 20 },
            },
            pageviews: [],
            pages: [],
            referrers: [],
            browsers: [],
            os: [],
            devices: [],
            countries: [],
          }),
        });

      const { getUmamiStats: getStats } = await import('../analytics');
      const stats = await getStats(startAt, endAt, 'year');
      expect(stats).not.toBeNull();
    });

    it('should handle getUmamiStats with missing metrics', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ token: 'test-token' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            pageviews: [
              { x: '2024-01-01', y: 10 },
              { x: '2024-01-02', y: 20 },
            ],
            pages: [],
            referrers: [],
            browsers: [],
            os: [],
            devices: [],
            countries: [],
          }),
        });

      const { getUmamiStats: getStats } = await import('../analytics');
      const stats = await getStats();
      expect(stats).not.toBeNull();
      expect(stats?.metrics.pageviews.value).toBe(30); // Sum of pageviews
    });

    it('should handle getTrafficSources with social media', async () => {
      const mockReferrers = [
        { x: 'facebook.com', y: 50 },
        { x: 'twitter.com', y: 30 },
        { x: 'instagram.com', y: 20 },
      ];

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ token: 'test-token' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockReferrers,
        });

      const { getTrafficSources: getSources } = await import('../analytics');
      const sources = await getSources();
      expect(sources.length).toBe(3);
      expect(sources.every((s) => s.source === 'Réseaux sociaux')).toBe(true);
    });

    it('should handle getTrafficSources with empty data', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ token: 'test-token' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [],
        });

      const { getTrafficSources: getSources } = await import('../analytics');
      const sources = await getSources();
      expect(sources).toEqual([]);
    });

    it('should handle getTrafficSources with zero total', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ token: 'test-token' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [{ x: 'test', y: 0 }],
        });

      const { getTrafficSources: getSources } = await import('../analytics');
      const sources = await getSources();
      expect(sources).toEqual([]);
    });
  });
});
