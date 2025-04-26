import React, { useRef, useState } from 'react';
import { Upload, Crop, Trash2, Image as ImageIcon } from 'lucide-react';
import ImageLibraryModal from './ImageLibraryModal';

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
  canRecrop?: boolean;
  onFileSelected?: (file: File) => void;
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
  canRecrop = false,
  onFileSelected,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showLibrary, setShowLibrary] = useState(false);

  // Handler pour sélection depuis la bibliothèque
  const handleSelectFromLibrary = async (imgMeta: any) => {
    try {
      const exts = [
        '', // extension du chemin fourni
        '.png',
        '.jpg',
        '.jpeg',
        '.webp',
      ];
      let file: File | null = null;
      const baseUrl = imgMeta.url || imgMeta.path;
      for (const ext of exts) {
        let url = baseUrl;
        if (ext && !baseUrl.endsWith(ext)) {
          url = baseUrl.replace(/\.[a-zA-Z0-9]+$/, ext);
        }
        try {
          const res = await fetch(url);
          if (!res.ok) continue;
          const blob = await res.blob();
          if (!blob.type.startsWith('image/')) continue;
          let mimeType = blob.type;
          if (!mimeType.startsWith('image/')) {
            if (url.endsWith('.png')) mimeType = 'image/png';
            else if (url.endsWith('.jpg') || url.endsWith('.jpeg')) mimeType = 'image/jpeg';
            else if (url.endsWith('.webp')) mimeType = 'image/webp';
            else mimeType = 'image/png';
          }
          file = new File([blob], imgMeta.name, { type: mimeType });
          break;
        } catch {
          continue;
        }
      }
      if (!file) return;
      if (typeof onFileSelected === 'function') {
        onFileSelected(file);
      } else {
        const dt = new DataTransfer();
        dt.items.add(file);
        const event = { target: { files: dt.files } } as React.ChangeEvent<HTMLInputElement>;
        onDrop(event);
      }
      setShowLibrary(false);
    } catch {
      // fail silently
    }
  };

  return (
    <div className="mt-4">
      <label className="block text-gray-300 font-medium mb-2">{label}</label>
      <div className="flex items-center gap-2 mb-2">
        <button
          type="button"
          onClick={() => setShowLibrary(true)}
          className="px-3 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded flex items-center gap-2"
        >
          <ImageIcon className="w-5 h-5" />
          Importer depuis la bibliothèque
        </button>
      </div>
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
                  if ((e.key === 'Enter' || e.key === ' ') && canRecrop) onRecrop();
                }}
                disabled={!canRecrop}
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
      <ImageLibraryModal
        open={showLibrary}
        onClose={() => setShowLibrary(false)}
        onSelect={handleSelectFromLibrary}
      />
    </div>
  );
};

export default ImageDropzone;
