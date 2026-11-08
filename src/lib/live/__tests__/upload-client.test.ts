import { validateAudioFile, generateAudioFileId, uploadAudioFileToBlob } from '../upload-client';

// Mock @vercel/blob/client
jest.mock('@vercel/blob/client', () => ({
  upload: jest.fn(),
}));

import { upload } from '@vercel/blob/client';

describe('upload-client', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('validateAudioFile', () => {
    it.each([
      ['should validate valid MP3 file', 'test.mp3', 'audio/mpeg'],
      ['should validate valid WAV file', 'test.wav', 'audio/wav'],
      ['should accept audio/x-wav MIME type', 'test.wav', 'audio/x-wav'],
      ['should accept audio/wave MIME type', 'test.wav', 'audio/wave'],
    ])('%s', (_title, fileName, mimeType) => {
      const file = new File(['audio content'], fileName, { type: mimeType });
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
    const blobUrl =
      'https://abc123.public.blob.vercel-storage.com/live-audio/live-audio-user1-1700000000000-abc.mp3';

    it('should upload file successfully via client upload', async () => {
      const file = new File(['audio content'], 'test.mp3', { type: 'audio/mpeg' });
      (upload as jest.Mock).mockResolvedValueOnce({ url: blobUrl });

      const result = await uploadAudioFileToBlob(file, 'live-audio-user1-1700000000000-abc.mp3');

      expect(upload).toHaveBeenCalledWith(
        'live-audio/live-audio-user1-1700000000000-abc.mp3',
        file,
        expect.objectContaining({
          access: 'public',
          contentType: 'audio/mpeg',
          handleUploadUrl: '/api/live/submissions/upload-token',
        })
      );
      expect(result.url).toBe(blobUrl);
      expect(result.size).toBe(file.size);
    });

    it('should not pass any token to upload', async () => {
      const file = new File(['audio content'], 'test.mp3', { type: 'audio/mpeg' });
      (upload as jest.Mock).mockResolvedValueOnce({ url: blobUrl });

      await uploadAudioFileToBlob(file, 'test-id.mp3');

      expect((upload as jest.Mock).mock.calls[0][2]).not.toHaveProperty('token');
    });

    it('should handle upload failure', async () => {
      const file = new File(['audio content'], 'test.mp3', { type: 'audio/mpeg' });
      (upload as jest.Mock).mockRejectedValueOnce(new Error('Upload failed'));

      await expect(uploadAudioFileToBlob(file, 'test-id.mp3')).rejects.toThrow(
        "Erreur lors de l'upload vers Blob Storage"
      );
    });

    it('should use default content type if file type is missing', async () => {
      const file = new File(['audio content'], 'test.mp3', { type: '' });
      (upload as jest.Mock).mockResolvedValueOnce({ url: blobUrl });

      await uploadAudioFileToBlob(file, 'test-id.mp3');

      expect(upload).toHaveBeenCalledWith(
        'live-audio/test-id.mp3',
        file,
        expect.objectContaining({ contentType: 'audio/mpeg' })
      );
    });
  });
});
