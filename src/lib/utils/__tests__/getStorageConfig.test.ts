import fs from 'fs';
import path from 'path';

import { shouldUseBlobStorage } from '../getStorageConfig';

// Mock dependencies
const mockIsBlobConfiguredValue = { value: false };
jest.mock('@/lib/blob', () => ({
  get isBlobConfigured() {
    return mockIsBlobConfiguredValue.value;
  },
}));

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

  beforeEach(() => {
    jest.clearAllMocks();
    mockIsBlobConfiguredValue.value = false;
    // Reset NODE_ENV
    delete (process.env as any).NODE_ENV;
  });

  afterEach(() => {
    delete (process.env as any).NODE_ENV;
  });

  describe('in production', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production';
    });

    it('should return true if blob is configured', () => {
      mockIsBlobConfiguredValue.value = true;
      const result = shouldUseBlobStorage();
      expect(result).toBe(true);
    });

    it('should return false if blob is not configured', () => {
      mockIsBlobConfiguredValue.value = false;
      const result = shouldUseBlobStorage();
      expect(result).toBe(false);
    });
  });

  describe('in development', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development';
    });

    it('should return false by default (no switch file)', () => {
      mockIsBlobConfiguredValue.value = true;
      mockExistsSync.mockReturnValue(false);
      const result = shouldUseBlobStorage();
      expect(result).toBe(false);
    });

    it('should return true if switch is set to useProduction and blob is configured', () => {
      mockIsBlobConfiguredValue.value = true;
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify({ useProduction: true }));
      const result = shouldUseBlobStorage();
      expect(result).toBe(true);
    });

    it('should return false if switch is set to useProduction but blob is not configured', () => {
      mockIsBlobConfiguredValue.value = false;
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify({ useProduction: true }));
      const result = shouldUseBlobStorage();
      expect(result).toBe(false);
    });

    it('should return false if switch is set to useProduction: false', () => {
      mockIsBlobConfiguredValue.value = true;
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify({ useProduction: false }));
      const result = shouldUseBlobStorage();
      expect(result).toBe(false);
    });

    it('should handle invalid JSON gracefully', () => {
      mockIsBlobConfiguredValue.value = true;
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue('invalid json');
      // Should not throw, should return false
      expect(() => shouldUseBlobStorage()).not.toThrow();
      const result = shouldUseBlobStorage();
      expect(result).toBe(false);
    });

    it('should handle file read errors gracefully', () => {
      mockIsBlobConfiguredValue.value = true;
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
