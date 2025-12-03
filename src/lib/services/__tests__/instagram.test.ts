/**
 * Tests for instagram service
 */
import { getInstagramPosts, getCarouselChildren } from '../instagram';

// Mock dependencies
jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
  },
}));

// Mock fetch
global.fetch = jest.fn();

describe('instagram', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.INSTAGRAM_ACCESS_TOKEN;
    delete process.env.INSTAGRAM_USER_ID;
  });

  describe('getInstagramPosts', () => {
    it('should return empty array if credentials not configured', async () => {
      const result = await getInstagramPosts();

      expect(result).toEqual([]);
    });

    it('should fetch posts when credentials are configured', async () => {
      process.env.INSTAGRAM_ACCESS_TOKEN = 'test-token';
      process.env.INSTAGRAM_USER_ID = 'test-user-id';

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          data: [
            {
              id: 'post-1',
              media_type: 'IMAGE',
              media_url: 'https://instagram.com/image.jpg',
              caption: 'Test caption',
              timestamp: '2024-01-01T00:00:00Z',
              permalink: 'https://instagram.com/p/123',
            },
          ],
        }),
      });

      const result = await getInstagramPosts();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('post-1');
    });

    it('should return empty array on API error', async () => {
      process.env.INSTAGRAM_ACCESS_TOKEN = 'test-token';
      process.env.INSTAGRAM_USER_ID = 'test-user-id';

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 400,
        text: async () => 'Bad Request',
      });

      const result = await getInstagramPosts();

      expect(result).toEqual([]);
    });

    it('should handle empty data response', async () => {
      process.env.INSTAGRAM_ACCESS_TOKEN = 'test-token';
      process.env.INSTAGRAM_USER_ID = 'test-user-id';

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          data: [],
        }),
      });

      const result = await getInstagramPosts();

      expect(result).toEqual([]);
    });
  });

  describe('getCarouselChildren', () => {
    it('should return null if access token not configured', async () => {
      const result = await getCarouselChildren('media-1');

      expect(result).toBeNull();
    });

    it('should fetch carousel children', async () => {
      process.env.INSTAGRAM_ACCESS_TOKEN = 'test-token';

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          data: [
            {
              id: 'child-1',
              media_url: 'https://instagram.com/image.jpg',
            },
          ],
        }),
      });

      const result = await getCarouselChildren('media-1');

      expect(result).toBe('https://instagram.com/image.jpg');
    });

    it('should return null on error', async () => {
      process.env.INSTAGRAM_ACCESS_TOKEN = 'test-token';

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
      });

      const result = await getCarouselChildren('media-1');

      expect(result).toBeNull();
    });
  });
});
