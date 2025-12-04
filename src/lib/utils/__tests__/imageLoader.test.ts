import imageLoader from '../imageLoader';

describe('imageLoader', () => {
  it('should return external http URL as is', () => {
    const result = imageLoader({
      src: 'http://example.com/image.jpg',
      width: 800,
    });

    expect(result).toBe('http://example.com/image.jpg');
  });

  it('should return external https URL as is', () => {
    const result = imageLoader({
      src: 'https://example.com/image.jpg',
      width: 800,
    });

    expect(result).toBe('https://example.com/image.jpg');
  });

  it('should return API route as is', () => {
    const result = imageLoader({
      src: '/api/images/image-id',
      width: 800,
    });

    expect(result).toBe('/api/images/image-id');
  });

  it('should return uploads path as is', () => {
    const result = imageLoader({
      src: '/uploads/image.jpg',
      width: 800,
    });

    expect(result).toBe('/uploads/image.jpg');
  });

  it('should return images path as is', () => {
    const result = imageLoader({
      src: '/images/image.jpg',
      width: 800,
    });

    expect(result).toBe('/images/image.jpg');
  });

  it('should return any other path as is', () => {
    const result = imageLoader({
      src: '/some/path/image.jpg',
      width: 800,
    });

    expect(result).toBe('/some/path/image.jpg');
  });

  it('should ignore quality parameter', () => {
    const result = imageLoader({
      src: 'https://example.com/image.jpg',
      width: 800,
      quality: 90,
    });

    expect(result).toBe('https://example.com/image.jpg');
  });

  it('should ignore width parameter', () => {
    const result = imageLoader({
      src: 'https://example.com/image.jpg',
      width: 1200,
    });

    expect(result).toBe('https://example.com/image.jpg');
  });
});
