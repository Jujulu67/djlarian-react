import { useState, useCallback } from 'react';

import { emptyTrackForm } from '@/lib/utils/music-helpers';
import type { Track } from '@/lib/utils/types';

export function useTrackForm() {
  const [currentForm, setCurrentForm] = useState<
    Omit<Track, 'id'> & { id?: string; imageId?: string | null }
  >({
    ...emptyTrackForm,
  });
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [genreInput, setGenreInput] = useState('');
  const [coverPreview, setCoverPreview] = useState('');

  const resetForm = useCallback(
    (callbacks?: {
      setCroppedImageBlob?: (value: Blob | null) => void;
      setUploadedImage?: (value: string | null) => void;
      setImageToUploadId?: (value: string | null) => void;
      setHighlightedTrackId?: (value: string | null) => void;
    }) => {
      setCurrentForm({ ...emptyTrackForm });
      setCoverPreview('');
      setGenreInput('');
      setIsEditing(false);

      // Nettoyer les états d'image si callbacks fournis
      callbacks?.setCroppedImageBlob?.(null);
      callbacks?.setUploadedImage?.(null);
      callbacks?.setImageToUploadId?.(null);
      callbacks?.setHighlightedTrackId?.(null);
    },
    []
  );

  const handleEdit = useCallback(
    (
      track: Track,
      callbacks?: {
        setUploadedImage?: (value: string | null) => void;
        setImageToUploadId?: (value: string | null) => void;
        setHighlightedTrackId?: (value: string | null) => void;
      }
    ) => {
      // Convertir les platforms au bon format
      const plat: Track['platforms'] = {};
      Object.entries(track.platforms).forEach(([k, v]) => {
        if (v?.url) {
          plat[k as keyof typeof plat] = v;
        }
      });

      setCurrentForm({
        ...track,
        releaseDate: new Date(track.releaseDate).toISOString().split('T')[0],
        platforms: plat,
      });
      setCoverPreview(track.imageId ? `/uploads/${track.imageId}.jpg` : '');
      setIsEditing(true);

      // Nettoyer les états d'image si callbacks fournis
      callbacks?.setUploadedImage?.(null);
      callbacks?.setImageToUploadId?.(null);
      callbacks?.setHighlightedTrackId?.(null);

      // Scroll to top
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    },
    []
  );

  return {
    currentForm,
    setCurrentForm,
    isEditing,
    setIsEditing,
    isSubmitting,
    setIsSubmitting,
    genreInput,
    setGenreInput,
    coverPreview,
    setCoverPreview,
    resetForm,
    handleEdit,
  };
}
