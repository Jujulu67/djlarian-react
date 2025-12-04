import { generateImageId, isUUID } from '../generateImageId';

describe('generateImageId', () => {
  describe('generateImageId', () => {
    it('should generate a unique image ID', () => {
      const id1 = generateImageId();
      const id2 = generateImageId();

      expect(id1).not.toBe(id2);
      expect(typeof id1).toBe('string');
      expect(id1.length).toBeGreaterThan(0);
    });

    it('should generate ID with timestamp and random string', () => {
      const id = generateImageId();

      expect(id).toMatch(/^[a-z0-9]+-[a-z0-9]+$/);
      expect(id.includes('-')).toBe(true);
    });

    it('should generate different IDs on subsequent calls', () => {
      const ids = Array.from({ length: 10 }, () => generateImageId());
      const uniqueIds = new Set(ids);

      // Should have at least some unique IDs (may have collisions but unlikely)
      expect(uniqueIds.size).toBeGreaterThan(1);
    });
  });

  describe('isUUID', () => {
    it('should return true for valid UUID v4', () => {
      expect(isUUID('123e4567-e89b-12d3-a456-426614174000')).toBe(true);
      expect(isUUID('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
      expect(isUUID('00000000-0000-0000-0000-000000000000')).toBe(true);
    });

    it('should return false for invalid UUID formats', () => {
      expect(isUUID('not-a-uuid')).toBe(false);
      expect(isUUID('123e4567-e89b-12d3-a456')).toBe(false);
      expect(isUUID('123e4567e89b12d3a456426614174000')).toBe(false);
      expect(isUUID('')).toBe(false);
    });

    it('should be case insensitive', () => {
      expect(isUUID('123E4567-E89B-12D3-A456-426614174000')).toBe(true);
      expect(isUUID('123e4567-E89B-12D3-A456-426614174000')).toBe(true);
    });

    it('should return false for non-UUID strings', () => {
      expect(isUUID('image-id-123')).toBe(false);
      expect(isUUID('l8x3k2-abc123')).toBe(false);
      expect(isUUID('123')).toBe(false);
    });
  });
});
