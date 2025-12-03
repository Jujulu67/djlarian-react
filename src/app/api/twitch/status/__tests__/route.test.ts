/**
 * Tests for /api/twitch/status route
 * @jest-environment node
 */
import { GET } from '../route';

// Mock fetch
global.fetch = jest.fn();

describe('/api/twitch/status', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.TWITCH_CLIENT_ID;
    delete process.env.TWITCH_CLIENT_SECRET;
  });

  it('should return offline if credentials not configured', async () => {
    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.isLive).toBe(false);
    expect(data.error).toBe('Twitch credentials not configured');
  });

  it('should check stream status when configured', async () => {
    process.env.TWITCH_CLIENT_ID = 'test-id';
    process.env.TWITCH_CLIENT_SECRET = 'test-secret';

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'test-token' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [] }),
      });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.isLive).toBe(false);
  });
});
