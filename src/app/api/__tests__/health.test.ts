/**
 * @jest-environment node
 */
import { isBlobConfigured } from '@/lib/blob';
import prisma from '@/lib/prisma';

import { GET } from '../health/route';

// Mock dependencies
jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    $queryRaw: jest.fn(),
  },
}));

jest.mock('@/lib/blob', () => ({
  isBlobConfigured: jest.fn(() => false),
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('/api/health', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return health status with all checks', async () => {
    (prisma.$queryRaw as jest.Mock).mockResolvedValue([{ result: 1 }]);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty('status');
    expect(data).toHaveProperty('timestamp');
    expect(data).toHaveProperty('checks');
    expect(data.checks).toHaveProperty('database');
    expect(data.checks).toHaveProperty('blob');
    expect(data.checks).toHaveProperty('environment');
  });

  it('should report database as healthy when connection succeeds', async () => {
    (prisma.$queryRaw as jest.Mock).mockResolvedValue([{ test: 1 }]);

    const response = await GET();
    const data = await response.json();

    expect(data.checks.database.status).toBe('connected');
  });

  it('should report database as unhealthy when connection fails', async () => {
    (prisma.$queryRaw as jest.Mock).mockRejectedValue(new Error('Connection failed'));

    const response = await GET();
    const data = await response.json();

    expect(data.checks.database.status).toBe('error');
    expect(data.checks.database.message).toContain('Connection failed');
  });

  it('should report blob configuration status', async () => {
    (prisma.$queryRaw as jest.Mock).mockResolvedValue([{ test: 1 }]);
    (isBlobConfigured as unknown as jest.Mock<boolean>).mockReturnValue(true);

    const response = await GET();
    const data = await response.json();

    expect(data.checks.blob.status).toBe('available');
  });

  it('should include environment information', async () => {
    (prisma.$queryRaw as jest.Mock).mockResolvedValue([{ result: 1 }]);

    const response = await GET();
    const data = await response.json();

    expect(data.checks.environment).toHaveProperty('nodeEnv');
    expect(data.checks.environment).toHaveProperty('runtime');
  });
});
