import { convertToWebP, canConvertToWebP } from '../convertToWebP';
import sharp from 'sharp';
import { logger } from '@/lib/logger';

// Mock sharp
jest.mock('sharp', () => {
  const mockSharp = jest.fn(() => ({
    webp: jest.fn().mockReturnThis(),
    toBuffer: jest.fn().mockResolvedValue(Buffer.from('webp-data')),
  }));
  return jest.fn(() => mockSharp());
});

// Mock logger
jest.mock('@/lib/logger', () => ({
  logger: {
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  },
}));

describe('convertToWebP', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('convertToWebP', () => {
    it('should convert Buffer to WebP', async () => {
      const inputBuffer = Buffer.from('test image data');
      const result = await convertToWebP(inputBuffer);

      expect(sharp).toHaveBeenCalledWith(inputBuffer);
      expect(result).toBeInstanceOf(Buffer);
      expect(logger.debug).toHaveBeenCalled();
    });

    it('should convert ArrayBuffer to WebP', async () => {
      const arrayBuffer = new ArrayBuffer(10);
      const result = await convertToWebP(arrayBuffer);

      expect(result).toBeInstanceOf(Buffer);
      expect(logger.debug).toHaveBeenCalled();
    });

    it('should convert Uint8Array to WebP', async () => {
      const uint8Array = new Uint8Array([1, 2, 3, 4, 5]);
      const result = await convertToWebP(uint8Array);

      expect(result).toBeInstanceOf(Buffer);
      expect(logger.debug).toHaveBeenCalled();
    });

    it('should use custom quality', async () => {
      const inputBuffer = Buffer.from('test image data');
      const mockSharpInstance = {
        webp: jest.fn().mockReturnThis(),
        toBuffer: jest.fn().mockResolvedValue(Buffer.from('webp-data')),
      };
      (sharp as jest.Mock).mockReturnValue(mockSharpInstance);

      await convertToWebP(inputBuffer, 75);

      expect(mockSharpInstance.webp).toHaveBeenCalledWith({
        quality: 75,
        effort: 4,
      });
    });

    it('should use default quality of 90', async () => {
      const inputBuffer = Buffer.from('test image data');
      const mockSharpInstance = {
        webp: jest.fn().mockReturnThis(),
        toBuffer: jest.fn().mockResolvedValue(Buffer.from('webp-data')),
      };
      (sharp as jest.Mock).mockReturnValue(mockSharpInstance);

      await convertToWebP(inputBuffer);

      expect(mockSharpInstance.webp).toHaveBeenCalledWith({
        quality: 90,
        effort: 4,
      });
    });

    it('should handle conversion errors', async () => {
      const inputBuffer = Buffer.from('test image data');
      const error = new Error('Conversion failed');
      const mockSharpInstance = {
        webp: jest.fn().mockReturnThis(),
        toBuffer: jest.fn().mockRejectedValue(error),
      };
      (sharp as jest.Mock).mockReturnValue(mockSharpInstance);

      await expect(convertToWebP(inputBuffer)).rejects.toThrow(
        "Erreur lors de la conversion de l'image en WebP"
      );
      expect(logger.error).toHaveBeenCalledWith(
        '[WEBP] Erreur lors de la conversion en WebP:',
        error
      );
    });

    it('should log conversion statistics', async () => {
      const inputBuffer = Buffer.from('test image data');
      const webpBuffer = Buffer.from('webp');
      const mockSharpInstance = {
        webp: jest.fn().mockReturnThis(),
        toBuffer: jest.fn().mockResolvedValue(webpBuffer),
      };
      (sharp as jest.Mock).mockReturnValue(mockSharpInstance);

      await convertToWebP(inputBuffer);

      expect(logger.debug).toHaveBeenCalledWith(
        expect.stringContaining('[WEBP] Conversion réussie')
      );
    });
  });

  describe('canConvertToWebP', () => {
    it('should return true for supported image types', () => {
      expect(canConvertToWebP('image/jpeg')).toBe(true);
      expect(canConvertToWebP('image/jpg')).toBe(true);
      expect(canConvertToWebP('image/png')).toBe(true);
      expect(canConvertToWebP('image/gif')).toBe(true);
      expect(canConvertToWebP('image/tiff')).toBe(true);
      expect(canConvertToWebP('image/bmp')).toBe(true);
      expect(canConvertToWebP('image/webp')).toBe(true);
    });

    it('should return false for unsupported types', () => {
      expect(canConvertToWebP('image/svg+xml')).toBe(false);
      expect(canConvertToWebP('application/pdf')).toBe(false);
      expect(canConvertToWebP('text/plain')).toBe(false);
    });

    it('should be case insensitive', () => {
      expect(canConvertToWebP('IMAGE/JPEG')).toBe(true);
      expect(canConvertToWebP('Image/Png')).toBe(true);
    });
  });
});
