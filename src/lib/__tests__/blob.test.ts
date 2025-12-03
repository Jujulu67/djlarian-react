/**
 * Tests for blob.ts
 * @jest-environment node
 */
// IMPORTANT: Set token BEFORE importing the module
process.env.BLOB_READ_WRITE_TOKEN = 'test-token';

import { put, del } from '@vercel/blob';
import crypto from 'crypto';

import {
  isBlobConfigured,
  getIsBlobConfigured,
  uploadToBlobWithCheck,
  uploadToBlob,
  deleteFromBlob,
  getBlobPublicUrl,
} from '../blob';

// Mock dependencies
jest.mock('@vercel/blob', () => ({
  put: jest.fn(),
  del: jest.fn(),
}));

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    image: {
      findUnique: jest.fn(),
    },
  },
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
  },
}));

describe('blob', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.BLOB_READ_WRITE_TOKEN = 'test-token';
  });

  describe('isBlobConfigured', () => {
    it('should return true when BLOB_READ_WRITE_TOKEN is set', () => {
      expect(isBlobConfigured).toBe(true);
    });
  });

  describe('getIsBlobConfigured', () => {
    it('should return true when token is configured', () => {
      process.env.BLOB_READ_WRITE_TOKEN = 'test-token';
      expect(getIsBlobConfigured()).toBe(true);
    });

    it('should return false when token is not configured', () => {
      const originalToken = process.env.BLOB_READ_WRITE_TOKEN;
      delete process.env.BLOB_READ_WRITE_TOKEN;
      expect(getIsBlobConfigured()).toBe(false);
      process.env.BLOB_READ_WRITE_TOKEN = originalToken;
    });
  });

  describe('uploadToBlobWithCheck', () => {
    it('should upload new file when image does not exist in DB', async () => {
      const { default: prisma } = await import('@/lib/prisma');
      (prisma.image.findUnique as jest.Mock).mockResolvedValue(null);
      (put as jest.Mock).mockResolvedValue({ url: 'https://blob.vercel-storage.com/test-key' });

      const buffer = Buffer.from('test image data');
      const result = await uploadToBlobWithCheck('test-key', buffer, 'image/jpeg', 'image-1');

      expect(result.url).toBe('https://blob.vercel-storage.com/test-key');
      expect(result.hash).toBeDefined();
      expect(put).toHaveBeenCalledWith('test-key', buffer, {
        access: 'public',
        contentType: 'image/jpeg',
      });
    });

    it('should reuse existing URL when hash matches', async () => {
      const { default: prisma } = await import('@/lib/prisma');
      const buffer = Buffer.from('test image data');
      const hash = crypto.createHash('sha256').update(buffer).digest('hex');

      (prisma.image.findUnique as jest.Mock).mockResolvedValue({
        blobUrl: 'https://blob.vercel-storage.com/existing-url',
        blobUrlOriginal: null,
        size: buffer.length,
        hash: hash,
        hashOriginal: null,
      });

      const result = await uploadToBlobWithCheck('test-key', buffer, 'image/jpeg', 'image-1');

      expect(result.url).toBe('https://blob.vercel-storage.com/existing-url');
      expect(result.hash).toBe(hash);
      expect(put).not.toHaveBeenCalled();
    });

    it('should upload when hash does not match', async () => {
      const { default: prisma } = await import('@/lib/prisma');
      const buffer = Buffer.from('test image data');
      const existingHash = 'different-hash';

      (prisma.image.findUnique as jest.Mock).mockResolvedValue({
        blobUrl: 'https://blob.vercel-storage.com/existing-url',
        blobUrlOriginal: null,
        size: buffer.length,
        hash: existingHash,
        hashOriginal: null,
      });

      (put as jest.Mock).mockResolvedValue({ url: 'https://blob.vercel-storage.com/new-url' });

      const result = await uploadToBlobWithCheck('test-key', buffer, 'image/jpeg', 'image-1');

      expect(result.url).toBe('https://blob.vercel-storage.com/new-url');
      expect(put).toHaveBeenCalled();
    });
  });

  describe('uploadToBlob', () => {
    it('should upload file to blob', async () => {
      (put as jest.Mock).mockResolvedValue({ url: 'https://blob.vercel-storage.com/test-key' });

      const buffer = Buffer.from('test');
      const url = await uploadToBlob('test-key', buffer, 'image/jpeg');

      expect(url).toBe('https://blob.vercel-storage.com/test-key');
      expect(put).toHaveBeenCalledWith('test-key', buffer, {
        access: 'public',
        contentType: 'image/jpeg',
      });
    });
  });

  describe('deleteFromBlob', () => {
    it('should delete file from blob', async () => {
      (del as jest.Mock).mockResolvedValue(undefined);

      await deleteFromBlob('https://blob.vercel-storage.com/test-key');

      expect(del).toHaveBeenCalledWith('https://blob.vercel-storage.com/test-key');
    });
  });

  describe('getBlobPublicUrl', () => {
    it('should return URL as-is if it starts with http', () => {
      const url = 'https://blob.vercel-storage.com/test-key';
      expect(getBlobPublicUrl(url)).toBe(url);
    });

    it('should return URL as-is if it starts with http://', () => {
      const url = 'http://blob.vercel-storage.com/test-key';
      expect(getBlobPublicUrl(url)).toBe(url);
    });

    it('should return key as-is if not a full URL', () => {
      const key = 'test-key';
      expect(getBlobPublicUrl(key)).toBe(key);
    });
  });
});
