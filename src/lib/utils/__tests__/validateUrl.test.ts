import { isValidUrl, sanitizeUrl } from '../validateUrl';

describe('validateUrl', () => {
  describe('isValidUrl', () => {
    it('should return true for valid http URL', () => {
      expect(isValidUrl('http://example.com')).toBe(true);
    });

    it('should return true for valid https URL', () => {
      expect(isValidUrl('https://example.com')).toBe(true);
    });

    it('should return false for invalid URL', () => {
      expect(isValidUrl('not-a-url')).toBe(false);
      expect(isValidUrl('ftp://example.com')).toBe(false);
    });

    it('should allow empty string when allowEmpty is true (default)', () => {
      expect(isValidUrl('')).toBe(true);
      expect(isValidUrl(null)).toBe(true);
      expect(isValidUrl(undefined)).toBe(true);
    });

    it('should not allow empty string when allowEmpty is false', () => {
      expect(isValidUrl('', false)).toBe(false);
      expect(isValidUrl(null, false)).toBe(false);
      expect(isValidUrl(undefined, false)).toBe(false);
    });

    it('should handle URLs with paths', () => {
      expect(isValidUrl('https://example.com/path/to/page')).toBe(true);
    });

    it('should handle URLs with query parameters', () => {
      expect(isValidUrl('https://example.com?param=value')).toBe(true);
    });

    it('should handle URLs with fragments', () => {
      expect(isValidUrl('https://example.com#section')).toBe(true);
    });

    it('should return false for non-http protocols', () => {
      expect(isValidUrl('ftp://example.com')).toBe(false);
      expect(isValidUrl('file:///path/to/file')).toBe(false);
    });
  });

  describe('sanitizeUrl', () => {
    it('should return valid URL as is', () => {
      expect(sanitizeUrl('https://example.com')).toBe('https://example.com');
      expect(sanitizeUrl('http://example.com')).toBe('http://example.com');
    });

    it('should return null for empty string', () => {
      expect(sanitizeUrl('')).toBeNull();
      expect(sanitizeUrl(null)).toBeNull();
      expect(sanitizeUrl(undefined)).toBeNull();
    });

    it('should add https:// prefix if missing', () => {
      expect(sanitizeUrl('example.com')).toBe('https://example.com');
      expect(sanitizeUrl('www.example.com')).toBe('https://www.example.com');
    });

    it('should not add prefix if http:// already present', () => {
      expect(sanitizeUrl('http://example.com')).toBe('http://example.com');
    });

    it('should not add prefix if https:// already present', () => {
      expect(sanitizeUrl('https://example.com')).toBe('https://example.com');
    });

    it('should trim whitespace', () => {
      expect(sanitizeUrl('  https://example.com  ')).toBe('https://example.com');
    });

    it('should return null for invalid URL even with prefix', () => {
      expect(sanitizeUrl('not a url')).toBeNull();
      expect(sanitizeUrl('://invalid')).toBeNull();
    });

    it('should handle URLs with paths', () => {
      expect(sanitizeUrl('example.com/path')).toBe('https://example.com/path');
    });
  });
});
