import { getSortedGroups, SortOption } from '../getSortedGroups';
import type { GroupedImage } from '../../types';

describe('getSortedGroups', () => {
  const createMockGroup = (overrides: Partial<GroupedImage> = {}): GroupedImage => ({
    id: 'test-id',
    crop: {
      name: 'test.jpg',
      size: 1000,
      date: '2024-01-15',
      type: 'image/jpeg',
    },
    ori: undefined,
    linkedTo: undefined,
    ...overrides,
  });

  describe('showDuplicates mode', () => {
    it('should sort by original size descending when showDuplicates is true', () => {
      const groups: GroupedImage[] = [
        createMockGroup({
          ori: { name: 'small.jpg', size: 100, date: '2024-01-01', type: 'image/jpeg' },
        }),
        createMockGroup({
          ori: { name: 'large.jpg', size: 1000, date: '2024-01-01', type: 'image/jpeg' },
        }),
        createMockGroup({
          ori: { name: 'medium.jpg', size: 500, date: '2024-01-01', type: 'image/jpeg' },
        }),
      ];

      const result = getSortedGroups(groups, 'date-desc', true);

      expect(result[0].ori?.size).toBe(1000);
      expect(result[1].ori?.size).toBe(500);
      expect(result[2].ori?.size).toBe(100);
    });

    it('should use crop name as secondary sort when sizes are equal', () => {
      const groups: GroupedImage[] = [
        createMockGroup({
          crop: { name: 'zebra.jpg', size: 1000, date: '2024-01-01', type: 'image/jpeg' },
          ori: { name: 'ori-z.jpg', size: 500, date: '2024-01-01', type: 'image/jpeg' },
        }),
        createMockGroup({
          crop: { name: 'apple.jpg', size: 1000, date: '2024-01-01', type: 'image/jpeg' },
          ori: { name: 'ori-a.jpg', size: 500, date: '2024-01-01', type: 'image/jpeg' },
        }),
      ];

      const result = getSortedGroups(groups, 'date-desc', true);

      expect(result[0].crop?.name).toBe('apple.jpg');
      expect(result[1].crop?.name).toBe('zebra.jpg');
    });

    it('should handle groups without original images', () => {
      const groups: GroupedImage[] = [
        createMockGroup({
          crop: { name: 'test.jpg', size: 1000, date: '2024-01-01', type: 'image/jpeg' },
        }),
        createMockGroup({
          ori: { name: 'ori.jpg', size: 500, date: '2024-01-01', type: 'image/jpeg' },
        }),
      ];

      const result = getSortedGroups(groups, 'date-desc', true);

      expect(result).toHaveLength(2);
    });
  });

  describe('date sorting', () => {
    it('should sort by date descending', () => {
      const groups: GroupedImage[] = [
        createMockGroup({
          crop: { name: 'old.jpg', size: 1000, date: '2024-01-01', type: 'image/jpeg' },
        }),
        createMockGroup({
          crop: { name: 'new.jpg', size: 1000, date: '2024-12-31', type: 'image/jpeg' },
        }),
        createMockGroup({
          crop: { name: 'mid.jpg', size: 1000, date: '2024-06-15', type: 'image/jpeg' },
        }),
      ];

      const result = getSortedGroups(groups, 'date-desc', false);

      expect(result[0].crop?.name).toBe('new.jpg');
      expect(result[1].crop?.name).toBe('mid.jpg');
      expect(result[2].crop?.name).toBe('old.jpg');
    });

    it('should sort by date ascending', () => {
      const groups: GroupedImage[] = [
        createMockGroup({
          crop: { name: 'new.jpg', size: 1000, date: '2024-12-31', type: 'image/jpeg' },
        }),
        createMockGroup({
          crop: { name: 'old.jpg', size: 1000, date: '2024-01-01', type: 'image/jpeg' },
        }),
      ];

      const result = getSortedGroups(groups, 'date-asc', false);

      expect(result[0].crop?.name).toBe('old.jpg');
      expect(result[1].crop?.name).toBe('new.jpg');
    });

    it('should use ori date if crop date is missing', () => {
      const groups: GroupedImage[] = [
        createMockGroup({
          crop: undefined,
          ori: { name: 'ori.jpg', size: 1000, date: '2024-01-01', type: 'image/jpeg' },
        }),
        createMockGroup({
          crop: { name: 'crop.jpg', size: 1000, date: '2024-12-31', type: 'image/jpeg' },
        }),
      ];

      const result = getSortedGroups(groups, 'date-desc', false);

      expect(result[0].crop?.name).toBe('crop.jpg');
    });
  });

  describe('name sorting', () => {
    it('should sort by name ascending', () => {
      const groups: GroupedImage[] = [
        createMockGroup({
          crop: { name: 'zebra.jpg', size: 1000, date: '2024-01-01', type: 'image/jpeg' },
        }),
        createMockGroup({
          crop: { name: 'apple.jpg', size: 1000, date: '2024-01-01', type: 'image/jpeg' },
        }),
        createMockGroup({
          crop: { name: 'banana.jpg', size: 1000, date: '2024-01-01', type: 'image/jpeg' },
        }),
      ];

      const result = getSortedGroups(groups, 'name-asc', false);

      expect(result[0].crop?.name).toBe('apple.jpg');
      expect(result[1].crop?.name).toBe('banana.jpg');
      expect(result[2].crop?.name).toBe('zebra.jpg');
    });

    it('should sort by name descending', () => {
      const groups: GroupedImage[] = [
        createMockGroup({
          crop: { name: 'apple.jpg', size: 1000, date: '2024-01-01', type: 'image/jpeg' },
        }),
        createMockGroup({
          crop: { name: 'zebra.jpg', size: 1000, date: '2024-01-01', type: 'image/jpeg' },
        }),
      ];

      const result = getSortedGroups(groups, 'name-desc', false);

      expect(result[0].crop?.name).toBe('zebra.jpg');
      expect(result[1].crop?.name).toBe('apple.jpg');
    });

    it('should use ori name if crop name is missing', () => {
      const groups: GroupedImage[] = [
        createMockGroup({
          crop: undefined,
          ori: { name: 'zebra-ori.jpg', size: 1000, date: '2024-01-01', type: 'image/jpeg' },
        }),
        createMockGroup({
          crop: { name: 'apple.jpg', size: 1000, date: '2024-01-01', type: 'image/jpeg' },
        }),
      ];

      const result = getSortedGroups(groups, 'name-asc', false);

      expect(result[0].crop?.name).toBe('apple.jpg');
    });
  });

  describe('size sorting', () => {
    it('should sort by size ascending', () => {
      const groups: GroupedImage[] = [
        createMockGroup({
          crop: { name: 'large.jpg', size: 5000, date: '2024-01-01', type: 'image/jpeg' },
        }),
        createMockGroup({
          crop: { name: 'small.jpg', size: 1000, date: '2024-01-01', type: 'image/jpeg' },
        }),
        createMockGroup({
          crop: { name: 'medium.jpg', size: 3000, date: '2024-01-01', type: 'image/jpeg' },
        }),
      ];

      const result = getSortedGroups(groups, 'size-asc', false);

      expect(result[0].crop?.size).toBe(1000);
      expect(result[1].crop?.size).toBe(3000);
      expect(result[2].crop?.size).toBe(5000);
    });

    it('should sort by size descending', () => {
      const groups: GroupedImage[] = [
        createMockGroup({
          crop: { name: 'small.jpg', size: 1000, date: '2024-01-01', type: 'image/jpeg' },
        }),
        createMockGroup({
          crop: { name: 'large.jpg', size: 5000, date: '2024-01-01', type: 'image/jpeg' },
        }),
      ];

      const result = getSortedGroups(groups, 'size-desc', false);

      expect(result[0].crop?.size).toBe(5000);
      expect(result[1].crop?.size).toBe(1000);
    });

    it('should use ori size if crop size is missing', () => {
      const groups: GroupedImage[] = [
        createMockGroup({
          crop: undefined,
          ori: { name: 'ori.jpg', size: 2000, date: '2024-01-01', type: 'image/jpeg' },
        }),
        createMockGroup({
          crop: { name: 'crop.jpg', size: 3000, date: '2024-01-01', type: 'image/jpeg' },
        }),
      ];

      const result = getSortedGroups(groups, 'size-asc', false);

      expect(result[0].ori?.size).toBe(2000);
      expect(result[1].crop?.size).toBe(3000);
    });
  });

  describe('type sorting', () => {
    it('should sort by type', () => {
      const groups: GroupedImage[] = [
        createMockGroup({
          crop: { name: 'png.png', size: 1000, date: '2024-01-01', type: 'image/png' },
        }),
        createMockGroup({
          crop: { name: 'jpg.jpg', size: 1000, date: '2024-01-01', type: 'image/jpeg' },
        }),
        createMockGroup({
          crop: { name: 'webp.webp', size: 1000, date: '2024-01-01', type: 'image/webp' },
        }),
      ];

      const result = getSortedGroups(groups, 'type', false);

      expect(result[0].crop?.type).toBe('image/jpeg');
      expect(result[1].crop?.type).toBe('image/png');
      expect(result[2].crop?.type).toBe('image/webp');
    });

    it('should use ori type if crop type is missing', () => {
      const groups: GroupedImage[] = [
        createMockGroup({
          crop: undefined,
          ori: { name: 'ori.png', size: 1000, date: '2024-01-01', type: 'image/png' },
        }),
        createMockGroup({
          crop: { name: 'crop.jpg', size: 1000, date: '2024-01-01', type: 'image/jpeg' },
        }),
      ];

      const result = getSortedGroups(groups, 'type', false);

      expect(result[0].crop?.type).toBe('image/jpeg');
    });
  });

  describe('linked sorting', () => {
    it('should sort linked items first', () => {
      const groups: GroupedImage[] = [
        createMockGroup({ id: 'not-linked', linkedTo: undefined }),
        createMockGroup({ id: 'linked', linkedTo: 'some-id' }),
        createMockGroup({ id: 'also-not-linked', linkedTo: undefined }),
      ];

      const result = getSortedGroups(groups, 'linked', false);

      expect(result[0].linkedTo).toBeDefined();
      expect(result[1].linkedTo).toBeUndefined();
      expect(result[2].linkedTo).toBeUndefined();
    });

    it('should maintain order among linked items', () => {
      const groups: GroupedImage[] = [
        createMockGroup({ id: 'linked-1', linkedTo: 'id-1' }),
        createMockGroup({ id: 'linked-2', linkedTo: 'id-2' }),
      ];

      const result = getSortedGroups(groups, 'linked', false);

      expect(result[0].id).toBe('linked-1');
      expect(result[1].id).toBe('linked-2');
    });
  });

  describe('edge cases', () => {
    it('should handle empty array', () => {
      const result = getSortedGroups([], 'date-desc', false);
      expect(result).toEqual([]);
    });

    it('should handle single item', () => {
      const groups = [createMockGroup()];
      const result = getSortedGroups(groups, 'date-desc', false);
      expect(result).toHaveLength(1);
    });

    it('should not mutate original array', () => {
      const groups = [
        createMockGroup({
          crop: { name: 'b.jpg', size: 1000, date: '2024-01-01', type: 'image/jpeg' },
        }),
        createMockGroup({
          crop: { name: 'a.jpg', size: 1000, date: '2024-01-01', type: 'image/jpeg' },
        }),
      ];
      const original = [...groups];

      getSortedGroups(groups, 'name-asc', false);

      expect(groups).toEqual(original);
    });

    it('should handle missing crop and ori', () => {
      const groups: GroupedImage[] = [
        { id: 'test', crop: undefined, ori: undefined, linkedTo: undefined },
      ];

      const result = getSortedGroups(groups, 'name-asc', false);
      expect(result).toHaveLength(1);
    });
  });
});
