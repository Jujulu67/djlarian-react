import { shouldUseBlobStorage } from '../getStorageConfig';
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
    it('should return true in production when blob is configured', () => {
      process.env.NODE_ENV = 'production';
      process.env.BLOB_READ_WRITE_TOKEN = 'test-token';

      const result = shouldUseBlobStorage();

      expect(result).toBe(true);
    });

    it('should return false in production when blob is not configured', () => {
      process.env.NODE_ENV = 'production';
      delete process.env.BLOB_READ_WRITE_TOKEN;

      const result = shouldUseBlobStorage();

      expect(result).toBe(false);
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Production détectée mais BLOB_READ_WRITE_TOKEN non configuré')
      );
    });

    it('should return true in development when switch is enabled and blob is configured', () => {
      process.env.NODE_ENV = 'development';
      process.env.BLOB_READ_WRITE_TOKEN = 'test-token';
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify({ useProduction: true }));
      (path.join as jest.Mock).mockReturnValue('.db-switch.json');

      const result = shouldUseBlobStorage();

      expect(result).toBe(true);
    });

    it('should return false in development when switch is enabled but blob is not configured', () => {
      process.env.NODE_ENV = 'development';
      delete process.env.BLOB_READ_WRITE_TOKEN;
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify({ useProduction: true }));
      (path.join as jest.Mock).mockReturnValue('.db-switch.json');

      const result = shouldUseBlobStorage();

      expect(result).toBe(false);
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Switch production activé mais BLOB_READ_WRITE_TOKEN non configuré')
      );
    });

    it('should return false in development when switch is disabled', () => {
      process.env.NODE_ENV = 'development';
      process.env.BLOB_READ_WRITE_TOKEN = 'test-token';
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify({ useProduction: false }));
      (path.join as jest.Mock).mockReturnValue('.db-switch.json');

      const result = shouldUseBlobStorage();

      expect(result).toBe(false);
    });

    it('should return false in development when switch file does not exist', () => {
      process.env.NODE_ENV = 'development';
      process.env.BLOB_READ_WRITE_TOKEN = 'test-token';
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      const result = shouldUseBlobStorage();

      expect(result).toBe(false);
    });

    it('should handle switch file read errors gracefully', () => {
      process.env.NODE_ENV = 'development';
      process.env.BLOB_READ_WRITE_TOKEN = 'test-token';
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockImplementation(() => {
        throw new Error('File read error');
      });
      (path.join as jest.Mock).mockReturnValue('.db-switch.json');

      const result = shouldUseBlobStorage();

      expect(result).toBe(false);
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Erreur lecture switch'),
        expect.any(Error)
      );
    });

    it('should handle invalid JSON in switch file', () => {
      process.env.NODE_ENV = 'development';
      process.env.BLOB_READ_WRITE_TOKEN = 'test-token';
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue('invalid json');
      (path.join as jest.Mock).mockReturnValue('.db-switch.json');

      const result = shouldUseBlobStorage();

      expect(result).toBe(false);
    });
  });
});
