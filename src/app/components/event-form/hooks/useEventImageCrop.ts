import React, { useEffect, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { toast } from 'sonner';
import { type Crop as CropType } from 'react-image-crop';

import { logger } from '@/lib/logger';
import { isNotEmpty } from '@/lib/utils/arrayHelpers';
import { findOriginalImageUrl } from '@/lib/utils/findOriginalImageUrl';

import type { EventFormData } from '../../EventForm/types';
import { centerAspectCrop } from '../eventFormUtils';

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
  const [dragActive, setDragActive] = useState(false);
  const [showCropper, setShowCropper] = useState<boolean>(false);
  const [displayCrop, setDisplayCrop] = useState<CropType>();
  const [imageToEdit, setImageToEdit] = useState<string | null>(null);
  const imageRef = React.useRef<HTMLImageElement | null>(null);
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [originalImageFile, setOriginalImageFile] = useState<File | null>(null);
  const [croppedImageFile, setCroppedImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>(imagePreviewProp ?? '');
  const [cachedOriginalUrl, setCachedOriginalUrl] = useState<string | null>(null);
  const [cachedOriginalFile, setCachedOriginalFile] = useState<File | null>(null);
  const [pendingImageChange, setPendingImageChange] = useState(false);

  // Synchroniser le state local avec la prop imagePreview
  useEffect(() => {
    setImagePreview(imagePreviewProp ?? '');
  }, [imagePreviewProp]);

  // Ajout de l'écouteur d'événement pour le recadrage
  React.useEffect(() => {
    const handleRecropImage = (e: CustomEvent) => {
      const imageToUse = formData.imageId;
      setIsImageLoaded(false);
      setDisplayCrop(undefined);
      setImageToEdit(imageToUse ?? null);
      setShowCropper(true);
    };

    document.addEventListener('recrop-image', handleRecropImage as EventListener);

    return () => {
      document.removeEventListener('recrop-image', handleRecropImage as EventListener);
    };
  }, [formData.imageId]);

  // Fonction pour précharger l'image ET initialiser le recadrage
  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { naturalWidth, naturalHeight } = e.currentTarget;
    imageRef.current = e.currentTarget;

    if (naturalWidth > 0 && naturalHeight > 0) {
      const initialCrop = centerAspectCrop(naturalWidth, naturalHeight, 16 / 9);
      setDisplayCrop(initialCrop);
      setIsImageLoaded(true);
    } else {
      logger.error('L&apos;image chargée n&apos;a pas de dimensions.');
      handleCancelRecrop();
    }
  };

  // Fonction pour dessiner l'image recadrée et envoyer les données au parent
  const drawCroppedImage = (crop: CropType) => {
    if (!imageRef.current || !crop.width || !crop.height) return;

    const image = imageRef.current;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      logger.error('Impossible de créer le contexte 2D');
      return;
    }

    // Récupérer les dimensions de l'image
    const imageWidth = image.naturalWidth || image.width;
    const imageHeight = image.naturalHeight || image.height;

    // Calculer les dimensions du recadrage en pixels
    let cropX, cropY, cropWidth, cropHeight;

    if (crop.unit === '%') {
      // Convertir les pourcentages en pixels
      cropX = (imageWidth * crop.x) / 100;
      cropY = (imageHeight * crop.y) / 100;
      cropWidth = (imageWidth * crop.width) / 100;
      cropHeight = (imageHeight * crop.height) / 100;
    } else {
      // Utiliser directement les valeurs en pixels
      cropX = crop.x;
      cropY = crop.y;
      cropWidth = crop.width;
      cropHeight = crop.height;
    }

    // Définir les dimensions du canvas pour le recadrage
    canvas.width = cropWidth;
    canvas.height = cropHeight;

    // Dessiner la partie recadrée de l'image sur le canvas
    ctx.drawImage(image, cropX, cropY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);

    // Convertir le canvas en data URL
    const croppedImageUrl = canvas.toDataURL('image/jpeg', 0.95);

    // Convertir en Blob puis en File
    canvas.toBlob(
      (blob) => {
        if (blob) {
          const file = new File([blob], 'cropped-image.jpg', { type: 'image/jpeg' });
          onImageSelected(file);
          setShowCropper(false);
          setImageToEdit(null);
          setIsImageLoaded(false);
          setDisplayCrop(undefined);
          setCroppedImageFile(file);
        } else {
          logger.error("Blob n'a pas pu être créé.");
          handleCancelRecrop();
        }
      },
      'image/jpeg',
      0.95
    );
  };

  // Fonction pour annuler le recadrage
  const handleCancelRecrop = () => {
    setShowCropper(false);
    setImageToEdit(null);
    setIsImageLoaded(false);
    setDisplayCrop(undefined);
  };

  // Gérer le drag & drop pour l'upload d'image
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
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
        setShowCropper(true);
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

  const { getRootProps, getInputProps } = useDropzone({
    onDrop: handleNewImageDrop,
    onDragEnter: () => setDragActive(true),
    onDragLeave: () => setDragActive(false),
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp'],
    },
    noClick: false,
    noKeyboard: true,
  });

  // Lors d'un crop, activer le flag
  const handleCrop = (file: File, previewUrl: string) => {
    setCroppedImageFile(file);
    setImagePreview(previewUrl);
    onImageSelected(file);
    setShowCropper(false);
    setImageToEdit(null);
    setIsImageLoaded(false);
    setDisplayCrop(undefined);
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
          setCachedOriginalUrl(url);
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
          setCachedOriginalUrl(null);
          setCachedOriginalFile(null);
          logger.warn('[CROP] Aucune URL originale trouvée');
        }
      })();
    } else {
      setCachedOriginalUrl(null);
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
          setShowCropper(true);
        };
        reader.readAsDataURL(originalImageFile);
        return;
      } else {
        toast.error('Aucune image d&apos;origine en mémoire pour recadrer.');
        return;
      }
    }
    // Mode édition : logique existante
    if (cachedOriginalFile) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageToEdit(reader.result as string);
        setShowCropper(true);
      };
      reader.readAsDataURL(cachedOriginalFile);
      setOriginalImageFile(cachedOriginalFile);
      return;
    }
    if (formData.imageId) {
      const url = await findOriginalImageUrl(formData.imageId as string);
      if (url) {
        setCachedOriginalUrl(url);
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
            setShowCropper(true);
          };
          reader.readAsDataURL(file);
        } else {
          toast.error('Impossible de charger l&apos;image originale pour le recadrage.');
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
    setCachedOriginalUrl(null);
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
