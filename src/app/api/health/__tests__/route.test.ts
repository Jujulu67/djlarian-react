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

  it('should return only an ok status when the database answers', async () => {
    const { default: prisma } = await import('@/lib/prisma');
    (prisma.$queryRaw as jest.Mock).mockResolvedValue([{ test: 1 }]);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({ status: 'ok' });
  });

  it('should return only an error status on database error, details in the logs', async () => {
    const { default: prisma } = await import('@/lib/prisma');
    const { logger } = await import('@/lib/logger');
    (prisma.$queryRaw as jest.Mock).mockRejectedValue(
      new Error("Can't reach database server at db.internal:5432")
    );

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(503);
    expect(data).toEqual({ status: 'error' });
    expect(JSON.stringify(data)).not.toContain('db.internal');
    expect(logger.error).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ message: expect.stringContaining('db.internal') })
    );
  });
});
