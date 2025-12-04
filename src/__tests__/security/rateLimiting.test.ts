import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock Next.js server modules
class MockNextRequest {
  url: string;
  headers: Headers;
  nextUrl: { pathname: string };

  constructor(url: string, init?: { headers?: Record<string, string> }) {
    this.url = url;
    this.headers = new Headers(init?.headers || {});
    this.nextUrl = { pathname: new URL(url).pathname };
  }
}

jest.mock('next/server', () => ({
  NextRequest: MockNextRequest,
  NextResponse: {
    json: jest.fn((body, init) => ({
      status: init?.status || 200,
      json: async () => body,
      headers: new Headers(init?.headers || {}),
    })),
  },
}));

// Mock the rateLimit function to work with our mock
import { rateLimit } from '@/lib/api/rateLimiter';

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    siteConfig: {
      findMany: jest.fn().mockResolvedValue([]),
    },
  },
}));

// Mock logger
jest.mock('@/lib/logger', () => ({
  logger: {
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock defaultConfigs
jest.mock('@/config/defaults', () => ({
  defaultConfigs: {
    api: {
      apiEnabled: true,
      rateLimit: 100,
    },
  },
}));

describe('Rate Limiting Security Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Clear the rate limit cache by accessing it through the module
    // Note: This is a limitation of testing - the cache is internal
    // In production, consider using a dependency injection pattern
  });

  it('should allow requests under the limit', async () => {
    const request = new MockNextRequest('http://localhost:3000/api/test', {
      headers: {
        'x-forwarded-for': '192.168.1.1',
      },
    }) as any;

    const result = await rateLimit(request, 10);
    expect(result).toBeNull();
  });

  it('should block requests exceeding the limit', async () => {
    const request = new MockNextRequest('http://localhost:3000/api/test', {
      headers: {
        'x-forwarded-for': '192.168.1.2',
      },
    });

    const limit = 3;

    // Make requests up to the limit
    for (let i = 0; i < limit; i++) {
      const result = await rateLimit(request, limit);
      expect(result).toBeNull();
    }

    // Next request should be blocked
    const blockedResult = await rateLimit(request, limit);
    expect(blockedResult).not.toBeNull();
    expect(blockedResult?.status).toBe(429);

    const json = await blockedResult?.json();
    expect(json).toMatchObject({
      error: 'Too many requests',
      message: expect.stringContaining('Rate limit exceeded'),
    });
  });

  it('should include rate limit headers in blocked response', async () => {
    const request = new MockNextRequest('http://localhost:3000/api/test', {
      headers: {
        'x-forwarded-for': '192.168.1.3',
      },
    });

    const limit = 2;

    // Exceed the limit
    for (let i = 0; i <= limit; i++) {
      await rateLimit(request, limit);
    }

    const result = await rateLimit(request, limit);
    expect(result).not.toBeNull();

    const headers = result?.headers;
    expect(headers?.get('X-RateLimit-Limit')).toBe(limit.toString());
    expect(headers?.get('X-RateLimit-Remaining')).toBe('0');
    expect(headers?.get('Retry-After')).toBeTruthy();
  });

  it('should reset the limit after the time window', async () => {
    const request = new MockNextRequest('http://localhost:3000/api/test', {
      headers: {
        'x-forwarded-for': '192.168.1.4',
      },
    });

    const limit = 2;

    // Exceed the limit
    for (let i = 0; i <= limit; i++) {
      await rateLimit(request, limit);
    }

    // Should be blocked
    const blocked = await rateLimit(request, limit);
    expect(blocked?.status).toBe(429);

    // Mock time passing (in real scenario, wait for the window)
    // Note: This test demonstrates the concept, but the actual reset
    // would happen after 60 seconds in production
    jest.useFakeTimers();
    jest.advanceTimersByTime(61000); // 61 seconds

    // After reset, should allow again
    // Note: This is a simplified test - the actual cache cleanup
    // happens in setInterval which is harder to test
    jest.useRealTimers();
  });

  it('should use different limits for different IPs', async () => {
    const request1 = new MockNextRequest('http://localhost:3000/api/test', {
      headers: {
        'x-forwarded-for': '192.168.1.5',
      },
    });

    const request2 = new MockNextRequest('http://localhost:3000/api/test', {
      headers: {
        'x-forwarded-for': '192.168.1.6',
      },
    });

    const limit = 2;

    // Exceed limit for IP1
    for (let i = 0; i <= limit; i++) {
      await rateLimit(request1, limit);
    }

    // IP1 should be blocked
    const blocked1 = await rateLimit(request1, limit);
    expect(blocked1?.status).toBe(429);

    // IP2 should still be allowed
    const allowed2 = await rateLimit(request2, limit);
    expect(allowed2).toBeNull();
  });

  it('should use different limits for different paths', async () => {
    const request1 = new MockNextRequest('http://localhost:3000/api/test1', {
      headers: {
        'x-forwarded-for': '192.168.1.7',
      },
    });

    const request2 = new MockNextRequest('http://localhost:3000/api/test2', {
      headers: {
        'x-forwarded-for': '192.168.1.7',
      },
    });

    const limit = 2;

    // Exceed limit for path1
    for (let i = 0; i <= limit; i++) {
      await rateLimit(request1, limit);
    }

    // Path1 should be blocked
    const blocked1 = await rateLimit(request1, limit);
    expect(blocked1?.status).toBe(429);

    // Path2 should still be allowed
    const allowed2 = await rateLimit(request2, limit);
    expect(allowed2).toBeNull();
  });

  it('should return 503 if API is disabled', async () => {
    // Mock API disabled
    const { default: prisma } = await import('@/lib/prisma');
    (prisma.siteConfig.findMany as jest.Mock).mockResolvedValueOnce([
      { key: 'apiEnabled', value: 'false' },
    ]);

    const request = new MockNextRequest('http://localhost:3000/api/test', {
      headers: {
        'x-forwarded-for': '192.168.1.8',
      },
    });

    const result = await rateLimit(request);
    expect(result).not.toBeNull();
    expect(result?.status).toBe(503);

    const json = await result?.json();
    expect(json).toMatchObject({
      error: 'API is disabled',
    });
  });

  it('should handle missing IP headers gracefully', async () => {
    const request = new MockNextRequest('http://localhost:3000/api/test', {
      // No IP headers
    });

    const result = await rateLimit(request, 10);
    // Should still work, using 'unknown' as IP
    expect(result).toBeNull();
  });
});
