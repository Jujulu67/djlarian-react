import { renderHook, act } from '@testing-library/react';

import { useImageFilters } from '../useImageFilters';
import type { ImageMeta } from '@/app/api/admin/images/shared';
import type { GroupedImage } from '../../types';

// Mock getSortedGroups
jest.mock('../../utils/getSortedGroups', () => ({
  getSortedGroups: jest.fn((groups) => groups),
}));

describe('useImageFilters', () => {
  const mockImages: ImageMeta[] = [
    { name: 'image1.jpg', type: 'image/jpeg', size: 1000, date: '2024-01-01', isDuplicate: false },
    { name: 'image2.png', type: 'image/png', size: 2000, date: '2024-01-02', isDuplicate: true },
    { name: 'test.jpg', type: 'image/jpeg', size: 1500, date: '2024-01-03', isDuplicate: false },
  ];

  const mockGroupedImages: GroupedImage[] = [
    {
      crop: {
        name: 'image1.jpg',
        type: 'image/jpeg',
        size: 1000,
        date: '2024-01-01',
        isDuplicate: false,
      },
      ori: undefined,
      linkedTo: undefined,
    },
    {
      crop: {
        name: 'image2.png',
        type: 'image/png',
        size: 2000,
        date: '2024-01-02',
        isDuplicate: true,
      },
      ori: {
        name: 'image2-ori.png',
        type: 'image/png',
        size: 3000,
        date: '2024-01-02',
        isDuplicate: true,
      },
      linkedTo: undefined,
    },
  ];

  it('should initialize with default values', () => {
    const { result } = renderHook(() => useImageFilters(mockImages, mockGroupedImages));

    expect(result.current.filter).toBe('all');
    expect(result.current.searchTerm).toBe('');
    expect(result.current.sortOption).toBe('date-desc');
    expect(result.current.currentPage).toBe(1);
    expect(result.current.itemsPerPage).toBe(25);
    expect(result.current.showDuplicates).toBe(false);
  });

  it('should filter images by type', () => {
    const { result } = renderHook(() => useImageFilters(mockImages, mockGroupedImages));

    act(() => {
      result.current.setFilter('image/jpeg');
    });

    expect(result.current.filteredImages).toHaveLength(2);
    expect(result.current.filteredImages.every((img) => img.type === 'image/jpeg')).toBe(true);
  });

  it('should filter images by search term', () => {
    const { result } = renderHook(() => useImageFilters(mockImages, mockGroupedImages));

    act(() => {
      result.current.setSearchTerm('test');
    });

    expect(result.current.filteredImages).toHaveLength(1);
    expect(result.current.filteredImages[0].name).toBe('test.jpg');
  });

  it('should filter images by duplicates', () => {
    const { result } = renderHook(() => useImageFilters(mockImages, mockGroupedImages));

    act(() => {
      result.current.setShowDuplicates(true);
    });

    expect(result.current.filteredImages).toHaveLength(1);
    expect(result.current.filteredImages[0].isDuplicate).toBe(true);
  });

  it('should combine multiple filters', () => {
    const { result } = renderHook(() => useImageFilters(mockImages, mockGroupedImages));

    act(() => {
      result.current.setFilter('image/jpeg');
      result.current.setSearchTerm('image');
    });

    expect(result.current.filteredImages).toHaveLength(1);
    expect(result.current.filteredImages[0].name).toBe('image1.jpg');
  });

  it('should update sort option', () => {
    const { result } = renderHook(() => useImageFilters(mockImages, mockGroupedImages));

    act(() => {
      result.current.setSortOption('name-asc');
    });

    expect(result.current.sortOption).toBe('name-asc');
  });

  it('should handle pagination', () => {
    const { result } = renderHook(() => useImageFilters(mockImages, mockGroupedImages));

    act(() => {
      result.current.setCurrentPage(2);
    });

    expect(result.current.currentPage).toBe(2);
  });

  it('should update items per page', () => {
    const { result } = renderHook(() => useImageFilters(mockImages, mockGroupedImages));

    act(() => {
      result.current.setItemsPerPage(50);
    });

    expect(result.current.itemsPerPage).toBe(50);
  });

  it('should calculate total pages correctly', () => {
    const manyImages = Array.from({ length: 100 }, (_, i) => ({
      name: `image${i}.jpg`,
      type: 'image/jpeg',
      size: 1000,
      date: '2024-01-01',
      isDuplicate: false,
    }));

    const manyGroups = manyImages.map((img) => ({
      crop: img,
      ori: undefined,
      linkedTo: undefined,
    }));

    const { result } = renderHook(() => useImageFilters(manyImages, manyGroups));

    expect(result.current.totalPages).toBe(4); // 100 / 25 = 4
  });

  it('should filter grouped images by duplicates', () => {
    const { result } = renderHook(() => useImageFilters(mockImages, mockGroupedImages));

    act(() => {
      result.current.setShowDuplicates(true);
    });

    expect(result.current.filteredGroups).toHaveLength(1);
    expect(result.current.filteredGroups[0].crop?.isDuplicate).toBe(true);
  });

  it('should create doublon families', () => {
    const groupsWithDuplicates: GroupedImage[] = [
      {
        crop: {
          name: 'dup1.jpg',
          type: 'image/jpeg',
          size: 1000,
          date: '2024-01-01',
          isDuplicate: true,
        },
        ori: {
          name: 'dup1-ori.jpg',
          type: 'image/jpeg',
          size: 5000,
          date: '2024-01-01',
          isDuplicate: true,
        },
        linkedTo: undefined,
      },
      {
        crop: {
          name: 'dup2.jpg',
          type: 'image/jpeg',
          size: 1000,
          date: '2024-01-01',
          isDuplicate: true,
        },
        ori: {
          name: 'dup2-ori.jpg',
          type: 'image/jpeg',
          size: 5000,
          date: '2024-01-01',
          isDuplicate: true,
        },
        linkedTo: undefined,
      },
    ];

    const { result } = renderHook(() => useImageFilters(mockImages, groupsWithDuplicates));

    act(() => {
      result.current.setShowDuplicates(true);
    });

    expect(result.current.doublonFamilies).toHaveLength(1);
    expect(result.current.doublonFamilies[0].groups).toHaveLength(2);
  });

  it('should reset all filters', () => {
    const { result } = renderHook(() => useImageFilters(mockImages, mockGroupedImages));

    act(() => {
      result.current.setFilter('image/png');
      result.current.setSearchTerm('test');
      result.current.setSortOption('name-asc');
      result.current.setCurrentPage(3);
      result.current.setItemsPerPage(50);
      result.current.setShowDuplicates(true);
    });

    act(() => {
      result.current.resetFilters();
    });

    expect(result.current.filter).toBe('all');
    expect(result.current.searchTerm).toBe('');
    expect(result.current.sortOption).toBe('date-desc');
    expect(result.current.currentPage).toBe(1);
    expect(result.current.itemsPerPage).toBe(25);
    expect(result.current.showDuplicates).toBe(false);
  });

  it('should handle empty images array', () => {
    const { result } = renderHook(() => useImageFilters([], []));

    expect(result.current.filteredImages).toEqual([]);
    expect(result.current.filteredGroups).toEqual([]);
    expect(result.current.totalPages).toBe(0);
  });

  it('should be case insensitive for search', () => {
    const { result } = renderHook(() => useImageFilters(mockImages, mockGroupedImages));

    act(() => {
      result.current.setSearchTerm('TEST');
    });

    expect(result.current.filteredImages).toHaveLength(1);
    expect(result.current.filteredImages[0].name).toBe('test.jpg');
  });

  it('should initialize with custom showDuplicates value', () => {
    const { result } = renderHook(() => useImageFilters(mockImages, mockGroupedImages, true));

    expect(result.current.showDuplicates).toBe(true);
  });
});
