/**
 * Tests for /api/live/submissions/upload-token route
 * @jest-environment node
 */
import { NextRequest } from 'next/server';

import { GET } from '../route';

// Mock dependencies
jest.mock('@/auth', () => ({
  auth: jest.fn(),
}));

describe('/api/live/submissions/upload-token', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.BLOB_READ_WRITE_TOKEN;
  });

  it('should return token for authenticated user', async () => {
    const { auth } = await import('@/auth');
    (auth as jest.Mock).mockResolvedValue({
      user: { id: 'user1' },
    });

    process.env.BLOB_READ_WRITE_TOKEN = 'test-token-123';

    const request = new NextRequest('http://localhost/api/live/submissions/upload-token', {
      method: 'GET',
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.token).toBe('test-token-123');
  });

  it('should return 401 for unauthenticated user', async () => {
    const { auth } = await import('@/auth');
    (auth as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest('http://localhost/api/live/submissions/upload-token', {
      method: 'GET',
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Non authentifié');
  });

  it('should return 503 if blob storage not configured', async () => {
    const { auth } = await import('@/auth');
    (auth as jest.Mock).mockResolvedValue({
      user: { id: 'user1' },
    });

    delete process.env.BLOB_READ_WRITE_TOKEN;

    const request = new NextRequest('http://localhost/api/live/submissions/upload-token', {
      method: 'GET',
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(503);
    expect(data.error).toBe('Blob Storage non configuré');
  });
});
