import imageLoader from '../imageLoader';

describe('imageLoader', () => {
  const defaultParams = {
    width: 800,
    quality: 75,
  };

  describe('external URLs', () => {
    it('should return http URLs unchanged', () => {
      const src = 'http://example.com/image.jpg';
      const result = imageLoader({ src, ...defaultParams });
      expect(result).toBe(src);
    });

    it('should return https URLs unchanged', () => {
      const src = 'https://example.com/image.jpg';
      const result = imageLoader({ src, ...defaultParams });
      expect(result).toBe(src);
    });

    it('should handle URLs with query parameters', () => {
      const src = 'https://example.com/image.jpg?size=large';
      const result = imageLoader({ src, ...defaultParams });
      expect(result).toBe(src);
    });

    it('should handle URLs with fragments', () => {
      const src = 'https://example.com/image.jpg#section';
      const result = imageLoader({ src, ...defaultParams });
      expect(result).toBe(src);
    });
  });

  describe('API routes', () => {
    it('should return API routes unchanged', () => {
      const src = '/api/images/test-image';
      const result = imageLoader({ src, ...defaultParams });
      expect(result).toBe(src);
    });

    it('should handle API routes with query parameters', () => {
      const src = '/api/images/test-image?original=true';
      const result = imageLoader({ src, ...defaultParams });
      expect(result).toBe(src);
    });

    it('should handle nested API routes', () => {
      const src = '/api/images/subfolder/test-image';
      const result = imageLoader({ src, ...defaultParams });
      expect(result).toBe(src);
    });
  });

  describe('local uploads', () => {
    it('should return /uploads/ paths unchanged', () => {
      const src = '/uploads/image.jpg';
      const result = imageLoader({ src, ...defaultParams });
      expect(result).toBe(src);
    });

    it('should handle nested uploads paths', () => {
      const src = '/uploads/subfolder/image.jpg';
      const result = imageLoader({ src, ...defaultParams });
      expect(result).toBe(src);
    });

    it('should return /images/ paths unchanged', () => {
      const src = '/images/logo.png';
      const result = imageLoader({ src, ...defaultParams });
      expect(result).toBe(src);
    });

    it('should handle nested images paths', () => {
      const src = '/images/icons/star.svg';
      const result = imageLoader({ src, ...defaultParams });
      expect(result).toBe(src);
    });
  });

  describe('other paths', () => {
    it('should return other paths unchanged', () => {
      const src = '/static/image.jpg';
      const result = imageLoader({ src, ...defaultParams });
      expect(result).toBe(src);
    });

    it('should handle root-level paths', () => {
      const src = '/favicon.ico';
      const result = imageLoader({ src, ...defaultParams });
      expect(result).toBe(src);
    });

    it('should handle relative paths', () => {
      const src = 'relative/image.jpg';
      const result = imageLoader({ src, ...defaultParams });
      expect(result).toBe(src);
    });
  });

  describe('parameters', () => {
    it('should ignore width parameter', () => {
      const src = '/uploads/image.jpg';
      const result1 = imageLoader({ src, width: 400, quality: 75 });
      const result2 = imageLoader({ src, width: 800, quality: 75 });
      expect(result1).toBe(result2);
      expect(result1).toBe(src);
    });

    it('should ignore quality parameter', () => {
      const src = '/uploads/image.jpg';
      const result1 = imageLoader({ src, width: 800, quality: 50 });
      const result2 = imageLoader({ src, width: 800, quality: 100 });
      expect(result1).toBe(result2);
      expect(result1).toBe(src);
    });

    it('should work without quality parameter', () => {
      const src = '/uploads/image.jpg';
      const result = imageLoader({ src, width: 800 });
      expect(result).toBe(src);
    });
  });

  describe('edge cases', () => {
    it('should handle empty string', () => {
      const src = '';
      const result = imageLoader({ src, ...defaultParams });
      expect(result).toBe('');
    });

    it('should handle data URLs', () => {
      const src =
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      const result = imageLoader({ src, ...defaultParams });
      expect(result).toBe(src);
    });

    it('should handle blob URLs', () => {
      const src = 'blob:http://localhost:3000/abc-123';
      const result = imageLoader({ src, ...defaultParams });
      expect(result).toBe(src);
    });

    it('should be case sensitive for protocol', () => {
      const src = 'HTTP://example.com/image.jpg';
      const result = imageLoader({ src, ...defaultParams });
      // Should not match http:// (case sensitive)
      expect(result).toBe(src);
    });

    it('should handle paths with special characters', () => {
      const src = '/uploads/image%20with%20spaces.jpg';
      const result = imageLoader({ src, ...defaultParams });
      expect(result).toBe(src);
    });
  });
});
