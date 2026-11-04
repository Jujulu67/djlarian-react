/**
 * @jest-environment node
 */
import prisma from '@/lib/prisma';

import { GET } from '../health/route';

// Mock dependencies
jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    $queryRaw: jest.fn(),
  },
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('/api/health', () => {
  const originalDatabaseUrl = process.env.DATABASE_URL;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.DATABASE_URL = 'postgresql://user:secret@host:5432/db';
  });

  afterAll(() => {
    process.env.DATABASE_URL = originalDatabaseUrl;
  });

  it('should expose nothing but the status when healthy', async () => {
    (prisma.$queryRaw as jest.Mock).mockResolvedValue([{ test: 1 }]);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(Object.keys(data)).toEqual(['status']);
    expect(data.status).toBe('ok');
  });

  it('should not leak the Prisma error message nor DATABASE_URL details when unhealthy', async () => {
    (prisma.$queryRaw as jest.Mock).mockRejectedValue(new Error('Connection failed'));

    const response = await GET();
    const body = await response.text();

    expect(response.status).toBe(503);
    expect(JSON.parse(body)).toEqual({ status: 'error' });
    expect(body).not.toContain('Connection failed');
    expect(body).not.toContain('chars');
    expect(body).not.toContain('secret');
  });
});
