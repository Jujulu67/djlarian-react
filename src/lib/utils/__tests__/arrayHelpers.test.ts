import { isNotEmpty, isEmpty, first, last, safeLength } from '../arrayHelpers';

describe('arrayHelpers', () => {
  describe('isNotEmpty', () => {
    it('should return true for non-empty array', () => {
      expect(isNotEmpty([1, 2, 3])).toBe(true);
      expect(isNotEmpty(['a'])).toBe(true);
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

    it('should act as type guard', () => {
      const arr: string[] | null = ['test'];
      if (isNotEmpty(arr)) {
        // TypeScript should know arr is string[] here
        expect(arr.length).toBe(1);
      }
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
    it('should return first element of array', () => {
      expect(first([1, 2, 3])).toBe(1);
      expect(first(['a', 'b'])).toBe('a');
    });

    it('should return undefined for empty array', () => {
      expect(first([])).toBeUndefined();
    });

    it('should return undefined for null', () => {
      expect(first(null)).toBeUndefined();
    });

    it('should return undefined for undefined', () => {
      expect(first(undefined)).toBeUndefined();
    });
  });

  describe('last', () => {
    it('should return last element of array', () => {
      expect(last([1, 2, 3])).toBe(3);
      expect(last(['a', 'b'])).toBe('b');
    });

    it('should return undefined for empty array', () => {
      expect(last([])).toBeUndefined();
    });

    it('should return undefined for null', () => {
      expect(last(null)).toBeUndefined();
    });
  });

  describe('safeLength', () => {
    it('should return length of array', () => {
      expect(safeLength([1, 2, 3])).toBe(3);
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

