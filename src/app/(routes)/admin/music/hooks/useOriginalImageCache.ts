import { useEffect } from 'react';

import { fetchOriginalImage } from '../utils/originalImage';

import type { useImageUpload } from './useImageUpload';
import type { useTrackForm } from './useTrackForm';

/**
 * Gestion du cache image originale synchronisée sur imageId.
 * Ne charger l'image originale que si on est en mode édition (où elle est nécessaire).
 */
export function useOriginalImageCache(
  imageUpload: ReturnType<typeof useImageUpload>,
  trackForm: ReturnType<typeof useTrackForm>
) {
  useEffect(() => {
    imageUpload.setOriginalImageFile(null);
    imageUpload.setCachedOriginalFile(null);
    imageUpload.setCroppedImageBlob(null);
    // Ne charger l'image originale que si on est en mode édition
    if (trackForm.isEditing && trackForm.currentForm.imageId) {
      (async () => {
        const file = await fetchOriginalImage(trackForm.currentForm.imageId as string);
        if (file) {
          imageUpload.setOriginalImageFile(file);
          imageUpload.setCachedOriginalFile(file);
        }
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackForm.currentForm.imageId, trackForm.isEditing]);
}
