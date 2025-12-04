import { uploadAudioFile, deleteAudioFile } from '../upload';
import { uploadToBlob } from '@/lib/blob';
import { logger } from '@/lib/logger';
import { shouldUseBlobStorage } from '@/lib/utils/getStorageConfig';

// Mock dependencies
jest.mock('@/lib/blob', () => ({
  uploadToBlob: jest.fn(),
  deleteFromBlob: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('@/lib/utils/getStorageConfig', () => ({
  shouldUseBlobStorage: jest.fn(),
}));

jest.mock('fs', () => ({
  existsSync: jest.fn(),
  mkdirSync: jest.fn(),
  writeFileSync: jest.fn(),
  unlinkSync: jest.fn(),
}));

jest.mock('path', () => ({
  join: jest.fn((...args) => args.join('/')),
  basename: jest.fn((path) => path.split('/').pop()),
}));

import fs from 'fs';
import path from 'path';

// Helper to create a mock File with arrayBuffer method
function createMockFile(content: string, name: string, type: string): File {
  const buffer = Buffer.from(content);
  const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);

  return {
    name,
    type,
    size: buffer.length,
    arrayBuffer: async () => arrayBuffer,
  } as File;
}

describe('upload (server)', () => {
  const originalCwd = process.cwd;

  beforeEach(() => {
    jest.clearAllMocks();
    process.cwd = jest.fn(() => '/test/project');
  });

  afterEach(() => {
    process.cwd = originalCwd;
  });

  describe('uploadAudioFile', () => {
    it('should upload to blob storage when configured', async () => {
      (shouldUseBlobStorage as jest.Mock).mockReturnValue(true);
      (uploadToBlob as jest.Mock).mockResolvedValue('https://blob.vercel-storage.com/test.mp3');

      const file = createMockFile('audio content', 'test.mp3', 'audio/mpeg');
      const result = await uploadAudioFile(file, 'test-id.mp3', 'user-1');

      expect(uploadToBlob).toHaveBeenCalledWith(
        'live-audio/test-id.mp3',
        expect.any(Buffer),
        'audio/mpeg'
      );
      expect(result.url).toBe('https://blob.vercel-storage.com/test.mp3');
      expect(result.size).toBeGreaterThan(0);
    });

    it('should upload locally when blob storage is not configured', async () => {
      (shouldUseBlobStorage as jest.Mock).mockReturnValue(false);
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.writeFileSync as jest.Mock).mockImplementation(() => {});

      const file = createMockFile('audio content', 'test.mp3', 'audio/mpeg');
      const result = await uploadAudioFile(file, 'test-id.mp3', 'user-1');

      expect(fs.existsSync).toHaveBeenCalled();
      expect(fs.writeFileSync).toHaveBeenCalled();
      expect(result.url).toBe('/uploads/live-audio/test-id.mp3');
      expect(result.size).toBeGreaterThan(0);
    });

    it('should create directory if it does not exist', async () => {
      (shouldUseBlobStorage as jest.Mock).mockReturnValue(false);
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      (fs.mkdirSync as jest.Mock).mockImplementation(() => {});
      (fs.writeFileSync as jest.Mock).mockImplementation(() => {});

      const file = createMockFile('audio content', 'test.mp3', 'audio/mpeg');
      await uploadAudioFile(file, 'test-id.mp3', 'user-1');

      expect(fs.mkdirSync).toHaveBeenCalledWith(expect.any(String), { recursive: true });
    });

    it('should use default content type when file type is missing', async () => {
      (shouldUseBlobStorage as jest.Mock).mockReturnValue(true);
      (uploadToBlob as jest.Mock).mockResolvedValue('https://blob.vercel-storage.com/test.mp3');

      const file = createMockFile('audio content', 'test.mp3', '');
      await uploadAudioFile(file, 'test-id.mp3', 'user-1');

      expect(uploadToBlob).toHaveBeenCalledWith(
        'live-audio/test-id.mp3',
        expect.any(Buffer),
        'audio/mpeg'
      );
    });

    it('should handle blob upload errors', async () => {
      (shouldUseBlobStorage as jest.Mock).mockReturnValue(true);
      (uploadToBlob as jest.Mock).mockRejectedValue(new Error('Blob error'));

      const file = createMockFile('audio content', 'test.mp3', 'audio/mpeg');

      await expect(uploadAudioFile(file, 'test-id.mp3', 'user-1')).rejects.toThrow(
        "Erreur lors de l'upload vers Blob Storage"
      );
      expect(logger.error).toHaveBeenCalled();
    });

    it('should handle local upload errors', async () => {
      (shouldUseBlobStorage as jest.Mock).mockReturnValue(false);
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.writeFileSync as jest.Mock).mockImplementation(() => {
        throw new Error('Write error');
      });

      const file = createMockFile('audio content', 'test.mp3', 'audio/mpeg');

      await expect(uploadAudioFile(file, 'test-id.mp3', 'user-1')).rejects.toThrow(
        "Erreur lors de l'upload local"
      );
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('deleteAudioFile', () => {
    it('should delete from blob storage when configured', async () => {
      (shouldUseBlobStorage as jest.Mock).mockReturnValue(true);
      const { deleteFromBlob } = await import('@/lib/blob');
      (deleteFromBlob as jest.Mock).mockResolvedValue(undefined);

      await deleteAudioFile('https://blob.vercel-storage.com/test.mp3');

      expect(deleteFromBlob).toHaveBeenCalledWith('https://blob.vercel-storage.com/test.mp3');
    });

    it('should delete locally when blob storage is not configured', async () => {
      (shouldUseBlobStorage as jest.Mock).mockReturnValue(false);
      (path.basename as jest.Mock).mockReturnValue('test.mp3');
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.unlinkSync as jest.Mock).mockImplementation(() => {});

      await deleteAudioFile('/uploads/live-audio/test.mp3');

      expect(fs.existsSync).toHaveBeenCalled();
      expect(fs.unlinkSync).toHaveBeenCalled();
    });

    it('should not throw if file does not exist locally', async () => {
      (shouldUseBlobStorage as jest.Mock).mockReturnValue(false);
      (path.basename as jest.Mock).mockReturnValue('test.mp3');
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      await deleteAudioFile('/uploads/live-audio/test.mp3');

      expect(fs.unlinkSync).not.toHaveBeenCalled();
    });

    it('should handle blob deletion errors gracefully', async () => {
      (shouldUseBlobStorage as jest.Mock).mockReturnValue(true);
      const { deleteFromBlob } = await import('@/lib/blob');
      (deleteFromBlob as jest.Mock).mockRejectedValue(new Error('Delete error'));

      // Should not throw
      await deleteAudioFile('https://blob.vercel-storage.com/test.mp3');

      expect(logger.error).toHaveBeenCalled();
    });

    it('should handle local deletion errors gracefully', async () => {
      (shouldUseBlobStorage as jest.Mock).mockReturnValue(false);
      (path.basename as jest.Mock).mockReturnValue('test.mp3');
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.unlinkSync as jest.Mock).mockImplementation(() => {
        throw new Error('Delete error');
      });

      // Should not throw
      await deleteAudioFile('/uploads/live-audio/test.mp3');

      expect(logger.error).toHaveBeenCalled();
    });
  });
});
