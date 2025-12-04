import { renderHook, act } from '@testing-library/react';

import { useImageSelection } from '../useImageSelection';

describe('useImageSelection', () => {
  it('should initialize with default values', () => {
    const { result } = renderHook(() => useImageSelection());

    expect(result.current.isMultiSelectMode).toBe(false);
    expect(result.current.selectedImageIds).toEqual([]);
  });

  describe('toggleMultiSelectMode', () => {
    it('should toggle multi-select mode on', () => {
      const { result } = renderHook(() => useImageSelection());

      act(() => {
        result.current.toggleMultiSelectMode();
      });

      expect(result.current.isMultiSelectMode).toBe(true);
    });

    it('should toggle multi-select mode off', () => {
      const { result } = renderHook(() => useImageSelection());

      act(() => {
        result.current.toggleMultiSelectMode();
        result.current.toggleMultiSelectMode();
      });

      expect(result.current.isMultiSelectMode).toBe(false);
    });

    it('should clear selection when toggling mode', () => {
      const { result } = renderHook(() => useImageSelection());

      act(() => {
        result.current.setSelectedImageIds(['img1', 'img2']);
        result.current.toggleMultiSelectMode();
      });

      expect(result.current.selectedImageIds).toEqual([]);
    });
  });

  describe('toggleImageSelection', () => {
    it('should add image to selection', () => {
      const { result } = renderHook(() => useImageSelection());

      act(() => {
        result.current.toggleImageSelection('img1');
      });

      expect(result.current.selectedImageIds).toEqual(['img1']);
    });

    it('should remove image from selection if already selected', () => {
      const { result } = renderHook(() => useImageSelection());

      act(() => {
        result.current.toggleImageSelection('img1');
        result.current.toggleImageSelection('img1');
      });

      expect(result.current.selectedImageIds).toEqual([]);
    });

    it('should handle multiple image selections', () => {
      const { result } = renderHook(() => useImageSelection());

      act(() => {
        result.current.toggleImageSelection('img1');
        result.current.toggleImageSelection('img2');
        result.current.toggleImageSelection('img3');
      });

      expect(result.current.selectedImageIds).toEqual(['img1', 'img2', 'img3']);
    });

    it('should remove specific image from multiple selections', () => {
      const { result } = renderHook(() => useImageSelection());

      act(() => {
        result.current.toggleImageSelection('img1');
        result.current.toggleImageSelection('img2');
        result.current.toggleImageSelection('img3');
        result.current.toggleImageSelection('img2');
      });

      expect(result.current.selectedImageIds).toEqual(['img1', 'img3']);
    });
  });

  describe('selectAll', () => {
    it('should select all provided images', () => {
      const { result } = renderHook(() => useImageSelection());
      const allImages = ['img1', 'img2', 'img3', 'img4'];

      act(() => {
        result.current.selectAll(allImages);
      });

      expect(result.current.selectedImageIds).toEqual(allImages);
    });

    it('should replace existing selection', () => {
      const { result } = renderHook(() => useImageSelection());

      act(() => {
        result.current.setSelectedImageIds(['img1']);
        result.current.selectAll(['img2', 'img3', 'img4']);
      });

      expect(result.current.selectedImageIds).toEqual(['img2', 'img3', 'img4']);
    });

    it('should handle empty array', () => {
      const { result } = renderHook(() => useImageSelection());

      act(() => {
        result.current.setSelectedImageIds(['img1', 'img2']);
        result.current.selectAll([]);
      });

      expect(result.current.selectedImageIds).toEqual([]);
    });
  });

  describe('clearSelection', () => {
    it('should clear all selected images', () => {
      const { result } = renderHook(() => useImageSelection());

      act(() => {
        result.current.setSelectedImageIds(['img1', 'img2', 'img3']);
        result.current.clearSelection();
      });

      expect(result.current.selectedImageIds).toEqual([]);
    });

    it('should work when selection is already empty', () => {
      const { result } = renderHook(() => useImageSelection());

      act(() => {
        result.current.clearSelection();
      });

      expect(result.current.selectedImageIds).toEqual([]);
    });
  });

  describe('setIsMultiSelectMode', () => {
    it('should set multi-select mode directly', () => {
      const { result } = renderHook(() => useImageSelection());

      act(() => {
        result.current.setIsMultiSelectMode(true);
      });

      expect(result.current.isMultiSelectMode).toBe(true);

      act(() => {
        result.current.setIsMultiSelectMode(false);
      });

      expect(result.current.isMultiSelectMode).toBe(false);
    });
  });

  describe('setSelectedImageIds', () => {
    it('should set selected images directly', () => {
      const { result } = renderHook(() => useImageSelection());
      const images = ['img1', 'img2', 'img3'];

      act(() => {
        result.current.setSelectedImageIds(images);
      });

      expect(result.current.selectedImageIds).toEqual(images);
    });
  });
});
