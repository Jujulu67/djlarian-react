import { getImageUrl, getOriginalImageUrl } from '../getImageUrl';

describe('getImageUrl', () => {
  it('should return null for null imageId', () => {
    expect(getImageUrl(null)).toBeNull();
  });

  it('should return null for undefined imageId', () => {
    expect(getImageUrl(undefined)).toBeNull();
  });

  it('should return null for empty string', () => {
    expect(getImageUrl('')).toBeNull();
  });

  it('should return API URL for UUID imageId', () => {
    const result = getImageUrl('123e4567-e89b-12d3-a456-426614174000');

    expect(result).toBe('/api/images/123e4567-e89b-12d3-a456-426614174000');
  });

  it('should add original parameter when requested', () => {
    const result = getImageUrl('image-id', { original: true });

    expect(result).toBe('/api/images/image-id?original=true');
  });

  it('should add cache busting parameter', () => {
    const result = getImageUrl('image-id', { cacheBust: '123456' });

    expect(result).toBe('/api/images/image-id?t=123456');
  });

  it('should add both original and cache busting parameters', () => {
    const result = getImageUrl('image-id', { original: true, cacheBust: '123456' });

    expect(result).toBe('/api/images/image-id?original=true&t=123456');
  });

  it('should return external http URL as is', () => {
    const result = getImageUrl('http://example.com/image.jpg');

    expect(result).toBe('http://example.com/image.jpg');
  });

  it('should return external https URL as is', () => {
    const result = getImageUrl('https://example.com/image.jpg');

    expect(result).toBe('https://example.com/image.jpg');
  });

  it('should use proxy for Google OAuth images', () => {
    const result = getImageUrl('https://lh3.googleusercontent.com/a-/AOh14Gi0XkYQ');

    expect(result).toBe(
      '/api/images/proxy?url=' +
        encodeURIComponent('https://lh3.googleusercontent.com/a-/AOh14Gi0XkYQ')
    );
  });

  it('should return local uploads path as is', () => {
    const result = getImageUrl('/uploads/image.jpg');

    expect(result).toBe('/uploads/image.jpg');
  });

  it('should return local images path as is', () => {
    const result = getImageUrl('/images/image.jpg');

    expect(result).toBe('/images/image.jpg');
  });

  it('should add cache busting to local paths', () => {
    const result = getImageUrl('/uploads/image.jpg', { cacheBust: '123456' });

    expect(result).toBe('/uploads/image.jpg?t=123456');
  });

  it('should add cache busting to local paths with existing query', () => {
    const result = getImageUrl('/uploads/image.jpg?existing=param', {
      cacheBust: '123456',
    });

    expect(result).toBe('/uploads/image.jpg?existing=param&t=123456');
  });
});

describe('getOriginalImageUrl', () => {
  it('should return original image URL', () => {
    const result = getOriginalImageUrl('image-id');

    expect(result).toBe('/api/images/image-id?original=true');
  });

  it('should include cache busting if provided', () => {
    const result = getOriginalImageUrl('image-id', '123456');

    expect(result).toBe('/api/images/image-id?original=true&t=123456');
  });

  it('should return null for null imageId', () => {
    expect(getOriginalImageUrl(null)).toBeNull();
  });
});
