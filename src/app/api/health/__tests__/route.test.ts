/**
 * Tests for /api/health route
 * @jest-environment node
 */
import { GET } from '../route';

// Mock dependencies
jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    $queryRaw: jest.fn(),
  },
}));

jest.mock('@/lib/blob', () => ({
  isBlobConfigured: false,
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    debug: jest.fn(),
    error: jest.fn(),
  },
}));

describe('/api/health', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return health status', async () => {
    const { default: prisma } = await import('@/lib/prisma');
    (prisma.$queryRaw as jest.Mock).mockResolvedValue([{ test: 1 }]);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.status).toBe('ok');
    expect(data.checks).toBeDefined();
  });

  it('should return degraded status on database error', async () => {
    const { default: prisma } = await import('@/lib/prisma');
    (prisma.$queryRaw as jest.Mock).mockRejectedValue(new Error('Database error'));

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(503);
    expect(data.status).toBe('degraded');
    expect(data.checks.database.status).toBe('error');
  });
});
