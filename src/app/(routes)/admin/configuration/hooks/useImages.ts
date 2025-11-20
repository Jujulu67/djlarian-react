import { useState, useCallback } from 'react';

import { ImageMeta } from '@/app/api/admin/images/shared';
import { logger } from '@/lib/logger';

import { extractImageId } from '../utils/extractImageId';

export function useImages() {
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [images, setImages] = useState<ImageMeta[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchImages = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/images');
      if (!response.ok) {
        throw new Error(`Erreur lors de la récupération des images: ${response.status}`);
      }
      const data = await response.json();
      const formattedImages: ImageMeta[] = data.images.map(
        (img: {
          id: string;
          path: string;
          name: string;
          size: number;
          lastModified: string;
          type: string;
        }) => ({
          id: img.id,
          url: img.path,
          name: img.name,
          size: img.size,
          date: img.lastModified,
          type: img.type,
          linkedTo: null,
          isDuplicate: false,
        })
      );

      // Détection des doublons par nom de base
      const nameMap: Record<string, number> = {};
      formattedImages.forEach((img: ImageMeta) => {
        const baseName = extractImageId(img.name);
        nameMap[baseName] = (nameMap[baseName] || 0) + 1;
      });
      const imagesWithDuplicates = formattedImages.map((img: ImageMeta) => {
        const baseName = extractImageId(img.name);
        return { ...img, isDuplicate: nameMap[baseName] > 1 };
      });

      setImages(imagesWithDuplicates);
      return imagesWithDuplicates;
    } catch (err) {
      logger.error('Erreur de chargement des images:', err);
      setError('Impossible de charger les images. Veuillez réessayer.');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await fetchImages();
    setIsRefreshing(false);
  }, [fetchImages]);

  const deleteImage = useCallback(
    async (id: string) => {
      setError(null);
      try {
        const imageToDelete = images.find((img) => img.id === id);
        if (!imageToDelete) {
          throw new Error('Image non trouvée');
        }

        const response = await fetch(
          `/api/images?filename=${encodeURIComponent(imageToDelete.name)}`,
          {
            method: 'DELETE',
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `Erreur lors de la suppression: ${response.status}`);
        }

        setImages((prev) => prev.filter((img) => img.id !== id));
        return true;
      } catch (err: unknown) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : "Impossible de supprimer l'image. Veuillez réessayer.";
        logger.error('Erreur de suppression:', err);
        setError(errorMessage);
        throw err;
      }
    },
    [images]
  );

  return {
    images,
    isLoading,
    isRefreshing,
    error,
    setImages,
    setError,
    fetchImages,
    handleRefresh,
    deleteImage,
  };
}
