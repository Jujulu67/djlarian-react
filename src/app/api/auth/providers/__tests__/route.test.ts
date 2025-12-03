/**
 * Tests for /api/auth/providers route
 * @jest-environment node
 */
import { GET } from '../route';

describe('/api/auth/providers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_CLIENT_SECRET;
    delete process.env.TWITCH_CLIENT_ID;
    delete process.env.TWITCH_CLIENT_SECRET;
  });

  it('should return providers status', async () => {
    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toBeDefined();
    expect(data.google).toBeDefined();
    expect(data.twitch).toBeDefined();
  });

  it('should return true for configured providers', async () => {
    process.env.GOOGLE_CLIENT_ID = 'test-id';
    process.env.GOOGLE_CLIENT_SECRET = 'test-secret';

    const response = await GET();
    const data = await response.json();

    expect(data.google).toBe(true);
  });
});
