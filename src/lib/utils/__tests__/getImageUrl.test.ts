import { getImageUrl, getOriginalImageUrl } from '../getImageUrl';

describe('getImageUrl', () => {
  describe('with imageId as UUID', () => {
    it('should return API route for simple imageId', () => {
      const result = getImageUrl('abc-123-def');
      expect(result).toBe('/api/images/abc-123-def');
    });

    it('should return null for null imageId', () => {
      const result = getImageUrl(null);
      expect(result).toBeNull();
    });

    it('should return null for undefined imageId', () => {
      const result = getImageUrl(undefined);
      expect(result).toBeNull();
    });

    it('should return null for empty string', () => {
      const result = getImageUrl('');
      expect(result).toBeNull();
    });
  });

  describe('with full URL', () => {
    it('should return HTTP URL as-is', () => {
      const url = 'http://example.com/image.jpg';
      const result = getImageUrl(url);
      expect(result).toBe(url);
    });

    it('should return HTTPS URL as-is', () => {
      const url = 'https://example.com/image.jpg';
      const result = getImageUrl(url);
      expect(result).toBe(url);
    });

    it('should return blob URL as-is', () => {
      const url = 'https://xxx.public.blob.vercel-storage.com/uploads/abc-123.jpg';
      const result = getImageUrl(url);
      expect(result).toBe(url);
    });
  });

  describe('with options', () => {
    it('should add original parameter', () => {
      const result = getImageUrl('abc-123', { original: true });
      expect(result).toBe('/api/images/abc-123?original=true');
    });

    it('should add cache busting parameter', () => {
      const result = getImageUrl('abc-123', { cacheBust: 1234567890 });
      expect(result).toBe('/api/images/abc-123?t=1234567890');
    });

    it('should add both original and cache busting', () => {
      const result = getImageUrl('abc-123', {
        original: true,
        cacheBust: 1234567890,
      });
      expect(result).toBe('/api/images/abc-123?original=true&t=1234567890');
    });
  });
});

describe('getOriginalImageUrl', () => {
  it('should return URL with original parameter', () => {
    const result = getOriginalImageUrl('abc-123');
    expect(result).toBe('/api/images/abc-123?original=true');
  });

  it('should add cache busting if provided', () => {
    const result = getOriginalImageUrl('abc-123', 1234567890);
    expect(result).toBe('/api/images/abc-123?original=true&t=1234567890');
  });

  it('should return null for null imageId', () => {
    const result = getOriginalImageUrl(null);
    expect(result).toBeNull();
  });
});
