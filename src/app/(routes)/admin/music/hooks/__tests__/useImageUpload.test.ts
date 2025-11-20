import { renderHook, act } from '@testing-library/react';

import { useImageUpload } from '../useImageUpload';

describe('useImageUpload', () => {
  it('should initialize with default values', () => {
    const { result } = renderHook(() => useImageUpload());

    expect(result.current.showCropModal).toBe(false);
    expect(result.current.crop).toBeUndefined();
    expect(result.current.uploadedImage).toBeNull();
    expect(result.current.croppedImageBlob).toBeNull();
    expect(result.current.originalImageFile).toBeNull();
    expect(result.current.cachedOriginalFile).toBeNull();
    expect(result.current.imageToUploadId).toBeNull();
  });

  it('should update showCropModal', () => {
    const { result } = renderHook(() => useImageUpload());

    act(() => {
      result.current.setShowCropModal(true);
    });

    expect(result.current.showCropModal).toBe(true);
  });

  it('should reset image state correctly', () => {
    const { result } = renderHook(() => useImageUpload());

    // Set some values
    act(() => {
      result.current.setShowCropModal(true);
      result.current.setUploadedImage('test-image.jpg');
      result.current.setImageToUploadId('test-id');
    });

    // Reset
    act(() => {
      result.current.resetImageState();
    });

    expect(result.current.showCropModal).toBe(false);
    expect(result.current.uploadedImage).toBeNull();
    expect(result.current.imageToUploadId).toBeNull();
  });

  it('should have refs available', () => {
    const { result } = renderHook(() => useImageUpload());

    expect(result.current.imageRef).toBeDefined();
    expect(result.current.fileInputRef).toBeDefined();
    expect(result.current.originalImageFileRef).toBeDefined();
  });
});
