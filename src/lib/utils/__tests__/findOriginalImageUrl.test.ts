import { findOriginalImageUrl } from '../findOriginalImageUrl';
import * as getImageUrlModule from '../getImageUrl';

// Mock getImageUrl
jest.mock('../getImageUrl', () => ({
  getImageUrl: jest.fn(),
}));

// Mock global fetch
global.fetch = jest.fn();

describe('findOriginalImageUrl', () => {
  const mockGetImageUrl = getImageUrlModule.getImageUrl as jest.MockedFunction<
    typeof getImageUrlModule.getImageUrl
  >;
  const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('with original suffix', () => {
    it('should return URL when original image exists', async () => {
      const imageId = 'test-image';
      const expectedUrl = '/api/images/test-image?original=true';

      mockGetImageUrl.mockReturnValue(expectedUrl);
      mockFetch.mockResolvedValueOnce({ ok: true } as Response);

      const result = await findOriginalImageUrl(imageId);

      expect(mockGetImageUrl).toHaveBeenCalledWith(imageId, { original: true });
      expect(mockFetch).toHaveBeenCalledWith(expectedUrl, { method: 'HEAD' });
      expect(result).toBe(expectedUrl);
    });

    it('should fallback to non-original when original does not exist', async () => {
      const imageId = 'test-image';
      const originalUrl = '/api/images/test-image?original=true';
      const fallbackUrl = '/api/images/test-image';

      mockGetImageUrl.mockReturnValueOnce(originalUrl).mockReturnValueOnce(fallbackUrl);
      mockFetch
        .mockResolvedValueOnce({ ok: false } as Response)
        .mockResolvedValueOnce({ ok: true } as Response);

      const result = await findOriginalImageUrl(imageId);

      expect(mockGetImageUrl).toHaveBeenCalledWith(imageId, { original: true });
      expect(mockGetImageUrl).toHaveBeenCalledWith(imageId);
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(result).toBe(fallbackUrl);
    });

    it('should handle network errors gracefully', async () => {
      const imageId = 'test-image';
      const originalUrl = '/api/images/test-image?original=true';
      const fallbackUrl = '/api/images/test-image';

      mockGetImageUrl.mockReturnValueOnce(originalUrl).mockReturnValueOnce(fallbackUrl);
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ ok: true } as Response);

      const result = await findOriginalImageUrl(imageId);

      expect(result).toBe(fallbackUrl);
    });
  });

  describe('without original suffix', () => {
    it('should directly try non-original URL when withOriSuffix is false', async () => {
      const imageId = 'test-image';
      const expectedUrl = '/api/images/test-image';

      mockGetImageUrl.mockReturnValue(expectedUrl);
      mockFetch.mockResolvedValueOnce({ ok: true } as Response);

      const result = await findOriginalImageUrl(imageId, [], false);

      expect(mockGetImageUrl).toHaveBeenCalledWith(imageId);
      expect(mockGetImageUrl).not.toHaveBeenCalledWith(imageId, { original: true });
      expect(mockFetch).toHaveBeenCalledWith(expectedUrl, { method: 'HEAD' });
      expect(result).toBe(expectedUrl);
    });

    it('should return null when non-original image does not exist', async () => {
      const imageId = 'test-image';
      const expectedUrl = '/api/images/test-image';

      mockGetImageUrl.mockReturnValue(expectedUrl);
      mockFetch.mockResolvedValueOnce({ ok: false } as Response);

      const result = await findOriginalImageUrl(imageId, [], false);

      expect(result).toBeNull();
    });
  });

  describe('edge cases', () => {
    it('should return null when getImageUrl returns null', async () => {
      mockGetImageUrl.mockReturnValue(null);

      const result = await findOriginalImageUrl('test-image');

      expect(result).toBeNull();
    });

    it('should return null when all attempts fail', async () => {
      const imageId = 'test-image';
      const originalUrl = '/api/images/test-image?original=true';
      const fallbackUrl = '/api/images/test-image';

      mockGetImageUrl.mockReturnValueOnce(originalUrl).mockReturnValueOnce(fallbackUrl);
      mockFetch
        .mockResolvedValueOnce({ ok: false } as Response)
        .mockResolvedValueOnce({ ok: false } as Response);

      const result = await findOriginalImageUrl(imageId);

      expect(result).toBeNull();
    });

    it('should handle fetch rejections for both attempts', async () => {
      const imageId = 'test-image';
      const originalUrl = '/api/images/test-image?original=true';
      const fallbackUrl = '/api/images/test-image';

      mockGetImageUrl.mockReturnValueOnce(originalUrl).mockReturnValueOnce(fallbackUrl);
      mockFetch
        .mockRejectedValueOnce(new Error('Network error 1'))
        .mockRejectedValueOnce(new Error('Network error 2'));

      const result = await findOriginalImageUrl(imageId);

      expect(result).toBeNull();
    });

    it('should accept custom extensions parameter (legacy)', async () => {
      const imageId = 'test-image';
      const expectedUrl = '/api/images/test-image?original=true';
      const customExtensions = ['png', 'webp'];

      mockGetImageUrl.mockReturnValue(expectedUrl);
      mockFetch.mockResolvedValueOnce({ ok: true } as Response);

      const result = await findOriginalImageUrl(imageId, customExtensions);

      expect(result).toBe(expectedUrl);
    });
  });
});
