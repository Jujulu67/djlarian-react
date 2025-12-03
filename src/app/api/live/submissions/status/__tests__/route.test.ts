/**
 * Tests for /api/live/submissions/status route
 * @jest-environment node
 */
import { NextRequest } from 'next/server';

import { GET } from '../route';

// Mock dependencies
jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    adminSettings: {
      findUnique: jest.fn(),
    },
  },
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
  },
}));

describe('/api/live/submissions/status', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return submission status', async () => {
    const { default: prisma } = await import('@/lib/prisma');
    (prisma.adminSettings.findUnique as jest.Mock).mockResolvedValue({
      key: 'trackSubmissions',
      value: 'true',
    });

    const request = new NextRequest('http://localhost/api/live/submissions/status');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data).toBeDefined();
    expect(data.data.trackSubmissions).toBeDefined();
  });

  it('should return default status if setting not found', async () => {
    const { default: prisma } = await import('@/lib/prisma');
    (prisma.adminSettings.findUnique as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest('http://localhost/api/live/submissions/status');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.trackSubmissions).toBe(true);
  });
});
