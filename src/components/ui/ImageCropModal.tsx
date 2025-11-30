import React, { useState, useRef } from 'react';
import ReactCrop, { type Crop as CropType, centerCrop, makeAspectCrop } from 'react-image-crop';

import 'react-image-crop/dist/ReactCrop.css';
import { Button } from '@/components/ui';
import Modal from '@/components/ui/Modal';

interface ImageCropModalProps {
  imageToEdit: string | null;
  aspect: number;
  onCrop: (file: File, previewUrl: string) => void;
  onCancel: () => void;
  cropLabel?: string;
  title?: string;
  cancelLabel?: string;
  zClass?: string;
  circular?: boolean; // Pour un crop rond
}

const ImageCropModal: React.FC<ImageCropModalProps> = ({
  imageToEdit,
  aspect,
  onCrop,
  onCancel,
  cropLabel = 'Appliquer le recadrage',
  title,
  cancelLabel = 'Annuler',
  zClass,
  circular = false,
}) => {
  const [displayCrop, setDisplayCrop] = useState<CropType>();
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const imageRef = useRef<HTMLImageElement | null>(null);

  // Centrer le crop à l'ouverture - utiliser le même ref pour éviter le double chargement
  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>): void => {
    const img = e.currentTarget;
    imageRef.current = img;
    const { naturalWidth, naturalHeight } = img;
    if (naturalWidth > 0 && naturalHeight > 0) {
      const initialCrop = centerCrop(
        makeAspectCrop(
          {
            unit: '%',
            width: 100,
          },
          aspect,
          naturalWidth,
          naturalHeight
        ),
        naturalWidth,
        naturalHeight
      );
      setDisplayCrop(initialCrop);
      setIsImageLoaded(true);
    } else {
      setIsImageLoaded(false);
    }
  };

  // Générer le fichier croppé et appeler le callback
  const handleApplyCrop = (): void => {
    if (!imageRef.current || !displayCrop?.width || !displayCrop?.height) return;
    const image = imageRef.current;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    // Calculer les dimensions du crop
    const imageWidth = image.naturalWidth || image.width;
    const imageHeight = image.naturalHeight || image.height;
    let cropX, cropY, cropWidth, cropHeight;
    if (displayCrop.unit === '%') {
      cropX = (imageWidth * displayCrop.x) / 100;
      cropY = (imageHeight * displayCrop.y) / 100;
      cropWidth = (imageWidth * displayCrop.width) / 100;
      cropHeight = (imageHeight * displayCrop.height) / 100;
    } else {
      cropX = displayCrop.x;
      cropY = displayCrop.y;
      cropWidth = displayCrop.width;
      cropHeight = displayCrop.height;
    }

    // Pour un crop rond, utiliser la plus petite dimension
    const size = circular ? Math.min(cropWidth, cropHeight) : cropWidth;
    canvas.width = size;
    canvas.height = size;

    if (circular) {
      // Créer un masque circulaire
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size / 2, 0, 2 * Math.PI);
      ctx.clip();
    }

    // Dessiner l'image croppée
    ctx.drawImage(image, cropX, cropY, cropWidth, cropHeight, 0, 0, size, size);

    const previewUrl = canvas.toDataURL('image/jpeg', 0.95);
    canvas.toBlob(
      (blob) => {
        if (blob) {
          const file = new File([blob], 'cropped-image.jpg', { type: 'image/jpeg' });
          onCrop(file, previewUrl);
        }
      },
      'image/jpeg',
      0.95
    );
  };

  if (!imageToEdit) return null;

  return (
    <Modal
      maxWidth="max-w-3xl"
      showLoader={false}
      bgClass="bg-gray-800"
      borderClass="border-none"
      zClass={zClass}
      onClose={onCancel}
    >
      <div className="flex flex-col w-full">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-white">
            {title ??
              `Recadrer l&apos;image (${circular ? 'rond' : aspect === 1 ? 'carré' : '16:9'})`}
          </h3>
        </div>
        <div className="max-h-[70vh] overflow-auto flex justify-center items-center mb-4 pb-8">
          {isImageLoaded && displayCrop ? (
            <div className={circular ? 'relative' : ''}>
              <ReactCrop
                crop={displayCrop}
                onChange={(_, percentCrop) => setDisplayCrop(percentCrop)}
                aspect={aspect}
                className={`max-w-full max-h-[60vh] ${circular ? '[&_.ReactCrop__crop-selection]:rounded-full' : ''}`}
              >
                <img
                  ref={imageRef}
                  src={imageToEdit}
                  alt="Recadrage"
                  className="max-h-[60vh] object-contain"
                  onLoad={handleImageLoad}
                />
              </ReactCrop>
              {circular && (
                <div
                  className="absolute pointer-events-none"
                  style={{
                    top: `${displayCrop.y}%`,
                    left: `${displayCrop.x}%`,
                    width: `${displayCrop.width}%`,
                    height: `${displayCrop.height}%`,
                    borderRadius: '50%',
                    border: '2px solid rgba(139, 92, 246, 0.5)',
                    boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)',
                  }}
                />
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-40 text-gray-400">
              <img
                ref={imageRef}
                src={imageToEdit}
                alt="Chargement"
                onLoad={handleImageLoad}
                className="hidden"
              />
              Chargement de l&apos;image...
            </div>
          )}
        </div>
        <div className="flex justify-end space-x-3 pt-2 border-t border-gray-700">
          <Button variant="ghost" onClick={onCancel} type="button">
            {cancelLabel}
          </Button>
          <Button
            type="button"
            onClick={handleApplyCrop}
            className="bg-purple-600 hover:bg-purple-700"
            disabled={!isImageLoaded || !displayCrop?.width || !displayCrop?.height}
          >
            {cropLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default ImageCropModal;
