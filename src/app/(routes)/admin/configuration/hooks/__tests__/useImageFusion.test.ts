import { renderHook, act, waitFor } from '@testing-library/react';

import { useImageFusion } from '../useImageFusion';
import type { GroupedImage } from '../../types';

// Mock logger
jest.mock('@/lib/logger', () => ({
  logger: {
    debug: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock fetch
global.fetch = jest.fn();

describe('useImageFusion', () => {
  const mockGroups: GroupedImage[] = [
    {
      imageId: 'img1',
      crop: {
        id: 'crop1',
        name: 'img1.jpg',
        type: 'image/jpeg',
        size: 1000,
        date: '2024-01-01',
        isDuplicate: true,
      },
      ori: {
        id: 'ori1',
        name: 'img1-ori.jpg',
        type: 'image/jpeg',
        size: 5000,
        date: '2024-01-01',
        isDuplicate: true,
      },
      linkedTo: { type: 'track', id: 'track-1', title: 'Track 1' },
    },
    {
      imageId: 'img2',
      crop: {
        id: 'crop2',
        name: 'img2.jpg',
        type: 'image/jpeg',
        size: 1000,
        date: '2024-01-02',
        isDuplicate: true,
      },
      ori: {
        id: 'ori2',
        name: 'img2-ori.jpg',
        type: 'image/jpeg',
        size: 5000,
        date: '2024-01-02',
        isDuplicate: true,
      },
      linkedTo: { type: 'event', id: 'event-1', title: 'Event 1' },
    },
  ];

  const mockFamily = {
    signature: '5000',
    groups: mockGroups,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    });
  });

  it('should initialize with default values', () => {
    const { result } = renderHook(() => useImageFusion());

    expect(result.current.fusionModal).toBeNull();
    expect(result.current.selectedMasterId).toBeNull();
    expect(result.current.ignoredIds).toEqual([]);
    expect(result.current.isLoadingFusion).toBe(false);
  });

  describe('openFusionModal', () => {
    it('should open fusion modal with family', () => {
      const { result } = renderHook(() => useImageFusion());

      act(() => {
        result.current.openFusionModal(mockFamily);
      });

      expect(result.current.fusionModal).toEqual({ family: mockFamily });
      expect(result.current.selectedMasterId).toBeNull();
      expect(result.current.ignoredIds).toEqual([]);
    });
  });

  describe('closeFusionModal', () => {
    it('should close fusion modal and reset state', () => {
      const { result } = renderHook(() => useImageFusion());

      act(() => {
        result.current.openFusionModal(mockFamily);
        result.current.setSelectedMasterId('crop1');
        result.current.setIgnoredIds(['crop2']);
      });

      act(() => {
        result.current.closeFusionModal();
      });

      expect(result.current.fusionModal).toBeNull();
      expect(result.current.selectedMasterId).toBeNull();
      expect(result.current.ignoredIds).toEqual([]);
    });
  });

  describe('setSelectedMasterId', () => {
    it('should set selected master ID', () => {
      const { result } = renderHook(() => useImageFusion());

      act(() => {
        result.current.setSelectedMasterId('crop1');
      });

      expect(result.current.selectedMasterId).toBe('crop1');
    });
  });

  describe('setIgnoredIds', () => {
    it('should set ignored IDs', () => {
      const { result } = renderHook(() => useImageFusion());

      act(() => {
        result.current.setIgnoredIds(['crop2', 'ori2']);
      });

      expect(result.current.ignoredIds).toEqual(['crop2', 'ori2']);
    });
  });

  describe('handleFusion', () => {
    const mockDeleteImage = jest.fn().mockResolvedValue(true);
    const mockFetchImages = jest.fn().mockResolvedValue([]);

    beforeEach(() => {
      mockDeleteImage.mockClear();
      mockFetchImages.mockClear();
    });

    it('should perform fusion successfully', async () => {
      const { result } = renderHook(() => useImageFusion());

      act(() => {
        result.current.openFusionModal(mockFamily);
      });

      await act(async () => {
        await result.current.handleFusion('crop1', [], mockDeleteImage, mockFetchImages);
      });

      await waitFor(() => {
        expect(result.current.isLoadingFusion).toBe(false);
      });

      expect(mockDeleteImage).toHaveBeenCalled();
      expect(mockFetchImages).toHaveBeenCalled();
    });

    it('should set loading state during fusion', async () => {
      const { result } = renderHook(() => useImageFusion());

      act(() => {
        result.current.openFusionModal(mockFamily);
      });

      // Use a promise that we can control
      let resolveDelete: (value: any) => void;
      const deletePromise = new Promise((resolve) => {
        resolveDelete = resolve;
      });
      mockDeleteImage.mockReturnValue(deletePromise);

      act(() => {
        result.current.handleFusion('crop1', [], mockDeleteImage, mockFetchImages);
      });

      // Check loading state immediately after starting fusion
      await waitFor(() => {
        expect(result.current.isLoadingFusion).toBe(true);
      });

      // Resolve the delete
      resolveDelete!(true);

      await waitFor(() => {
        expect(result.current.isLoadingFusion).toBe(false);
      });
    });

    it('should update linked entities', async () => {
      const { result } = renderHook(() => useImageFusion());

      act(() => {
        result.current.openFusionModal(mockFamily);
      });

      await act(async () => {
        await result.current.handleFusion('crop1', [], mockDeleteImage, mockFetchImages);
      });

      // crop1 is the master, so its group is protected and won't trigger a fetch
      // crop2 is not protected, so its linked entity (event-1) should be updated
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/events/event-1'),
          expect.objectContaining({
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
          })
        );
      });
    });

    it('should not delete master images', async () => {
      const { result } = renderHook(() => useImageFusion());

      act(() => {
        result.current.openFusionModal(mockFamily);
      });

      await act(async () => {
        await result.current.handleFusion('crop1', [], mockDeleteImage, mockFetchImages);
      });

      await waitFor(() => {
        expect(result.current.isLoadingFusion).toBe(false);
      });

      // Should not delete master crop and ori
      const deletedIds = mockDeleteImage.mock.calls.map((call) => call[0]);
      expect(deletedIds).not.toContain('crop1');
      expect(deletedIds).not.toContain('ori1');
    });

    it('should not delete ignored images', async () => {
      const { result } = renderHook(() => useImageFusion());

      act(() => {
        result.current.openFusionModal(mockFamily);
      });

      await act(async () => {
        await result.current.handleFusion('crop1', ['crop2'], mockDeleteImage, mockFetchImages);
      });

      await waitFor(() => {
        expect(result.current.isLoadingFusion).toBe(false);
      });

      const deletedIds = mockDeleteImage.mock.calls.map((call) => call[0]);
      expect(deletedIds).not.toContain('crop2');
    });

    it('should throw error when master group not found', async () => {
      const { result } = renderHook(() => useImageFusion());

      act(() => {
        result.current.openFusionModal(mockFamily);
      });

      await expect(async () => {
        await act(async () => {
          await result.current.handleFusion('invalid-id', [], mockDeleteImage, mockFetchImages);
        });
      }).rejects.toThrow('Carte maître introuvable');
    });

    it('should handle fusion errors', async () => {
      const errorDeleteImage = jest.fn().mockRejectedValue(new Error('Delete failed'));

      const { result } = renderHook(() => useImageFusion());

      act(() => {
        result.current.openFusionModal(mockFamily);
      });

      await expect(async () => {
        await act(async () => {
          await result.current.handleFusion('crop1', [], errorDeleteImage, mockFetchImages);
        });
      }).rejects.toThrow('Delete failed');

      await waitFor(() => {
        expect(result.current.isLoadingFusion).toBe(false);
      });
    });

    it('should return early if no fusion modal is open', async () => {
      const { result } = renderHook(() => useImageFusion());

      const fusionResult = await result.current.handleFusion(
        'crop1',
        [],
        mockDeleteImage,
        mockFetchImages
      );

      expect(fusionResult).toBeUndefined();
      expect(mockDeleteImage).not.toHaveBeenCalled();
      expect(mockFetchImages).not.toHaveBeenCalled();
    });

    it('should update event entities correctly', async () => {
      const { result } = renderHook(() => useImageFusion());

      act(() => {
        result.current.openFusionModal(mockFamily);
      });

      await act(async () => {
        await result.current.handleFusion('crop1', [], mockDeleteImage, mockFetchImages);
      });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/events/event-1'),
          expect.objectContaining({
            method: 'PATCH',
          })
        );
      });
    });
  });
});
