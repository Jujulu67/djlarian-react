/**
 * Tests for validateUrl
 */
import { isValidUrl, sanitizeUrl } from '../validateUrl';

describe('validateUrl', () => {
  describe('isValidUrl', () => {
    it('should return true for valid https URL', () => {
      expect(isValidUrl('https://example.com')).toBe(true);
    });

    it('should return true for valid http URL', () => {
      expect(isValidUrl('http://example.com')).toBe(true);
    });

    it('should return false for invalid URL', () => {
      expect(isValidUrl('not-a-url')).toBe(false);
    });

    it('should return false for URL with invalid protocol', () => {
      expect(isValidUrl('ftp://example.com')).toBe(false);
    });

    it('should return true for empty string when allowEmpty is true', () => {
      expect(isValidUrl('', true)).toBe(true);
    });

    it('should return true for null when allowEmpty is true', () => {
      expect(isValidUrl(null, true)).toBe(true);
    });

    it('should return false for empty string when allowEmpty is false', () => {
      expect(isValidUrl('', false)).toBe(false);
    });

    it('should return false for null when allowEmpty is false', () => {
      expect(isValidUrl(null, false)).toBe(false);
    });
  });

  describe('sanitizeUrl', () => {
    it('should return URL as-is if valid', () => {
      expect(sanitizeUrl('https://example.com')).toBe('https://example.com');
    });

    it('should return null for empty string', () => {
      expect(sanitizeUrl('')).toBe(null);
    });

    it('should return null for null', () => {
      expect(sanitizeUrl(null)).toBe(null);
    });

    it('should add https:// prefix if missing', () => {
      expect(sanitizeUrl('example.com')).toBe('https://example.com');
    });

    it('should return null for invalid URL even with prefix', () => {
      expect(sanitizeUrl('not a url')).toBe(null);
    });

    it('should trim whitespace', () => {
      expect(sanitizeUrl('  https://example.com  ')).toBe('https://example.com');
    });
  });
});
