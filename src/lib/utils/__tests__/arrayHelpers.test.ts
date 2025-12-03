/**
 * Tests for arrayHelpers
 */
import { isNotEmpty, isEmpty, first, last, safeLength } from '../arrayHelpers';

describe('arrayHelpers', () => {
  describe('isNotEmpty', () => {
    it('should return true for non-empty array', () => {
      expect(isNotEmpty([1, 2, 3])).toBe(true);
    });

    it('should return false for empty array', () => {
      expect(isNotEmpty([])).toBe(false);
    });

    it('should return false for null', () => {
      expect(isNotEmpty(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isNotEmpty(undefined)).toBe(false);
    });
  });

  describe('isEmpty', () => {
    it('should return true for empty array', () => {
      expect(isEmpty([])).toBe(true);
    });

    it('should return true for null', () => {
      expect(isEmpty(null)).toBe(true);
    });

    it('should return true for undefined', () => {
      expect(isEmpty(undefined)).toBe(true);
    });

    it('should return false for non-empty array', () => {
      expect(isEmpty([1, 2, 3])).toBe(false);
    });
  });

  describe('first', () => {
    it('should return first element', () => {
      expect(first([1, 2, 3])).toBe(1);
    });

    it('should return undefined for empty array', () => {
      expect(first([])).toBeUndefined();
    });

    it('should return undefined for null', () => {
      expect(first(null)).toBeUndefined();
    });
  });

  describe('last', () => {
    it('should return last element', () => {
      expect(last([1, 2, 3])).toBe(3);
    });

    it('should return undefined for empty array', () => {
      expect(last([])).toBeUndefined();
    });

    it('should return undefined for null', () => {
      expect(last(null)).toBeUndefined();
    });
  });

  describe('safeLength', () => {
    it('should return length for array', () => {
      expect(safeLength([1, 2, 3])).toBe(3);
    });

    it('should return 0 for empty array', () => {
      expect(safeLength([])).toBe(0);
    });

    it('should return 0 for null', () => {
      expect(safeLength(null)).toBe(0);
    });

    it('should return 0 for undefined', () => {
      expect(safeLength(undefined)).toBe(0);
    });
  });
});
