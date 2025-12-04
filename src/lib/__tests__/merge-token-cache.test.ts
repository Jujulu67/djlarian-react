import {
  storeMergeToken,
  getMergeToken,
  hasMergeToken,
  peekAnyMergeToken,
  getAnyMergeToken,
} from '../merge-token-cache';
import prisma from '../prisma';

// Mock prisma
jest.mock('../prisma', () => ({
  __esModule: true,
  default: {
    mergeToken: {
      create: jest.fn(),
      deleteMany: jest.fn(),
      delete: jest.fn(),
      findFirst: jest.fn(),
    },
  },
}));

describe('merge-token-cache', () => {
  const mockPrisma = prisma as jest.Mocked<typeof prisma>;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('storeMergeToken', () => {
    it('should store a merge token', async () => {
      mockPrisma.mergeToken.deleteMany.mockResolvedValue({ count: 0 });
      mockPrisma.mergeToken.create.mockResolvedValue({
        id: 'token-1',
        email: 'test@example.com',
        token: 'test-token',
        expiresAt: new Date(),
        createdAt: new Date(),
      });

      await storeMergeToken('test@example.com', 'test-token');

      expect(mockPrisma.mergeToken.deleteMany).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
      expect(mockPrisma.mergeToken.create).toHaveBeenCalledWith({
        data: {
          email: 'test@example.com',
          token: 'test-token',
          expiresAt: expect.any(Date),
        },
      });
    });

    it('should lowercase email', async () => {
      mockPrisma.mergeToken.deleteMany.mockResolvedValue({ count: 0 });
      mockPrisma.mergeToken.create.mockResolvedValue({
        id: 'token-1',
        email: 'test@example.com',
        token: 'test-token',
        expiresAt: new Date(),
        createdAt: new Date(),
      });

      await storeMergeToken('TEST@EXAMPLE.COM', 'test-token');

      expect(mockPrisma.mergeToken.deleteMany).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
    });

    it('should set expiration to 1 hour from now', async () => {
      const now = Date.now();
      jest.setSystemTime(now);

      mockPrisma.mergeToken.deleteMany.mockResolvedValue({ count: 0 });
      mockPrisma.mergeToken.create.mockResolvedValue({
        id: 'token-1',
        email: 'test@example.com',
        token: 'test-token',
        expiresAt: new Date(now + 3600 * 1000),
        createdAt: new Date(),
      });

      await storeMergeToken('test@example.com', 'test-token');

      const createCall = mockPrisma.mergeToken.create.mock.calls[0][0];
      const expiresAt = createCall.data.expiresAt as Date;
      expect(expiresAt.getTime()).toBe(now + 3600 * 1000);
    });

    it('should throw error on failure', async () => {
      const error = new Error('Database error');
      mockPrisma.mergeToken.deleteMany.mockRejectedValue(error);

      await expect(storeMergeToken('test@example.com', 'test-token')).rejects.toThrow(
        'Database error'
      );
    });
  });

  describe('getMergeToken', () => {
    it('should retrieve and delete a merge token', async () => {
      const tokenData = {
        id: 'token-1',
        email: 'test@example.com',
        token: 'test-token',
        expiresAt: new Date(Date.now() + 3600 * 1000),
        createdAt: new Date(),
      };

      mockPrisma.mergeToken.findFirst.mockResolvedValue(tokenData);
      mockPrisma.mergeToken.delete.mockResolvedValue(tokenData);

      const token = await getMergeToken('test@example.com');

      expect(token).toBe('test-token');
      expect(mockPrisma.mergeToken.findFirst).toHaveBeenCalledWith({
        where: {
          email: 'test@example.com',
          expiresAt: {
            gt: expect.any(Date),
          },
        },
      });
      expect(mockPrisma.mergeToken.delete).toHaveBeenCalledWith({
        where: { id: 'token-1' },
      });
    });

    it('should return null if token not found', async () => {
      mockPrisma.mergeToken.findFirst.mockResolvedValue(null);

      const token = await getMergeToken('test@example.com');

      expect(token).toBeNull();
      expect(mockPrisma.mergeToken.delete).not.toHaveBeenCalled();
    });

    it('should return null if token is expired', async () => {
      mockPrisma.mergeToken.findFirst.mockResolvedValue(null);

      const token = await getMergeToken('test@example.com');

      expect(token).toBeNull();
    });

    it('should lowercase email', async () => {
      mockPrisma.mergeToken.findFirst.mockResolvedValue(null);

      await getMergeToken('TEST@EXAMPLE.COM');

      expect(mockPrisma.mergeToken.findFirst).toHaveBeenCalledWith({
        where: {
          email: 'test@example.com',
          expiresAt: {
            gt: expect.any(Date),
          },
        },
      });
    });

    it('should return null on error', async () => {
      mockPrisma.mergeToken.findFirst.mockRejectedValue(new Error('Database error'));

      const token = await getMergeToken('test@example.com');

      expect(token).toBeNull();
    });
  });

  describe('hasMergeToken', () => {
    it('should return true if token exists', async () => {
      const tokenData = {
        id: 'token-1',
        email: 'test@example.com',
        token: 'test-token',
        expiresAt: new Date(Date.now() + 3600 * 1000),
        createdAt: new Date(),
      };

      mockPrisma.mergeToken.findFirst.mockResolvedValue(tokenData);

      const hasToken = await hasMergeToken('test@example.com');

      expect(hasToken).toBe(true);
    });

    it('should return false if token does not exist', async () => {
      mockPrisma.mergeToken.findFirst.mockResolvedValue(null);

      const hasToken = await hasMergeToken('test@example.com');

      expect(hasToken).toBe(false);
    });

    it('should lowercase email', async () => {
      mockPrisma.mergeToken.findFirst.mockResolvedValue(null);

      await hasMergeToken('TEST@EXAMPLE.COM');

      expect(mockPrisma.mergeToken.findFirst).toHaveBeenCalledWith({
        where: {
          email: 'test@example.com',
          expiresAt: {
            gt: expect.any(Date),
          },
        },
      });
    });

    it('should return false on error', async () => {
      mockPrisma.mergeToken.findFirst.mockRejectedValue(new Error('Database error'));

      const hasToken = await hasMergeToken('test@example.com');

      expect(hasToken).toBe(false);
    });
  });

  describe('peekAnyMergeToken', () => {
    it('should return token without deleting it', async () => {
      const tokenData = {
        id: 'token-1',
        email: 'test@example.com',
        token: 'test-token',
        expiresAt: new Date(Date.now() + 3600 * 1000),
        createdAt: new Date(),
      };

      mockPrisma.mergeToken.findFirst.mockResolvedValue(tokenData);

      const result = await peekAnyMergeToken();

      expect(result).toEqual({
        token: 'test-token',
        email: 'test@example.com',
      });
      expect(mockPrisma.mergeToken.delete).not.toHaveBeenCalled();
    });

    it('should return null if no token found', async () => {
      mockPrisma.mergeToken.findFirst.mockResolvedValue(null);

      const result = await peekAnyMergeToken();

      expect(result).toBeNull();
    });

    it('should order by createdAt desc', async () => {
      mockPrisma.mergeToken.findFirst.mockResolvedValue(null);

      await peekAnyMergeToken();

      expect(mockPrisma.mergeToken.findFirst).toHaveBeenCalledWith({
        where: {
          expiresAt: {
            gt: expect.any(Date),
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
    });

    it('should return null on error', async () => {
      mockPrisma.mergeToken.findFirst.mockRejectedValue(new Error('Database error'));

      const result = await peekAnyMergeToken();

      expect(result).toBeNull();
    });
  });

  describe('getAnyMergeToken', () => {
    it('should retrieve and delete a token', async () => {
      const tokenData = {
        id: 'token-1',
        email: 'test@example.com',
        token: 'test-token',
        expiresAt: new Date(Date.now() + 3600 * 1000),
        createdAt: new Date(),
      };

      mockPrisma.mergeToken.findFirst.mockResolvedValue(tokenData);
      mockPrisma.mergeToken.delete.mockResolvedValue(tokenData);

      const result = await getAnyMergeToken();

      expect(result).toEqual({
        token: 'test-token',
        email: 'test@example.com',
      });
      expect(mockPrisma.mergeToken.delete).toHaveBeenCalledWith({
        where: { id: 'token-1' },
      });
    });

    it('should return null if no token found', async () => {
      mockPrisma.mergeToken.findFirst.mockResolvedValue(null);

      const result = await getAnyMergeToken();

      expect(result).toBeNull();
      expect(mockPrisma.mergeToken.delete).not.toHaveBeenCalled();
    });

    it('should order by createdAt desc', async () => {
      mockPrisma.mergeToken.findFirst.mockResolvedValue(null);

      await getAnyMergeToken();

      expect(mockPrisma.mergeToken.findFirst).toHaveBeenCalledWith({
        where: {
          expiresAt: {
            gt: expect.any(Date),
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
    });

    it('should return null on error', async () => {
      mockPrisma.mergeToken.findFirst.mockRejectedValue(new Error('Database error'));

      const result = await getAnyMergeToken();

      expect(result).toBeNull();
    });
  });
});
