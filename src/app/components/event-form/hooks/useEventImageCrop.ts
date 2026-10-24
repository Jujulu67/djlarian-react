import React, { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';

import { logger } from '@/lib/logger';
import { isNotEmpty } from '@/lib/utils/arrayHelpers';
import { findOriginalImageUrl } from '@/lib/utils/findOriginalImageUrl';

import type { EventFormData } from '../../EventForm/types';

interface UseEventImageCropOptions {
  formData: EventFormData;
  isEditMode?: boolean;
  imagePreviewProp?: string;
  onImageSelected: (file: File) => void;
  onImageFilesChange?: (original: File | null, crop: File | null) => void;
  handleRemoveImage: () => void;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
}

export function useEventImageCrop({
  formData,
  isEditMode,
  imagePreviewProp,
  onImageSelected,
  onImageFilesChange,
  handleRemoveImage,
  handleSubmit,
}: UseEventImageCropOptions) {
  const [imageToEdit, setImageToEdit] = useState<string | null>(null);
  const [originalImageFile, setOriginalImageFile] = useState<File | null>(null);
  const [croppedImageFile, setCroppedImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>(imagePreviewProp ?? '');
  const [cachedOriginalFile, setCachedOriginalFile] = useState<File | null>(null);
  const [pendingImageChange, setPendingImageChange] = useState(false);

  // Synchroniser le state local avec la prop imagePreview
  useEffect(() => {
    setImagePreview(imagePreviewProp ?? '');
  }, [imagePreviewProp]);

  // Ajout de l'écouteur d'événement pour le recadrage
  React.useEffect(() => {
    const handleRecropImage = () => {
      const imageToUse = formData.imageId;
      setImageToEdit(imageToUse ?? null);
    };

    document.addEventListener('recrop-image', handleRecropImage as EventListener);

    return () => {
      document.removeEventListener('recrop-image', handleRecropImage as EventListener);
    };
  }, [formData.imageId]);

  // Fonction pour annuler le recadrage
  const handleCancelRecrop = () => {
    setImageToEdit(null);
  };

  // Gère le drop d'une NOUVELLE image
  const handleNewImageDrop = (acceptedFiles: File[]) => {
    if (isNotEmpty(acceptedFiles)) {
      const file = acceptedFiles[0];
      setOriginalImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setImageToEdit(result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Fonction pour gérer l'input file du dropzone
  const handleImageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    handleNewImageDrop([file]);
  };

  // Lors d'un crop, activer le flag
  const handleCrop = (file: File, previewUrl: string) => {
    setCroppedImageFile(file);
    setImagePreview(previewUrl);
    onImageSelected(file);
    setImageToEdit(null);
    setPendingImageChange(true);
    logger.debug('[CROP] pendingImageChange activé (crop local)');
  };

  // Lors de la sauvegarde (submit), désactiver le flag et recharger le cache
  const handleSubmitWithCache = async (e: React.FormEvent) => {
    await handleSubmit(e);
    setPendingImageChange(false);
    logger.debug('[CROP] pendingImageChange désactivé (sauvegarde event)');
  };

  // Adapter le useEffect pour ne pas purger le cache si pendingImageChange est actif
  useEffect(() => {
    if (pendingImageChange) {
      logger.debug('[CROP] pendingImageChange actif, cache conservé malgré changement imageId');
      return;
    }
    let isMounted = true;
    if (formData.imageId) {
      (async () => {
        logger.debug("[CROP] Préchargement de l'originale pour imageId:", formData.imageId);
        const url = await findOriginalImageUrl(formData.imageId as string);
        logger.debug('[CROP] URL originale trouvée (ou null):', url);
        if (url && isMounted) {
          const ext = url.split('.').pop() || 'jpg';
          const res = await fetch(url);
          logger.debug('[CROP] Résultat fetch originale:', res.status, res.statusText);
          if (res.ok) {
            const blob = await res.blob();
            const file = new File([blob], `original.${ext}`, { type: blob.type });
            setCachedOriginalFile(file);
            logger.debug('[CROP] File originale préchargé:', file);
          } else {
            setCachedOriginalFile(null);
            logger.warn("[CROP] Impossible de fetch l'originale, fichier non trouvé");
          }
        } else if (isMounted) {
          setCachedOriginalFile(null);
          logger.warn('[CROP] Aucune URL originale trouvée');
        }
      })();
    } else {
      setCachedOriginalFile(null);
      logger.debug("[CROP] Pas d'imageId, cache vidé");
    }
    return () => {
      isMounted = false;
    };
  }, [formData.imageId, pendingImageChange]);

  // Pour recrop, toujours utiliser l'originale du cache
  const handleRecropOriginal = async () => {
    // Ajout explicite de la distinction création/modification
    if (!isEditMode) {
      // Mode création : toujours utiliser le cache local
      if (originalImageFile) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setImageToEdit(reader.result as string);
        };
        reader.readAsDataURL(originalImageFile);
        return;
      } else {
        toast.error("Aucune image d'origine en mémoire pour recadrer.");
        return;
      }
    }
    // Mode édition : logique existante
    if (cachedOriginalFile) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageToEdit(reader.result as string);
      };
      reader.readAsDataURL(cachedOriginalFile);
      setOriginalImageFile(cachedOriginalFile);
      return;
    }
    if (formData.imageId) {
      const url = await findOriginalImageUrl(formData.imageId as string);
      if (url) {
        const ext = url.split('.').pop() || 'jpg';
        const res = await fetch(url);
        if (res.ok) {
          const blob = await res.blob();
          const file = new File([blob], `original.${ext}`, { type: blob.type });
          setCachedOriginalFile(file);
          setOriginalImageFile(file);
          const reader = new FileReader();
          reader.onloadend = () => {
            setImageToEdit(reader.result as string);
          };
          reader.readAsDataURL(file);
        } else {
          toast.error("Impossible de charger l'image originale pour le recadrage.");
        }
      } else {
        toast.error("Impossible de charger l'image originale pour le recadrage.");
      }
    }
  };

  // Lors de la suppression (poubelle), vider le cache et le state
  const handleRemoveImageAndCache = () => {
    setOriginalImageFile(null);
    setCroppedImageFile(null);
    setImagePreview('');
    setCachedOriginalFile(null);
    handleRemoveImage();
    logger.debug('[CROP] Image supprimée, cache vidé');
  };

  // À chaque changement de fichier, notifier le parent
  useEffect(() => {
    if (typeof onImageFilesChange === 'function') {
      onImageFilesChange(originalImageFile, croppedImageFile);
    }
  }, [originalImageFile, croppedImageFile]);

  // Calcul de l'activation du crop
  const canRecrop = !!originalImageFile || !!cachedOriginalFile;
  // Log ciblé à chaque render
  logger.debug('[CROP][render]', {
    imageId: formData.imageId,
    originalImageFile,
    cachedOriginalFile,
    canRecrop,
  });

  return {
    imagePreview,
    imageToEdit,
    canRecrop,
    handleImageInputChange,
    handleRecropOriginal,
    handleRemoveImageAndCache,
    handleSubmitWithCache,
    handleCrop,
    handleCancelRecrop,
  };
}
