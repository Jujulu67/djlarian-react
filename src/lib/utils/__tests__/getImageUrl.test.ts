/**
 * Tests for getImageUrl
 */
import { getImageUrl, getOriginalImageUrl } from '../getImageUrl';

describe('getImageUrl', () => {
  it('should return null for null/undefined', () => {
    expect(getImageUrl(null)).toBeNull();
    expect(getImageUrl(undefined)).toBeNull();
  });

  it('should return URL for full HTTP URL', () => {
    const url = 'https://example.com/image.jpg';
    expect(getImageUrl(url)).toBe(url);
  });

  it('should use proxy for Google OAuth images', () => {
    const url = 'https://lh3.googleusercontent.com/image.jpg';
    const result = getImageUrl(url);
    expect(result).toContain('/api/images/proxy');
    expect(result).toContain(encodeURIComponent(url));
  });

  it('should return local path for /uploads/ paths', () => {
    const path = '/uploads/test.jpg';
    expect(getImageUrl(path)).toBe(path);
  });

  it('should add cache busting to local paths', () => {
    const path = '/uploads/test.jpg';
    const result = getImageUrl(path, { cacheBust: '123' });
    expect(result).toContain('t=123');
  });

  it('should generate API URL for UUID', () => {
    const uuid = '123e4567-e89b-12d3-a456-426614174000';
    const result = getImageUrl(uuid);
    expect(result).toBe(`/api/images/${uuid}`);
  });

  it('should add original parameter', () => {
    const uuid = '123e4567-e89b-12d3-a456-426614174000';
    const result = getImageUrl(uuid, { original: true });
    expect(result).toContain('original=true');
  });

  it('should combine original and cache busting', () => {
    const uuid = '123e4567-e89b-12d3-a456-426614174000';
    const result = getImageUrl(uuid, { original: true, cacheBust: '456' });
    expect(result).toContain('original=true');
    expect(result).toContain('t=456');
  });
});

describe('getOriginalImageUrl', () => {
  it('should return original image URL', () => {
    const uuid = '123e4567-e89b-12d3-a456-426614174000';
    const result = getOriginalImageUrl(uuid);
    expect(result).toContain('original=true');
  });

  it('should include cache busting', () => {
    const uuid = '123e4567-e89b-12d3-a456-426614174000';
    const result = getOriginalImageUrl(uuid, '789');
    expect(result).toContain('original=true');
    expect(result).toContain('t=789');
  });
});
