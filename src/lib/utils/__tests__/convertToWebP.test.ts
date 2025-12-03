/**
 * Tests for convertToWebP
 * @jest-environment node
 */
import sharp from 'sharp';

import { convertToWebP, canConvertToWebP } from '../convertToWebP';

// Mock sharp
jest.mock('sharp', () => {
  const mockSharp = jest.fn(() => ({
    webp: jest.fn().mockReturnThis(),
    toBuffer: jest.fn().mockResolvedValue(Buffer.from('webp-data')),
  }));
  return mockSharp;
});

jest.mock('@/lib/logger', () => ({
  logger: {
    debug: jest.fn(),
    error: jest.fn(),
  },
}));

describe('convertToWebP', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should convert Buffer to WebP', async () => {
    const buffer = Buffer.from('image-data');
    const result = await convertToWebP(buffer);

    expect(sharp).toHaveBeenCalledWith(buffer);
    expect(result).toBeInstanceOf(Buffer);
  });

  it('should convert ArrayBuffer to WebP', async () => {
    const arrayBuffer = new ArrayBuffer(8);
    const result = await convertToWebP(arrayBuffer);

    expect(result).toBeInstanceOf(Buffer);
  });

  it('should convert Uint8Array to WebP', async () => {
    const uint8Array = new Uint8Array([1, 2, 3]);
    const result = await convertToWebP(uint8Array);

    expect(result).toBeInstanceOf(Buffer);
  });

  it('should use custom quality', async () => {
    const buffer = Buffer.from('image-data');
    await convertToWebP(buffer, 80);

    expect(sharp).toHaveBeenCalled();
  });

  it('should throw error on conversion failure', async () => {
    (sharp as jest.Mock).mockImplementation(() => ({
      webp: jest.fn().mockReturnThis(),
      toBuffer: jest.fn().mockRejectedValue(new Error('Conversion failed')),
    }));

    const buffer = Buffer.from('image-data');
    await expect(convertToWebP(buffer)).rejects.toThrow('Erreur lors de la conversion');
  });
});

describe('canConvertToWebP', () => {
  it('should return true for supported image types', () => {
    expect(canConvertToWebP('image/jpeg')).toBe(true);
    expect(canConvertToWebP('image/png')).toBe(true);
    expect(canConvertToWebP('image/webp')).toBe(true);
  });

  it('should return false for unsupported types', () => {
    expect(canConvertToWebP('text/plain')).toBe(false);
    expect(canConvertToWebP('application/json')).toBe(false);
  });
});
