import { saveImage } from '../saveImage';
import { uploadToBlobWithCheck } from '@/lib/blob';
import { shouldUseBlobStorage } from '@/lib/utils/getStorageConfig';
import prisma from '@/lib/prisma';
import { logger } from '@/lib/logger';
import fs from 'fs';
import path from 'path';

// Mock dependencies
jest.mock('@/lib/blob', () => ({
  uploadToBlobWithCheck: jest.fn(),
}));

jest.mock('@/lib/utils/getStorageConfig', () => ({
  shouldUseBlobStorage: jest.fn(),
}));

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    image: {
      upsert: jest.fn(),
    },
  },
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  },
}));

jest.mock('fs', () => ({
  existsSync: jest.fn(),
  mkdirSync: jest.fn(),
  writeFileSync: jest.fn(),
}));

jest.mock('path', () => ({
  join: jest.fn((...args) => args.join('/')),
}));

describe('saveImage', () => {
  const mockPrisma = prisma as jest.Mocked<typeof prisma>;
  const mockUploadToBlob = uploadToBlobWithCheck as jest.MockedFunction<
    typeof uploadToBlobWithCheck
  >;
  const mockShouldUseBlobStorage = shouldUseBlobStorage as jest.MockedFunction<
    typeof shouldUseBlobStorage
  >;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('with blob storage', () => {
    beforeEach(() => {
      mockShouldUseBlobStorage.mockReturnValue(true);
    });

    it('should save image to blob storage', async () => {
      const imageId = 'test-image-1';
      const imageBuffer = Buffer.from('test image data');
      const blobUrl = 'https://blob.vercel-storage.com/test.jpg';
      const hash = 'test-hash';

      mockUploadToBlob.mockResolvedValue({
        url: blobUrl,
        hash,
      });
      mockPrisma.image.upsert.mockResolvedValue({
        imageId,
        blobUrl,
      } as any);

      const result = await saveImage(imageId, imageBuffer);

      expect(result).toBe(imageId);
      expect(mockUploadToBlob).toHaveBeenCalledWith(
        `uploads/${imageId}.webp`,
        imageBuffer,
        'image/webp',
        imageId,
        false
      );
      expect(mockPrisma.image.upsert).toHaveBeenCalled();
    });

    it('should save original image if provided', async () => {
      const imageId = 'test-image-2';
      const imageBuffer = Buffer.from('test image data');
      const originalBuffer = Buffer.from('original image data');
      const blobUrl = 'https://blob.vercel-storage.com/test.jpg';
      const originalBlobUrl = 'https://blob.vercel-storage.com/test-original.jpg';
      const hash = 'test-hash';
      const originalHash = 'original-hash';

      mockUploadToBlob
        .mockResolvedValueOnce({
          url: blobUrl,
          hash,
        })
        .mockResolvedValueOnce({
          url: originalBlobUrl,
          hash: originalHash,
        });
      mockPrisma.image.upsert.mockResolvedValue({
        imageId,
        blobUrl,
      } as any);

      const result = await saveImage(imageId, imageBuffer, originalBuffer);

      expect(result).toBe(imageId);
      expect(mockUploadToBlob).toHaveBeenCalledTimes(2);
      expect(mockUploadToBlob).toHaveBeenCalledWith(
        `uploads/${imageId}-ori.webp`,
        originalBuffer,
        'image/webp',
        imageId,
        true
      );
    });

    it('should handle blob upload errors', async () => {
      const imageId = 'test-image-3';
      const imageBuffer = Buffer.from('test image data');

      mockUploadToBlob.mockRejectedValue(new Error('Upload failed'));

      const result = await saveImage(imageId, imageBuffer);

      expect(result).toBeNull();
      expect(logger.error).toHaveBeenCalledWith(
        '[SAVE IMAGE] Erreur sauvegarde Blob:',
        expect.any(Error)
      );
    });

    it('should handle database errors gracefully', async () => {
      const imageId = 'test-image-4';
      const imageBuffer = Buffer.from('test image data');
      const blobUrl = 'https://blob.vercel-storage.com/test.jpg';
      const hash = 'test-hash';

      mockUploadToBlob.mockResolvedValue({
        url: blobUrl,
        hash,
      });
      mockPrisma.image.upsert.mockRejectedValue(new Error('Database error'));

      const result = await saveImage(imageId, imageBuffer);

      // Should still return imageId even if DB fails
      expect(result).toBe(imageId);
      expect(logger.warn).toHaveBeenCalledWith(
        '[SAVE IMAGE] Erreur lors du stockage des URLs blob dans la DB:',
        expect.any(Error)
      );
    });
  });

  describe('with local storage', () => {
    beforeEach(() => {
      mockShouldUseBlobStorage.mockReturnValue(false);
    });

    it('should save image locally', async () => {
      const imageId = 'test-image-5';
      const imageBuffer = Buffer.from('test image data');

      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (path.join as jest.Mock).mockImplementation((...args) => args.join('/'));

      const result = await saveImage(imageId, imageBuffer);

      expect(result).toBe(imageId);
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining(`${imageId}.webp`),
        imageBuffer
      );
      expect(logger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Image sauvegardée localement')
      );
    });

    it('should create uploads directory if it does not exist', async () => {
      const imageId = 'test-image-6';
      const imageBuffer = Buffer.from('test image data');

      (fs.existsSync as jest.Mock).mockReturnValue(false);
      (path.join as jest.Mock).mockImplementation((...args) => args.join('/'));

      await saveImage(imageId, imageBuffer);

      expect(fs.mkdirSync).toHaveBeenCalledWith(expect.stringContaining('public/uploads'), {
        recursive: true,
      });
    });

    it('should save original image if provided', async () => {
      const imageId = 'test-image-7';
      const imageBuffer = Buffer.from('test image data');
      const originalBuffer = Buffer.from('original image data');

      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (path.join as jest.Mock).mockImplementation((...args) => args.join('/'));

      await saveImage(imageId, imageBuffer, originalBuffer);

      expect(fs.writeFileSync).toHaveBeenCalledTimes(2);
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining(`${imageId}-ori.webp`),
        originalBuffer
      );
    });

    it('should use imageBuffer for original if originalBuffer not provided', async () => {
      const imageId = 'test-image-8';
      const imageBuffer = Buffer.from('test image data');

      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (path.join as jest.Mock).mockImplementation((...args) => args.join('/'));

      await saveImage(imageId, imageBuffer);

      // Should save both main and original (using imageBuffer)
      expect(fs.writeFileSync).toHaveBeenCalledTimes(2);
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining(`${imageId}-ori.webp`),
        imageBuffer
      );
    });

    it('should handle local save errors', async () => {
      const imageId = 'test-image-9';
      const imageBuffer = Buffer.from('test image data');

      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.writeFileSync as jest.Mock).mockImplementation(() => {
        throw new Error('Write failed');
      });

      const result = await saveImage(imageId, imageBuffer);

      expect(result).toBeNull();
      expect(logger.error).toHaveBeenCalledWith(
        '[SAVE IMAGE] Erreur sauvegarde locale:',
        expect.any(Error)
      );
    });
  });
});
