/**
 * Tests for /api/admin/sentry/status route
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
    debug: jest.fn(),
    warn: jest.fn(),
  },
}));

// Mock fetch
global.fetch = jest.fn();

describe('/api/admin/sentry/status', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.NEXT_PUBLIC_SENTRY_DSN;
    delete process.env.SENTRY_AUTH_TOKEN;
    delete process.env.SENTRY_ORG;
    delete process.env.SENTRY_PROJECT;
  });

  it('should return sentry status for admin user', async () => {
    const { auth } = await import('@/auth');
    (auth as jest.Mock).mockResolvedValue({
      user: { id: 'admin1', role: 'ADMIN' },
    });

    const request = new NextRequest('http://localhost/api/admin/sentry/status');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.enabled).toBeDefined();
  });

  it('should return 401 for non-admin user', async () => {
    const { auth } = await import('@/auth');
    (auth as jest.Mock).mockResolvedValue({
      user: { id: 'user1', role: 'USER' },
    });

    const request = new NextRequest('http://localhost/api/admin/sentry/status');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Non autorisé');
  });

  it('should return enabled false when DSN not configured', async () => {
    const { auth } = await import('@/auth');
    (auth as jest.Mock).mockResolvedValue({
      user: { id: 'admin1', role: 'ADMIN' },
    });

    const request = new NextRequest('http://localhost/api/admin/sentry/status');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.enabled).toBe(false);
  });
});
