import { logger } from '@/lib/logger';
import fs from 'fs';
import path from 'path';

// Mock fs
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
}));

// Mock path
jest.mock('path', () => ({
  join: jest.fn((...args) => args.join('/')),
}));

// Mock logger
jest.mock('@/lib/logger', () => ({
  logger: {
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock getActiveDatabaseTarget
const mockGetActiveDatabaseTarget = jest.fn();
jest.mock('@/lib/database-target', () => ({
  getActiveDatabaseTarget: (...args: any[]) => mockGetActiveDatabaseTarget(...args),
}));

import { shouldUseBlobStorage } from '../getStorageConfig';

describe('getStorageConfig', () => {
  const originalEnv = process.env.NODE_ENV;
  const originalBlobToken = process.env.BLOB_READ_WRITE_TOKEN;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NODE_ENV = originalEnv;
    process.env.BLOB_READ_WRITE_TOKEN = originalBlobToken;
    (fs.existsSync as jest.Mock).mockReturnValue(false);
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
    process.env.BLOB_READ_WRITE_TOKEN = originalBlobToken;
  });

  describe('shouldUseBlobStorage', () => {
    beforeEach(() => {
      mockGetActiveDatabaseTarget.mockResolvedValue('local');
    });

    it('should return true in production when blob is configured', async () => {
      process.env.NODE_ENV = 'production';
      process.env.BLOB_READ_WRITE_TOKEN = 'test-token';

      const result = await shouldUseBlobStorage();

      expect(result).toBe(true);
    });

    it('should return false in production when blob is not configured', async () => {
      process.env.NODE_ENV = 'production';
      delete process.env.BLOB_READ_WRITE_TOKEN;

      const result = await shouldUseBlobStorage();

      expect(result).toBe(false);
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Production détectée mais BLOB_READ_WRITE_TOKEN non configuré')
      );
    });

    it('should return true in development when switch is enabled and blob is configured', async () => {
      process.env.NODE_ENV = 'development';
      process.env.BLOB_READ_WRITE_TOKEN = 'test-token';
      mockGetActiveDatabaseTarget.mockResolvedValue('production');

      const result = await shouldUseBlobStorage();

      expect(result).toBe(true);
    });

    it('should return false in development when switch is enabled but blob is not configured', async () => {
      process.env.NODE_ENV = 'development';
      delete process.env.BLOB_READ_WRITE_TOKEN;
      mockGetActiveDatabaseTarget.mockResolvedValue('production');

      const result = await shouldUseBlobStorage();

      expect(result).toBe(false);
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Switch production activé mais BLOB_READ_WRITE_TOKEN non configuré')
      );
    });

    it('should return false in development when switch is disabled', async () => {
      process.env.NODE_ENV = 'development';
      process.env.BLOB_READ_WRITE_TOKEN = 'test-token';
      mockGetActiveDatabaseTarget.mockResolvedValue('local');

      const result = await shouldUseBlobStorage();

      expect(result).toBe(false);
    });

    it('should return false in development when target is local', async () => {
      process.env.NODE_ENV = 'development';
      process.env.BLOB_READ_WRITE_TOKEN = 'test-token';
      mockGetActiveDatabaseTarget.mockResolvedValue('local');

      const result = await shouldUseBlobStorage();

      expect(result).toBe(false);
    });

    it('should handle errors gracefully', async () => {
      process.env.NODE_ENV = 'development';
      process.env.BLOB_READ_WRITE_TOKEN = 'test-token';
      mockGetActiveDatabaseTarget.mockRejectedValue(new Error('Database target error'));

      const result = await shouldUseBlobStorage();

      expect(result).toBe(false);
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Erreur lecture cible DB'),
        expect.any(Error)
      );
    });
  });
});
