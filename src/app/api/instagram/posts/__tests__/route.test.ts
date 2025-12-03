/**
 * Tests for /api/instagram/posts route
 * @jest-environment node
 */
import { GET } from '../route';

// Mock dependencies
jest.mock('@/lib/services/instagram', () => ({
  getInstagramPosts: jest.fn(),
}));

describe('/api/instagram/posts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.INSTAGRAM_ACCESS_TOKEN;
    delete process.env.INSTAGRAM_USER_ID;
  });

  it('should return posts when configured', async () => {
    const { getInstagramPosts } = await import('@/lib/services/instagram');
    process.env.INSTAGRAM_ACCESS_TOKEN = 'test-token';
    process.env.INSTAGRAM_USER_ID = 'test-user-id';

    (getInstagramPosts as jest.Mock).mockResolvedValue([
      {
        id: 'post-1',
        mediaUrl: 'https://instagram.com/image.jpg',
        timestamp: '2024-01-01T00:00:00Z',
        permalink: 'https://instagram.com/p/123',
        mediaType: 'IMAGE',
      },
    ]);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.posts).toBeDefined();
  });

  it('should return empty array when not configured', async () => {
    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.posts).toEqual([]);
    expect(data.error).toBe('Instagram credentials not configured');
  });
});
