import { useState, useRef } from 'react';
import type { Crop as CropType } from 'react-image-crop';

export function useImageUpload() {
  const [showCropModal, setShowCropModal] = useState(false);
  const [crop, setCrop] = useState<CropType>();
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [croppedImageBlob, setCroppedImageBlob] = useState<Blob | null>(null);
  const [originalImageFile, setOriginalImageFile] = useState<File | null>(null);
  const [cachedOriginalFile, setCachedOriginalFile] = useState<File | null>(null);
  const [imageToUploadId, setImageToUploadId] = useState<string | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const originalImageFileRef = useRef<File | null>(null);

  const resetImageState = () => {
    setShowCropModal(false);
    setCrop(undefined);
    setUploadedImage(null);
    setCroppedImageBlob(null);
    setOriginalImageFile(null);
    setCachedOriginalFile(null);
    setImageToUploadId(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return {
    showCropModal,
    setShowCropModal,
    crop,
    setCrop,
    uploadedImage,
    setUploadedImage,
    croppedImageBlob,
    setCroppedImageBlob,
    originalImageFile,
    setOriginalImageFile,
    cachedOriginalFile,
    setCachedOriginalFile,
    imageToUploadId,
    setImageToUploadId,
    imageRef,
    fileInputRef,
    originalImageFileRef,
    resetImageState,
  };
}
