import { renderHook, act, waitFor } from '@testing-library/react';

import { useImageGrouping } from '../useImageGrouping';
import type { ImageMeta } from '@/app/api/admin/images/shared';

// Mock fetch
global.fetch = jest.fn();

describe('useImageGrouping', () => {
  const mockImages: ImageMeta[] = [
    {
      id: '1',
      name: 'track1.jpg',
      type: 'image/jpeg',
      size: 1000,
      date: '2024-01-01',
      isDuplicate: false,
    },
    {
      id: '2',
      name: 'track1-ori.jpg',
      type: 'image/jpeg',
      size: 5000,
      date: '2024-01-01',
      isDuplicate: false,
    },
    {
      id: '3',
      name: 'track2.jpg',
      type: 'image/jpeg',
      size: 1500,
      date: '2024-01-02',
      isDuplicate: false,
    },
  ];

  const mockTracks = [
    { id: 'track-1', title: 'Track 1', imageId: 'track1' },
    { id: 'track-2', title: 'Track 2', imageId: 'track2' },
  ];

  const mockEvents = [{ id: 'event-1', title: 'Event 1', imageId: 'event1' }];

  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/api/music')) {
        return Promise.resolve({
          json: () => Promise.resolve({ data: mockTracks }),
        });
      }
      if (url.includes('/api/events')) {
        return Promise.resolve({
          json: () => Promise.resolve({ data: mockEvents }),
        });
      }
      return Promise.reject(new Error('Unknown URL'));
    });
  });

  it('should initialize with empty state', () => {
    const { result } = renderHook(() => useImageGrouping());

    expect(result.current.groupedImages).toEqual([]);
    expect(result.current.isGrouping).toBe(false);
  });

  it('should group crop and ori images together', async () => {
    const { result } = renderHook(() => useImageGrouping());

    await act(async () => {
      await result.current.groupAndLinkImages(mockImages);
    });

    await waitFor(() => {
      expect(result.current.isGrouping).toBe(false);
    });

    const track1Group = result.current.groupedImages.find((g) => g.imageId === 'track1');
    expect(track1Group).toBeDefined();
    expect(track1Group?.crop?.name).toBe('track1.jpg');
    expect(track1Group?.ori?.name).toBe('track1-ori.jpg');
  });

  it('should link images to tracks', async () => {
    const { result } = renderHook(() => useImageGrouping());

    await act(async () => {
      await result.current.groupAndLinkImages(mockImages);
    });

    await waitFor(() => {
      expect(result.current.isGrouping).toBe(false);
    });

    const track1Group = result.current.groupedImages.find((g) => g.imageId === 'track1');
    expect(track1Group?.linkedTo).toEqual({
      type: 'track',
      id: 'track-1',
      title: 'Track 1',
    });
  });

  it('should link images to events', async () => {
    const imagesWithEvent: ImageMeta[] = [
      {
        id: '4',
        name: 'event1.jpg',
        type: 'image/jpeg',
        size: 2000,
        date: '2024-01-03',
        isDuplicate: false,
      },
    ];

    const { result } = renderHook(() => useImageGrouping());

    await act(async () => {
      await result.current.groupAndLinkImages(imagesWithEvent);
    });

    await waitFor(() => {
      expect(result.current.isGrouping).toBe(false);
    });

    const event1Group = result.current.groupedImages.find((g) => g.imageId === 'event1');
    expect(event1Group?.linkedTo).toEqual({
      type: 'event',
      id: 'event-1',
      title: 'Event 1',
    });
  });

  it('should detect duplicate originals by size', async () => {
    const imagesWithDuplicates: ImageMeta[] = [
      {
        id: '1',
        name: 'img1.jpg',
        type: 'image/jpeg',
        size: 1000,
        date: '2024-01-01',
        isDuplicate: false,
      },
      {
        id: '2',
        name: 'img1-ori.jpg',
        type: 'image/jpeg',
        size: 5000,
        date: '2024-01-01',
        isDuplicate: false,
      },
      {
        id: '3',
        name: 'img2.jpg',
        type: 'image/jpeg',
        size: 1000,
        date: '2024-01-02',
        isDuplicate: false,
      },
      {
        id: '4',
        name: 'img2-ori.jpg',
        type: 'image/jpeg',
        size: 5000,
        date: '2024-01-02',
        isDuplicate: false,
      },
    ];

    const { result } = renderHook(() => useImageGrouping());

    await act(async () => {
      await result.current.groupAndLinkImages(imagesWithDuplicates);
    });

    await waitFor(() => {
      expect(result.current.isGrouping).toBe(false);
    });

    const groups = result.current.groupedImages;
    const duplicateGroups = groups.filter((g) => g.ori?.isDuplicate);
    expect(duplicateGroups.length).toBeGreaterThan(0);
  });

  it('should set isGrouping to true during processing', async () => {
    const { result } = renderHook(() => useImageGrouping());

    // Use promises that we can control
    let resolveMusic: (value: any) => void;
    let resolveEvents: (value: any) => void;
    const musicPromise = new Promise((resolve) => {
      resolveMusic = resolve;
    });
    const eventsPromise = new Promise((resolve) => {
      resolveEvents = resolve;
    });

    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/api/music')) {
        return musicPromise;
      }
      if (url.includes('/api/events')) {
        return eventsPromise;
      }
      return Promise.reject(new Error('Unknown URL'));
    });

    act(() => {
      result.current.groupAndLinkImages(mockImages);
    });

    // Check grouping state immediately after starting
    await waitFor(() => {
      expect(result.current.isGrouping).toBe(true);
    });

    // Resolve the fetches
    resolveMusic!({
      json: () => Promise.resolve({ data: mockTracks }),
    });
    resolveEvents!({
      json: () => Promise.resolve({ data: mockEvents }),
    });

    await waitFor(() => {
      expect(result.current.isGrouping).toBe(false);
    });
  });

  it('should handle empty images array', async () => {
    const { result } = renderHook(() => useImageGrouping());

    await act(async () => {
      await result.current.groupAndLinkImages([]);
    });

    await waitFor(() => {
      expect(result.current.isGrouping).toBe(false);
    });

    expect(result.current.groupedImages).toEqual([]);
  });

  it('should handle images without ori', async () => {
    const imagesWithoutOri: ImageMeta[] = [
      {
        id: '1',
        name: 'single.jpg',
        type: 'image/jpeg',
        size: 1000,
        date: '2024-01-01',
        isDuplicate: false,
      },
    ];

    const { result } = renderHook(() => useImageGrouping());

    await act(async () => {
      await result.current.groupAndLinkImages(imagesWithoutOri);
    });

    await waitFor(() => {
      expect(result.current.isGrouping).toBe(false);
    });

    const group = result.current.groupedImages[0];
    expect(group.crop).toBeDefined();
    expect(group.ori).toBeNull();
  });

  describe('syncImagesWithGroups', () => {
    it('should sync isDuplicate flag from groups to images', () => {
      const { result } = renderHook(() => useImageGrouping());

      const images: ImageMeta[] = [
        {
          id: '1',
          name: 'img1.jpg',
          type: 'image/jpeg',
          size: 1000,
          date: '2024-01-01',
          isDuplicate: false,
        },
      ];

      const groups = [
        {
          imageId: 'img1',
          crop: {
            id: '1',
            name: 'img1.jpg',
            type: 'image/jpeg',
            size: 1000,
            date: '2024-01-01',
            isDuplicate: true,
          },
          ori: null,
          linkedTo: null,
        },
      ];

      const synced = result.current.syncImagesWithGroups(images, groups);

      expect(synced[0].isDuplicate).toBe(true);
    });

    it('should keep original isDuplicate if not in groups', () => {
      const { result } = renderHook(() => useImageGrouping());

      const images: ImageMeta[] = [
        {
          id: '1',
          name: 'img1.jpg',
          type: 'image/jpeg',
          size: 1000,
          date: '2024-01-01',
          isDuplicate: false,
        },
      ];

      const groups: any[] = [];

      const synced = result.current.syncImagesWithGroups(images, groups);

      expect(synced[0].isDuplicate).toBe(false);
    });

    it('should handle ori images in sync', () => {
      const { result } = renderHook(() => useImageGrouping());

      const images: ImageMeta[] = [
        {
          id: '2',
          name: 'img1-ori.jpg',
          type: 'image/jpeg',
          size: 5000,
          date: '2024-01-01',
          isDuplicate: false,
        },
      ];

      const groups = [
        {
          imageId: 'img1',
          crop: null,
          ori: {
            id: '2',
            name: 'img1-ori.jpg',
            type: 'image/jpeg',
            size: 5000,
            date: '2024-01-01',
            isDuplicate: true,
          },
          linkedTo: null,
        },
      ];

      const synced = result.current.syncImagesWithGroups(images, groups);

      expect(synced[0].isDuplicate).toBe(true);
    });
  });

  it('should handle API errors gracefully', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error('API Error'));

    const { result } = renderHook(() => useImageGrouping());

    await expect(async () => {
      await act(async () => {
        await result.current.groupAndLinkImages(mockImages);
      });
    }).rejects.toThrow('API Error');
  });

  it('should allow manual setting of grouped images', () => {
    const { result } = renderHook(() => useImageGrouping());

    const customGroups = [
      {
        imageId: 'custom',
        crop: {
          id: '1',
          name: 'custom.jpg',
          type: 'image/jpeg',
          size: 1000,
          date: '2024-01-01',
          isDuplicate: false,
        },
        ori: null,
        linkedTo: null,
      },
    ];

    act(() => {
      result.current.setGroupedImages(customGroups);
    });

    expect(result.current.groupedImages).toEqual(customGroups);
  });
});
