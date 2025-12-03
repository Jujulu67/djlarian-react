/**
 * Tests for /api/admin/integrations/status route
 * @jest-environment node
 */
import { NextRequest } from 'next/server';

import { GET } from '../route';

// Mock dependencies
jest.mock('@/auth', () => ({
  auth: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
  },
}));

describe('/api/admin/integrations/status', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.NEXT_PUBLIC_UMAMI_URL;
    delete process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID;
    delete process.env.NEXT_PUBLIC_SENTRY_DSN;
    delete process.env.VERCEL;
  });

  it('should return integrations status for admin user', async () => {
    const { auth } = await import('@/auth');
    (auth as jest.Mock).mockResolvedValue({
      user: { id: 'admin1', role: 'ADMIN' },
    });

    const request = new NextRequest('http://localhost/api/admin/integrations/status');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.vercel).toBeDefined();
    expect(data.sentry).toBeDefined();
    expect(data.umami).toBeDefined();
  });

  it('should return 401 for non-admin user', async () => {
    const { auth } = await import('@/auth');
    (auth as jest.Mock).mockResolvedValue({
      user: { id: 'user1', role: 'USER' },
    });

    const request = new NextRequest('http://localhost/api/admin/integrations/status');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Non autorisé');
  });
});
