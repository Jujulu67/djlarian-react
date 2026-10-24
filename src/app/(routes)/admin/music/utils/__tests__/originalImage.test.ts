import { getImageUrl } from '@/lib/utils/getImageUrl';

import { fetchOriginalImage, getOriginalImageExtension } from '../originalImage';

jest.mock('@/lib/utils/getImageUrl', () => ({
  getImageUrl: jest.fn(() => '/api/images/img-1/original'),
}));

describe('getOriginalImageExtension', () => {
  it('detects png', () => {
    expect(getOriginalImageExtension('image/png')).toBe('png');
  });

  it('detects jpeg and jpg', () => {
    expect(getOriginalImageExtension('image/jpeg')).toBe('jpg');
    expect(getOriginalImageExtension('image/jpg')).toBe('jpg');
  });

  it('falls back to webp', () => {
    expect(getOriginalImageExtension('image/webp')).toBe('webp');
    expect(getOriginalImageExtension('application/octet-stream')).toBe('webp');
  });
});

describe('fetchOriginalImage', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  it('returns a File named after the content type extension', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      blob: async () => new Blob(['data'], { type: 'image/png' }),
      headers: new Headers({ 'content-type': 'image/png' }),
    }) as unknown as typeof fetch;

    const file = await fetchOriginalImage('img-1');

    expect(getImageUrl).toHaveBeenCalledWith('img-1', { original: true });
    expect(global.fetch).toHaveBeenCalledWith('/api/images/img-1/original');
    expect(file).toBeInstanceOf(File);
    expect(file?.name).toBe('original.png');
  });

  it('returns null when the image is not found', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false }) as unknown as typeof fetch;

    await expect(fetchOriginalImage('img-1')).resolves.toBeNull();
  });

  it('returns null when the request fails', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('network')) as unknown as typeof fetch;

    await expect(fetchOriginalImage('img-1')).resolves.toBeNull();
  });

  it('returns null without fetching when no url can be built', async () => {
    (getImageUrl as jest.Mock).mockReturnValueOnce(null);
    global.fetch = jest.fn() as unknown as typeof fetch;

    await expect(fetchOriginalImage('img-1')).resolves.toBeNull();
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
