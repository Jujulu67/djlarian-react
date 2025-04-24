import React, { useRef } from 'react';
import { Upload, Crop, Trash2 } from 'lucide-react';

interface ImageDropzoneProps {
  label: string;
  imageUrl?: string;
  onDrop: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRecrop: () => void;
  onRemove: () => void;
  placeholderText?: string;
  helpText?: string;
  accept?: string;
  aspectRatio?: string;
  recropDisabled?: boolean;
}

const ImageDropzone: React.FC<ImageDropzoneProps> = ({
  label,
  imageUrl,
  onDrop,
  onRecrop,
  onRemove,
  placeholderText = 'Glissez-déposez une image ici, ou cliquez pour sélectionner',
  helpText = 'PNG, JPG, GIF ou WEBP - Max 5MB',
  accept = 'image/*',
  aspectRatio,
  recropDisabled = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="mt-4">
      <label className="block text-gray-300 font-medium mb-2">{label}</label>
      {imageUrl ? (
        <div className="relative">
          <div
            className={`w-full ${aspectRatio ?? 'pb-[100%]'} relative overflow-hidden rounded-lg group`}
          >
            <img
              src={imageUrl}
              alt="Cover preview"
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
              <button
                type="button"
                onClick={onRecrop}
                className="p-2 bg-purple-600 hover:bg-purple-700 rounded-full disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Recadrer l'image"
                tabIndex={0}
                onKeyDown={(e) => {
                  if ((e.key === 'Enter' || e.key === ' ') && !recropDisabled) onRecrop();
                }}
                disabled={recropDisabled}
              >
                <Crop className="w-5 h-5 text-white" />
              </button>
              <button
                type="button"
                onClick={onRemove}
                className="p-2 bg-red-600 hover:bg-red-700 rounded-full"
                aria-label="Supprimer l'image"
              >
                <Trash2 className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div
          className="border-2 border-dashed border-gray-600 rounded-lg p-6 text-center hover:border-purple-500 transition-colors cursor-pointer"
          onClick={() => fileInputRef.current?.click()}
          tabIndex={0}
          aria-label={placeholderText}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click();
          }}
        >
          <Upload className="w-10 h-10 text-purple-500 mx-auto mb-2" />
          <p className="text-gray-300">{placeholderText}</p>
          <p className="text-xs text-gray-400 mt-1">{helpText}</p>
          <input
            type="file"
            ref={fileInputRef}
            onChange={onDrop}
            className="hidden"
            accept={accept}
          />
        </div>
      )}
    </div>
  );
};

export default ImageDropzone;
