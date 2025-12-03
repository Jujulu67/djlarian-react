/**
 * Tests for saveImage
 * @jest-environment node
 */
import fs from 'fs';
import path from 'path';

import { saveImage } from '../saveImage';

// Mock dependencies
jest.mock('@/lib/blob', () => ({
  uploadToBlobWithCheck: jest.fn(),
}));

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    image: {
      upsert: jest.fn(),
    },
  },
}));

jest.mock('@/lib/utils/getStorageConfig', () => ({
  shouldUseBlobStorage: jest.fn(() => false),
}));

jest.mock('fs', () => ({
  existsSync: jest.fn(),
  mkdirSync: jest.fn(),
  writeFileSync: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
  },
}));

describe('saveImage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should save image locally when not using blob storage', async () => {
    const { shouldUseBlobStorage } = await import('@/lib/utils/getStorageConfig');
    (shouldUseBlobStorage as jest.Mock).mockReturnValue(false);

    (fs.existsSync as jest.Mock).mockReturnValue(true);

    const imageId = 'test-image';
    const buffer = Buffer.from('image-data');

    const result = await saveImage(imageId, buffer);

    expect(result).toBe(imageId);
    expect(fs.writeFileSync).toHaveBeenCalled();
  });

  it('should create uploads directory if it does not exist', async () => {
    const { shouldUseBlobStorage } = await import('@/lib/utils/getStorageConfig');
    (shouldUseBlobStorage as jest.Mock).mockReturnValue(false);

    (fs.existsSync as jest.Mock).mockReturnValue(false);

    const imageId = 'test-image';
    const buffer = Buffer.from('image-data');

    await saveImage(imageId, buffer);

    expect(fs.mkdirSync).toHaveBeenCalled();
  });

  it('should save image to blob when using blob storage', async () => {
    const { shouldUseBlobStorage } = await import('@/lib/utils/getStorageConfig');
    const { uploadToBlobWithCheck } = await import('@/lib/blob');
    const { default: prisma } = await import('@/lib/prisma');

    (shouldUseBlobStorage as jest.Mock).mockReturnValue(true);
    process.env.BLOB_READ_WRITE_TOKEN = 'test-token';

    (uploadToBlobWithCheck as jest.Mock).mockResolvedValue({
      url: 'https://blob.vercel-storage.com/test-image.webp',
      hash: 'test-hash',
    });

    (prisma.image.upsert as jest.Mock).mockResolvedValue({
      imageId: 'test-image',
    });

    const imageId = 'test-image';
    const buffer = Buffer.from('image-data');

    const result = await saveImage(imageId, buffer);

    expect(result).toBe(imageId);
    expect(uploadToBlobWithCheck).toHaveBeenCalled();
    expect(prisma.image.upsert).toHaveBeenCalled();
  });

  it('should save original image when provided', async () => {
    const { shouldUseBlobStorage } = await import('@/lib/utils/getStorageConfig');
    const { uploadToBlobWithCheck } = await import('@/lib/blob');
    const { default: prisma } = await import('@/lib/prisma');

    (shouldUseBlobStorage as jest.Mock).mockReturnValue(true);
    process.env.BLOB_READ_WRITE_TOKEN = 'test-token';

    (uploadToBlobWithCheck as jest.Mock)
      .mockResolvedValueOnce({
        url: 'https://blob.vercel-storage.com/test-image.webp',
        hash: 'test-hash',
      })
      .mockResolvedValueOnce({
        url: 'https://blob.vercel-storage.com/test-image-ori.webp',
        hash: 'original-hash',
      });

    (prisma.image.upsert as jest.Mock).mockResolvedValue({
      imageId: 'test-image',
    });

    const imageId = 'test-image';
    const buffer = Buffer.from('image-data');
    const originalBuffer = Buffer.from('original-data');

    const result = await saveImage(imageId, buffer, originalBuffer);

    expect(result).toBe(imageId);
    expect(uploadToBlobWithCheck).toHaveBeenCalledTimes(2);
  });

  it('should return null on error', async () => {
    const { shouldUseBlobStorage } = await import('@/lib/utils/getStorageConfig');
    (shouldUseBlobStorage as jest.Mock).mockReturnValue(false);

    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.writeFileSync as jest.Mock).mockImplementation(() => {
      throw new Error('Write error');
    });

    const imageId = 'test-image';
    const buffer = Buffer.from('image-data');

    const result = await saveImage(imageId, buffer);

    expect(result).toBeNull();
  });
});
