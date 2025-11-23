import fs from 'fs';
import path from 'path';

import { shouldUseBlobStorage } from '../getStorageConfig';

// Mock dependencies
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
}));

jest.mock('path', () => ({
  join: jest.fn((...args) => args.join('/')),
}));

describe('shouldUseBlobStorage', () => {
  const mockExistsSync = fs.existsSync as jest.MockedFunction<typeof fs.existsSync>;
  const mockReadFileSync = fs.readFileSync as jest.MockedFunction<typeof fs.readFileSync>;
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset NODE_ENV et BLOB_READ_WRITE_TOKEN - utiliser Object.defineProperty pour éviter l'erreur readonly
    Object.defineProperty(process, 'env', {
      value: { ...originalEnv },
      writable: true,
      configurable: true,
    });
    if ('NODE_ENV' in process.env) {
      delete (process.env as Record<string, string | undefined>).NODE_ENV;
    }
    if ('BLOB_READ_WRITE_TOKEN' in process.env) {
      delete (process.env as Record<string, string | undefined>).BLOB_READ_WRITE_TOKEN;
    }
  });

  afterEach(() => {
    Object.defineProperty(process, 'env', {
      value: { ...originalEnv },
      writable: true,
      configurable: true,
    });
    if ('NODE_ENV' in process.env) {
      delete (process.env as Record<string, string | undefined>).NODE_ENV;
    }
    if ('BLOB_READ_WRITE_TOKEN' in process.env) {
      delete (process.env as Record<string, string | undefined>).BLOB_READ_WRITE_TOKEN;
    }
  });

  describe('in production', () => {
    beforeEach(() => {
      Object.defineProperty(process, 'env', {
        value: { ...process.env, NODE_ENV: 'production' },
        writable: true,
        configurable: true,
      });
    });

    it('should return true if blob is configured', () => {
      process.env.BLOB_READ_WRITE_TOKEN = 'test-token';
      const result = shouldUseBlobStorage();
      expect(result).toBe(true);
    });

    it('should return false if blob is not configured', () => {
      delete (process.env as Record<string, string | undefined>).BLOB_READ_WRITE_TOKEN;
      const result = shouldUseBlobStorage();
      expect(result).toBe(false);
    });
  });

  describe('in development', () => {
    beforeEach(() => {
      Object.defineProperty(process, 'env', {
        value: { ...process.env, NODE_ENV: 'development' },
        writable: true,
        configurable: true,
      });
    });

    it('should return false by default (no switch file)', () => {
      process.env.BLOB_READ_WRITE_TOKEN = 'test-token';
      mockExistsSync.mockReturnValue(false);
      const result = shouldUseBlobStorage();
      expect(result).toBe(false);
    });

    it('should return true if switch is set to useProduction and blob is configured', () => {
      process.env.BLOB_READ_WRITE_TOKEN = 'test-token';
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify({ useProduction: true }));
      const result = shouldUseBlobStorage();
      expect(result).toBe(true);
    });

    it('should return false if switch is set to useProduction but blob is not configured', () => {
      delete (process.env as Record<string, string | undefined>).BLOB_READ_WRITE_TOKEN;
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify({ useProduction: true }));
      const result = shouldUseBlobStorage();
      expect(result).toBe(false);
    });

    it('should return false if switch is set to useProduction: false', () => {
      process.env.BLOB_READ_WRITE_TOKEN = 'test-token';
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify({ useProduction: false }));
      const result = shouldUseBlobStorage();
      expect(result).toBe(false);
    });

    it('should handle invalid JSON gracefully', () => {
      process.env.BLOB_READ_WRITE_TOKEN = 'test-token';
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue('invalid json');
      // Should not throw, should return false
      expect(() => shouldUseBlobStorage()).not.toThrow();
      const result = shouldUseBlobStorage();
      expect(result).toBe(false);
    });

    it('should handle file read errors gracefully', () => {
      process.env.BLOB_READ_WRITE_TOKEN = 'test-token';
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockImplementation(() => {
        throw new Error('File read error');
      });
      // Should not throw, should return false
      expect(() => shouldUseBlobStorage()).not.toThrow();
      const result = shouldUseBlobStorage();
      expect(result).toBe(false);
    });
  });
});
