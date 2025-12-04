import { validateAudioFile, generateAudioFileId, uploadAudioFileToBlob } from '../upload-client';

// Mock @vercel/blob
jest.mock('@vercel/blob', () => ({
  put: jest.fn(),
}));

// Mock fetch
global.fetch = jest.fn();

describe('upload-client', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('validateAudioFile', () => {
    it('should validate valid MP3 file', () => {
      const file = new File(['audio content'], 'test.mp3', { type: 'audio/mpeg' });
      const result = validateAudioFile(file);
      expect(result.valid).toBe(true);
    });

    it('should validate valid WAV file', () => {
      const file = new File(['audio content'], 'test.wav', { type: 'audio/wav' });
      const result = validateAudioFile(file);
      expect(result.valid).toBe(true);
    });

    it('should reject invalid MIME type', () => {
      const file = new File(['content'], 'test.mp3', { type: 'image/png' });
      const result = validateAudioFile(file);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('MP3 ou WAV');
    });

    it('should reject file that is too large', () => {
      const largeFile = new File([new ArrayBuffer(129 * 1024 * 1024)], 'test.mp3', {
        type: 'audio/mpeg',
      });
      const result = validateAudioFile(largeFile);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('trop volumineux');
    });

    it('should reject file with invalid extension', () => {
      const file = new File(['content'], 'test.txt', { type: 'audio/mpeg' });
      const result = validateAudioFile(file);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('extension');
    });

    it('should accept audio/x-wav MIME type', () => {
      const file = new File(['content'], 'test.wav', { type: 'audio/x-wav' });
      const result = validateAudioFile(file);
      expect(result.valid).toBe(true);
    });

    it('should accept audio/wave MIME type', () => {
      const file = new File(['content'], 'test.wav', { type: 'audio/wave' });
      const result = validateAudioFile(file);
      expect(result.valid).toBe(true);
    });
  });

  describe('generateAudioFileId', () => {
    it('should generate ID with MP3 extension', () => {
      const id = generateAudioFileId('user-123', 'test.mp3');
      expect(id).toContain('live-audio');
      expect(id).toContain('user-123');
      expect(id).toContain('.mp3');
    });

    it('should generate ID with WAV extension', () => {
      const id = generateAudioFileId('user-123', 'test.wav');
      expect(id).toContain('live-audio');
      expect(id).toContain('user-123');
      expect(id).toContain('.wav');
    });

    it('should generate unique IDs', () => {
      const id1 = generateAudioFileId('user-123', 'test.mp3');
      const id2 = generateAudioFileId('user-123', 'test.mp3');
      expect(id1).not.toBe(id2);
    });

    it('should include timestamp in ID', () => {
      const before = Date.now();
      const id = generateAudioFileId('user-123', 'test.mp3');
      const after = Date.now();
      // Extract timestamp from ID format: live-audio-user-123-TIMESTAMP-random.ext
      const parts = id.split('-');
      // Find the timestamp part (should be after user ID and before random string)
      const timestampIndex = parts.findIndex((part, idx) => {
        // The timestamp should be a long number (13 digits typically)
        return idx > 2 && /^\d{10,}$/.test(part);
      });
      expect(timestampIndex).toBeGreaterThan(-1);
      if (timestampIndex > -1) {
        const timestamp = parseInt(parts[timestampIndex], 10);
        expect(timestamp).toBeGreaterThanOrEqual(before);
        expect(timestamp).toBeLessThanOrEqual(after);
      }
    });
  });

  describe('uploadAudioFileToBlob', () => {
    it('should upload file successfully', async () => {
      const file = new File(['audio content'], 'test.mp3', { type: 'audio/mpeg' });
      const mockToken = 'test-token';
      const mockBlobUrl = 'https://blob.vercel-storage.com/test.mp3';

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ token: mockToken }),
      });

      const { put } = require('@vercel/blob');
      (put as jest.Mock).mockResolvedValueOnce({
        url: mockBlobUrl,
      });

      const result = await uploadAudioFileToBlob(file, 'test-id.mp3');

      expect(global.fetch).toHaveBeenCalledWith('/api/live/submissions/upload-token');
      expect(put).toHaveBeenCalledWith(
        'live-audio/test-id.mp3',
        file,
        expect.objectContaining({
          access: 'public',
          contentType: 'audio/mpeg',
          token: mockToken,
        })
      );
      expect(result.url).toBe(mockBlobUrl);
      expect(result.size).toBe(file.size);
    });

    it('should handle token fetch failure', async () => {
      const file = new File(['audio content'], 'test.mp3', { type: 'audio/mpeg' });

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
      });

      await expect(uploadAudioFileToBlob(file, 'test-id.mp3')).rejects.toThrow(
        "Erreur lors de l'upload vers Blob Storage"
      );
    });

    it('should handle missing token', async () => {
      const file = new File(['audio content'], 'test.mp3', { type: 'audio/mpeg' });

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      await expect(uploadAudioFileToBlob(file, 'test-id.mp3')).rejects.toThrow(
        "Erreur lors de l'upload vers Blob Storage"
      );
    });

    it('should handle blob upload failure', async () => {
      const file = new File(['audio content'], 'test.mp3', { type: 'audio/mpeg' });
      const mockToken = 'test-token';

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ token: mockToken }),
      });

      const { put } = require('@vercel/blob');
      (put as jest.Mock).mockRejectedValueOnce(new Error('Upload failed'));

      await expect(uploadAudioFileToBlob(file, 'test-id.mp3')).rejects.toThrow(
        "Erreur lors de l'upload vers Blob Storage"
      );
    });

    it('should use default content type if file type is missing', async () => {
      const file = new File(['audio content'], 'test.mp3', { type: '' });
      const mockToken = 'test-token';
      const mockBlobUrl = 'https://blob.vercel-storage.com/test.mp3';

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ token: mockToken }),
      });

      const { put } = require('@vercel/blob');
      (put as jest.Mock).mockResolvedValueOnce({
        url: mockBlobUrl,
      });

      await uploadAudioFileToBlob(file, 'test-id.mp3');

      expect(put).toHaveBeenCalledWith(
        'live-audio/test-id.mp3',
        file,
        expect.objectContaining({
          contentType: 'audio/mpeg',
        })
      );
    });
  });
});
