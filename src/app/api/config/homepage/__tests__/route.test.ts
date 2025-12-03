/**
 * Tests for /api/config/homepage route
 * @jest-environment node
 */
import { GET } from '../route';

// Mock dependencies
jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    siteConfig: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
  },
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
  },
}));

describe('/api/config/homepage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return homepage config', async () => {
    const { default: prisma } = await import('@/lib/prisma');
    (prisma.siteConfig.count as jest.Mock).mockResolvedValue(0);
    (prisma.siteConfig.findMany as jest.Mock).mockResolvedValue([]);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toBeDefined();
  });

  it('should handle database errors gracefully', async () => {
    const { default: prisma } = await import('@/lib/prisma');
    (prisma.siteConfig.count as jest.Mock).mockRejectedValue(new Error('Database error'));

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toBeDefined();
  });
});
