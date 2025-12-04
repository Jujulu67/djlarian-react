import { findOriginalImageUrl } from '../findOriginalImageUrl';
import { getImageUrl } from '../getImageUrl';

// Mock getImageUrl
jest.mock('../getImageUrl', () => ({
  getImageUrl: jest.fn(),
}));

// Mock global fetch
global.fetch = jest.fn();

describe('findOriginalImageUrl', () => {
  const mockGetImageUrl = getImageUrl as jest.MockedFunction<typeof getImageUrl>;
  const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset mock implementations
    mockGetImageUrl.mockReset();
    mockFetch.mockReset();
  });

  it('should return original URL if available', async () => {
    mockGetImageUrl
      .mockReturnValueOnce('/api/images/image-id?original=true')
      .mockReturnValueOnce('/api/images/image-id');
    mockFetch.mockResolvedValueOnce({
      ok: true,
    } as Response);

    const result = await findOriginalImageUrl('image-id');

    expect(result).toBe('/api/images/image-id?original=true');
    expect(mockGetImageUrl).toHaveBeenCalledWith('image-id', { original: true });
    expect(mockFetch).toHaveBeenCalledWith('/api/images/image-id?original=true', {
      method: 'HEAD',
    });
  });

  it('should fallback to regular URL if original fetch fails', async () => {
    // Configure getImageUrl to return different values for different calls
    mockGetImageUrl
      .mockReturnValueOnce('/api/images/image-id?original=true') // First call with original: true
      .mockReturnValueOnce('/api/images/image-id'); // Second call without original
    // Original fetch fails (ok: false means the resource doesn't exist)
    mockFetch
      .mockResolvedValueOnce({
        ok: false,
        status: 404,
      } as Response)
      // Fallback fetch succeeds
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
      } as Response);

    const result = await findOriginalImageUrl('image-id');

    expect(result).toBe('/api/images/image-id');
    expect(mockGetImageUrl).toHaveBeenCalledTimes(2);
    expect(mockGetImageUrl).toHaveBeenNthCalledWith(1, 'image-id', { original: true });
    expect(mockGetImageUrl).toHaveBeenNthCalledWith(2, 'image-id');
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('should return null if both URLs fail', async () => {
    mockGetImageUrl
      .mockReturnValueOnce('/api/images/image-id?original=true')
      .mockReturnValueOnce('/api/images/image-id');
    mockFetch
      .mockResolvedValueOnce({
        ok: false,
      } as Response)
      .mockResolvedValueOnce({
        ok: false,
      } as Response);

    const result = await findOriginalImageUrl('image-id');

    expect(result).toBeNull();
  });

  it('should skip original check if withOriSuffix is false', async () => {
    mockGetImageUrl.mockReturnValueOnce('/api/images/image-id');
    mockFetch.mockResolvedValueOnce({
      ok: true,
    } as Response);

    const result = await findOriginalImageUrl('image-id', ['jpg'], false);

    expect(result).toBe('/api/images/image-id');
    expect(mockGetImageUrl).toHaveBeenCalledWith('image-id');
    expect(mockGetImageUrl).not.toHaveBeenCalledWith('image-id', {
      original: true,
    });
  });

  it('should handle fetch errors gracefully and use fallback', async () => {
    // Configure getImageUrl to return different values for different calls
    mockGetImageUrl
      .mockReturnValueOnce('/api/images/image-id?original=true') // First call with original: true
      .mockReturnValueOnce('/api/images/image-id'); // Second call without original
    // Original fetch throws error
    mockFetch
      .mockRejectedValueOnce(new Error('Network error'))
      // Fallback fetch succeeds
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
      } as Response);

    const result = await findOriginalImageUrl('image-id');

    expect(result).toBe('/api/images/image-id');
    expect(mockGetImageUrl).toHaveBeenCalledTimes(2);
    expect(mockGetImageUrl).toHaveBeenNthCalledWith(1, 'image-id', { original: true });
    expect(mockGetImageUrl).toHaveBeenNthCalledWith(2, 'image-id');
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('should return null if getImageUrl returns null', async () => {
    mockGetImageUrl.mockReturnValue(null);

    const result = await findOriginalImageUrl('image-id');

    expect(result).toBeNull();
  });
});
