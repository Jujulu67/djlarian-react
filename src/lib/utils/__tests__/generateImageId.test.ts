import { generateImageId, isUUID } from '../generateImageId';

describe('generateImageId', () => {
  it('should generate a non-empty string', () => {
    const id = generateImageId();
    expect(id).toBeTruthy();
    expect(typeof id).toBe('string');
  });

  it('should generate unique IDs', () => {
    const id1 = generateImageId();
    const id2 = generateImageId();
    expect(id1).not.toBe(id2);
  });

  it('should have the correct format (timestamp-random)', () => {
    const id = generateImageId();
    expect(id).toMatch(/^[a-z0-9]+-[a-z0-9]{6}$/);
  });

  it('should contain a hyphen separator', () => {
    const id = generateImageId();
    expect(id).toContain('-');
  });

  it('should have a random part of 6 characters', () => {
    const id = generateImageId();
    const parts = id.split('-');
    expect(parts).toHaveLength(2);
    expect(parts[1]).toHaveLength(6);
  });

  it('should generate different random parts', () => {
    const ids = Array.from({ length: 10 }, () => generateImageId());
    const randomParts = ids.map((id) => id.split('-')[1]);
    const uniqueRandomParts = new Set(randomParts);
    // With high probability, all random parts should be unique
    expect(uniqueRandomParts.size).toBeGreaterThan(8);
  });
});

describe('isUUID', () => {
  it('should return true for valid UUIDs', () => {
    expect(isUUID('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
    expect(isUUID('6ba7b810-9dad-11d1-80b4-00c04fd430c8')).toBe(true);
    expect(isUUID('00000000-0000-0000-0000-000000000000')).toBe(true);
  });

  it('should return true for UUIDs with uppercase letters', () => {
    expect(isUUID('550E8400-E29B-41D4-A716-446655440000')).toBe(true);
    expect(isUUID('6BA7B810-9DAD-11D1-80B4-00C04FD430C8')).toBe(true);
  });

  it('should return false for invalid UUIDs', () => {
    expect(isUUID('not-a-uuid')).toBe(false);
    expect(isUUID('550e8400-e29b-41d4-a716')).toBe(false); // Too short
    expect(isUUID('550e8400-e29b-41d4-a716-446655440000-extra')).toBe(false); // Too long
    expect(isUUID('550e8400e29b41d4a716446655440000')).toBe(false); // Missing hyphens
  });

  it('should return false for generated image IDs', () => {
    const id = generateImageId();
    expect(isUUID(id)).toBe(false);
  });

  it('should return false for empty or invalid strings', () => {
    expect(isUUID('')).toBe(false);
    expect(isUUID('123')).toBe(false);
    expect(isUUID('abc-def-ghi')).toBe(false);
  });

  it('should return false for UUIDs with invalid characters', () => {
    expect(isUUID('550e8400-e29b-41d4-a716-44665544000g')).toBe(false); // 'g' is not hex
    expect(isUUID('550e8400-e29b-41d4-a716-44665544000!')).toBe(false); // Special char
  });
});
