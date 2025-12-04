// Mock @vercel/blob
jest.mock('@vercel/blob', () => ({
  put: jest.fn(),
  del: jest.fn(),
}));

// Mock prisma - must be defined before import
const mockPrismaImageFindUnique = jest.fn();
const mockPrisma = {
  image: {
    findUnique: mockPrismaImageFindUnique,
  },
};

jest.mock('../prisma', () => ({
  __esModule: true,
  default: mockPrisma,
}));

// Mock logger
jest.mock('../logger', () => ({
  logger: {
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  },
}));

import { getIsBlobConfigured, getBlobPublicUrl } from '../blob';
import { put, del } from '@vercel/blob';
import { logger } from '../logger';

// Mock logger
jest.mock('../logger', () => ({
  logger: {
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  },
}));

describe('blob', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('isBlobConfigured', () => {
    it('should return true when BLOB_READ_WRITE_TOKEN is set', () => {
      process.env.BLOB_READ_WRITE_TOKEN = 'test-token';
      // isBlobConfigured is evaluated at module load, so we test getIsBlobConfigured instead
      expect(getIsBlobConfigured()).toBe(true);
    });

    it('should return false when BLOB_READ_WRITE_TOKEN is not set', () => {
      delete process.env.BLOB_READ_WRITE_TOKEN;
      expect(getIsBlobConfigured()).toBe(false);
    });
  });

  describe('getIsBlobConfigured', () => {
    it('should return true when BLOB_READ_WRITE_TOKEN is set', () => {
      process.env.BLOB_READ_WRITE_TOKEN = 'test-token';
      expect(getIsBlobConfigured()).toBe(true);
    });

    it('should return false when BLOB_READ_WRITE_TOKEN is not set', () => {
      delete process.env.BLOB_READ_WRITE_TOKEN;
      expect(getIsBlobConfigured()).toBe(false);
    });
  });

  describe('uploadToBlob', () => {
    it('should upload file to blob', async () => {
      process.env.BLOB_READ_WRITE_TOKEN = 'test-token';
      jest.resetModules();
      const mockBlob = { url: 'https://blob.vercel-storage.com/test.jpg' };
      const mockPut = jest.fn().mockResolvedValue(mockBlob);
      jest.doMock('@vercel/blob', () => ({ put: mockPut, del: jest.fn() }));
      const { uploadToBlob: upload } = await import('../blob');
      const buffer = Buffer.from('test image data');

      const url = await upload('test.jpg', buffer, 'image/jpeg');

      expect(mockPut).toHaveBeenCalledWith('test.jpg', buffer, {
        access: 'public',
        contentType: 'image/jpeg',
      });
      expect(url).toBe('https://blob.vercel-storage.com/test.jpg');
    });

    it('should throw error if blob is not configured', async () => {
      delete process.env.BLOB_READ_WRITE_TOKEN;
      jest.resetModules();
      const { uploadToBlob: upload } = await import('../blob');

      await expect(upload('test.jpg', Buffer.from('data'), 'image/jpeg')).rejects.toThrow(
        'Vercel Blob not configured'
      );
    });

    it('should handle upload errors', async () => {
      process.env.BLOB_READ_WRITE_TOKEN = 'test-token';
      jest.resetModules();
      const error = new Error('Upload failed');
      const mockPut = jest.fn().mockRejectedValue(error);
      jest.doMock('@vercel/blob', () => ({ put: mockPut, del: jest.fn() }));
      const { uploadToBlob: upload } = await import('../blob');

      await expect(upload('test.jpg', Buffer.from('data'), 'image/jpeg')).rejects.toThrow(
        'Upload failed'
      );
    });
  });

  describe('uploadToBlobWithCheck', () => {
    it('should upload file if not in database', async () => {
      process.env.BLOB_READ_WRITE_TOKEN = 'test-token';
      jest.resetModules();
      const mockBlob = { url: 'https://blob.vercel-storage.com/test.jpg' };
      const mockPut = jest.fn().mockResolvedValue(mockBlob);
      jest.doMock('@vercel/blob', () => ({ put: mockPut, del: jest.fn() }));
      mockPrismaImageFindUnique.mockResolvedValue(null);
      const { uploadToBlobWithCheck: uploadWithCheck } = await import('../blob');
      const buffer = Buffer.from('test image data');

      const result = await uploadWithCheck('test.jpg', buffer);

      expect(mockPut).toHaveBeenCalled();
      expect(result.url).toBe('https://blob.vercel-storage.com/test.jpg');
      expect(result.hash).toBeDefined();
    });

    it('should reuse existing URL if hash matches', async () => {
      process.env.BLOB_READ_WRITE_TOKEN = 'test-token';
      jest.resetModules();
      const mockPut = jest.fn();
      jest.doMock('@vercel/blob', () => ({ put: mockPut, del: jest.fn() }));
      const { uploadToBlobWithCheck: uploadWithCheck } = await import('../blob');
      const buffer = Buffer.from('test image data');
      const hash = require('crypto').createHash('sha256').update(buffer).digest('hex');
      const existingImage = {
        blobUrl: 'https://blob.vercel-storage.com/existing.jpg',
        blobUrlOriginal: null,
        size: buffer.length,
        hash: hash,
        hashOriginal: null,
      };
      mockPrismaImageFindUnique.mockResolvedValue(existingImage as any);

      const result = await uploadWithCheck('test.jpg', buffer, 'image/jpeg', 'image-1', false);

      expect(mockPut).not.toHaveBeenCalled();
      expect(result.url).toBe('https://blob.vercel-storage.com/existing.jpg');
      expect(result.hash).toBe(hash);
    });

    it('should upload if hash does not match', async () => {
      process.env.BLOB_READ_WRITE_TOKEN = 'test-token';
      jest.resetModules();
      const mockBlob = { url: 'https://blob.vercel-storage.com/new.jpg' };
      const mockPut = jest.fn().mockResolvedValue(mockBlob);
      jest.doMock('@vercel/blob', () => ({ put: mockPut, del: jest.fn() }));
      const { uploadToBlobWithCheck: uploadWithCheck } = await import('../blob');
      const buffer = Buffer.from('test image data');
      const existingImage = {
        blobUrl: 'https://blob.vercel-storage.com/existing.jpg',
        blobUrlOriginal: null,
        size: buffer.length,
        hash: 'different-hash',
        hashOriginal: null,
      };
      mockPrismaImageFindUnique.mockResolvedValue(existingImage as any);

      const result = await uploadWithCheck('test.jpg', buffer, 'image/jpeg', 'image-1', false);

      expect(mockPut).toHaveBeenCalled();
      expect(result.url).toBe('https://blob.vercel-storage.com/new.jpg');
    });

    it('should handle database errors gracefully', async () => {
      process.env.BLOB_READ_WRITE_TOKEN = 'test-token';
      jest.resetModules();
      const mockBlob = { url: 'https://blob.vercel-storage.com/test.jpg' };
      const mockPut = jest.fn().mockResolvedValue(mockBlob);
      jest.doMock('@vercel/blob', () => ({ put: mockPut, del: jest.fn() }));
      mockPrismaImageFindUnique.mockRejectedValue(new Error('Database error'));
      const { uploadToBlobWithCheck: uploadWithCheck } = await import('../blob');
      const buffer = Buffer.from('test image data');

      const result = await uploadWithCheck('test.jpg', buffer, 'image/jpeg', 'image-1');

      // Database error should be caught and upload should proceed
      expect(mockPut).toHaveBeenCalled();
      expect(result.url).toBe('https://blob.vercel-storage.com/test.jpg');
    });

    it('should throw error if blob is not configured', async () => {
      delete process.env.BLOB_READ_WRITE_TOKEN;
      jest.resetModules();
      const { uploadToBlobWithCheck: uploadWithCheck } = await import('../blob');

      await expect(uploadWithCheck('test.jpg', Buffer.from('data'))).rejects.toThrow(
        'Vercel Blob not configured'
      );
    });
  });

  describe('deleteFromBlob', () => {
    it('should delete file from blob', async () => {
      process.env.BLOB_READ_WRITE_TOKEN = 'test-token';
      jest.resetModules();
      const mockDel = jest.fn().mockResolvedValue(undefined);
      jest.doMock('@vercel/blob', () => ({ put: jest.fn(), del: mockDel }));
      const { deleteFromBlob: deleteBlob } = await import('../blob');

      await deleteBlob('https://blob.vercel-storage.com/test.jpg');

      expect(mockDel).toHaveBeenCalledWith('https://blob.vercel-storage.com/test.jpg');
    });

    it('should throw error if blob is not configured', async () => {
      delete process.env.BLOB_READ_WRITE_TOKEN;
      jest.resetModules();
      const { deleteFromBlob: deleteBlob } = await import('../blob');

      await expect(deleteBlob('https://blob.vercel-storage.com/test.jpg')).rejects.toThrow(
        'Vercel Blob not configured'
      );
    });

    it('should handle delete errors', async () => {
      process.env.BLOB_READ_WRITE_TOKEN = 'test-token';
      jest.resetModules();
      const error = new Error('Delete failed');
      const mockDel = jest.fn().mockRejectedValue(error);
      jest.doMock('@vercel/blob', () => ({ put: jest.fn(), del: mockDel }));
      const { deleteFromBlob: deleteBlob } = await import('../blob');

      await expect(deleteBlob('https://blob.vercel-storage.com/test.jpg')).rejects.toThrow(
        'Delete failed'
      );
    });
  });

  describe('getBlobPublicUrl', () => {
    it('should return http URL as is', () => {
      const url = 'http://example.com/image.jpg';
      expect(getBlobPublicUrl(url)).toBe(url);
    });

    it('should return https URL as is', () => {
      const url = 'https://example.com/image.jpg';
      expect(getBlobPublicUrl(url)).toBe(url);
    });

    it('should return non-http URL as is', () => {
      const url = '/path/to/image.jpg';
      expect(getBlobPublicUrl(url)).toBe(url);
    });
  });
});
