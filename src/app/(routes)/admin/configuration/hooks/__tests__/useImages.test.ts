import { renderHook, act, waitFor } from '@testing-library/react';

import { useImages } from '../useImages';

// Mock logger
jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
  },
}));

// Mock fetch
global.fetch = jest.fn();

describe('useImages', () => {
  const mockImagesResponse = {
    images: [
      {
        id: '1',
        path: '/uploads/img1.jpg',
        name: 'img1.jpg',
        size: 1000,
        lastModified: '2024-01-01',
        type: 'image/jpeg',
      },
      {
        id: '2',
        path: '/uploads/img2.jpg',
        name: 'img2.jpg',
        size: 2000,
        lastModified: '2024-01-02',
        type: 'image/png',
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockImagesResponse),
    });
  });

  it('should initialize with default values', () => {
    const { result } = renderHook(() => useImages());

    expect(result.current.images).toEqual([]);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isRefreshing).toBe(false);
    expect(result.current.error).toBeNull();
  });

  describe('fetchImages', () => {
    it('should fetch images successfully', async () => {
      const { result } = renderHook(() => useImages());

      await act(async () => {
        await result.current.fetchImages();
      });

      expect(result.current.images).toHaveLength(2);
      expect(result.current.images[0].name).toBe('img1.jpg');
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should set loading state during fetch', async () => {
      const { result } = renderHook(() => useImages());

      // Use a promise that we can control
      let resolveFetch: (value: any) => void;
      const fetchPromise = new Promise((resolve) => {
        resolveFetch = resolve;
      });

      (global.fetch as jest.Mock).mockReturnValue(fetchPromise);

      act(() => {
        result.current.fetchImages();
      });

      // Check loading state immediately after starting fetch
      await waitFor(() => {
        expect(result.current.isLoading).toBe(true);
      });

      // Resolve the fetch
      resolveFetch!({
        ok: true,
        json: () => Promise.resolve(mockImagesResponse),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('should format images correctly', async () => {
      const { result } = renderHook(() => useImages());

      await act(async () => {
        await result.current.fetchImages();
      });

      const firstImage = result.current.images[0];
      expect(firstImage).toEqual({
        id: '1',
        url: '/uploads/img1.jpg',
        name: 'img1.jpg',
        size: 1000,
        date: '2024-01-01',
        type: 'image/jpeg',
        linkedTo: null,
        isDuplicate: false,
      });
    });

    it('should detect duplicates by base name', async () => {
      const duplicateResponse = {
        images: [
          {
            id: '1',
            path: '/uploads/test.jpg',
            name: 'test.jpg',
            size: 1000,
            lastModified: '2024-01-01',
            type: 'image/jpeg',
          },
          {
            id: '2',
            path: '/uploads/test-ori.jpg',
            name: 'test-ori.jpg',
            size: 5000,
            lastModified: '2024-01-01',
            type: 'image/jpeg',
          },
        ],
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(duplicateResponse),
      });

      const { result } = renderHook(() => useImages());

      await act(async () => {
        await result.current.fetchImages();
      });

      expect(result.current.images[0].isDuplicate).toBe(true);
      expect(result.current.images[1].isDuplicate).toBe(true);
    });

    it('should handle fetch errors', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
      });

      const { result } = renderHook(() => useImages());

      await act(async () => {
        try {
          await result.current.fetchImages();
        } catch (err) {
          // Expected to throw
        }
      });

      await waitFor(() => {
        expect(result.current.error).toBe('Impossible de charger les images. Veuillez réessayer.');
      });
      expect(result.current.isLoading).toBe(false);
    });

    it('should clear error on successful fetch', async () => {
      const { result } = renderHook(() => useImages());

      act(() => {
        result.current.setError('Previous error');
      });

      await act(async () => {
        await result.current.fetchImages();
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('handleRefresh', () => {
    it('should refresh images', async () => {
      const { result } = renderHook(() => useImages());

      await act(async () => {
        await result.current.handleRefresh();
      });

      expect(result.current.images).toHaveLength(2);
      expect(result.current.isRefreshing).toBe(false);
    });

    it('should set refreshing state during refresh', async () => {
      const { result } = renderHook(() => useImages());

      // Use a promise that we can control
      let resolveFetch: (value: any) => void;
      const fetchPromise = new Promise((resolve) => {
        resolveFetch = resolve;
      });

      (global.fetch as jest.Mock).mockReturnValue(fetchPromise);

      act(() => {
        result.current.handleRefresh();
      });

      // Check refreshing state immediately after starting refresh
      await waitFor(() => {
        expect(result.current.isRefreshing).toBe(true);
      });

      // Resolve the fetch
      resolveFetch!({
        ok: true,
        json: () => Promise.resolve(mockImagesResponse),
      });

      await waitFor(() => {
        expect(result.current.isRefreshing).toBe(false);
      });
    });
  });

  describe('deleteImage', () => {
    it('should delete image successfully', async () => {
      const { result } = renderHook(() => useImages());

      // First fetch images
      await act(async () => {
        await result.current.fetchImages();
      });

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      await act(async () => {
        await result.current.deleteImage('1');
      });

      expect(result.current.images).toHaveLength(1);
      expect(result.current.images[0].id).toBe('2');
    });

    it('should call DELETE endpoint with correct filename', async () => {
      const { result } = renderHook(() => useImages());

      await act(async () => {
        await result.current.fetchImages();
      });

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      await act(async () => {
        await result.current.deleteImage('1');
      });

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/images?filename=img1.jpg',
        expect.objectContaining({
          method: 'DELETE',
        })
      );
    });

    it('should throw error when image not found', async () => {
      const { result } = renderHook(() => useImages());

      await act(async () => {
        await result.current.fetchImages();
      });

      await expect(async () => {
        await act(async () => {
          await result.current.deleteImage('non-existent');
        });
      }).rejects.toThrow('Image non trouvée');
    });

    it('should handle delete errors', async () => {
      const { result } = renderHook(() => useImages());

      await act(async () => {
        await result.current.fetchImages();
      });

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: 'Delete failed' }),
      });

      await act(async () => {
        try {
          await result.current.deleteImage('1');
        } catch (err) {
          // Expected to throw
        }
      });

      await waitFor(() => {
        expect(result.current.error).toBe('Delete failed');
      });
    });

    it('should clear error before delete', async () => {
      const { result } = renderHook(() => useImages());

      await act(async () => {
        await result.current.fetchImages();
      });

      act(() => {
        result.current.setError('Previous error');
      });

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      await act(async () => {
        await result.current.deleteImage('1');
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('setImages', () => {
    it('should manually set images', () => {
      const { result } = renderHook(() => useImages());

      const customImages = [
        {
          id: '99',
          url: '/custom.jpg',
          name: 'custom.jpg',
          size: 999,
          date: '2024-12-01',
          type: 'image/jpeg',
          linkedTo: null,
          isDuplicate: false,
        },
      ];

      act(() => {
        result.current.setImages(customImages);
      });

      expect(result.current.images).toEqual(customImages);
    });
  });

  describe('setError', () => {
    it('should manually set error', () => {
      const { result } = renderHook(() => useImages());

      act(() => {
        result.current.setError('Custom error');
      });

      expect(result.current.error).toBe('Custom error');
    });

    it('should clear error by setting null', () => {
      const { result } = renderHook(() => useImages());

      act(() => {
        result.current.setError('Error');
        result.current.setError(null);
      });

      expect(result.current.error).toBeNull();
    });
  });
});
