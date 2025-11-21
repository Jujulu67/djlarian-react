import Image from 'next/image';
import React, { useEffect, useState } from 'react';

import { logger } from '@/lib/logger';
import { getImageUrl } from '@/lib/utils/getImageUrl';

import Modal from './Modal';

interface ImageMeta {
  id: string;
  url: string;
  name: string;
  size: number;
  date?: string | number;
  lastModified?: string | number;
  createdAt?: string | number;
  type: string;
}

interface ImageLibraryModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (image: ImageMeta) => void;
}

const getImageUrlForModal = (img: ImageMeta) => {
  // Si c'est déjà une URL complète (blob), l'utiliser directement
  if (img.url && (img.url.startsWith('http://') || img.url.startsWith('https://'))) {
    return img.url;
  }

  // Extraire l'imageId du nom (format: "uploads/abc123-ori.jpg" ou "abc123-ori.jpg")
  const nameWithoutPath = img.name.replace(/^uploads\//, '');
  const imageId = nameWithoutPath.replace(/-ori\.(jpg|jpeg|png|webp)$/i, '');

  // Utiliser getImageUrl avec le paramètre original si c'est une image originale
  if (nameWithoutPath.includes('-ori.')) {
    return getImageUrl(imageId, { original: true });
  }

  // Sinon, utiliser l'URL telle quelle ou construire depuis le nom
  if (img.url && img.url.startsWith('/uploads/')) {
    return img.url;
  }

  // Fallback : utiliser la route API avec le nom
  return getImageUrl(imageId) || img.url || `/uploads/${img.name}`;
};

const getImageDate = (img: ImageMeta) => {
  const raw = img.date || img.lastModified || img.createdAt;
  if (!raw) return '';
  const d = typeof raw === 'number' ? new Date(raw) : new Date(raw);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString();
};

const ImageLibraryModal: React.FC<ImageLibraryModalProps> = ({ open, onClose, onSelect }) => {
  const [images, setImages] = useState<ImageMeta[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch('/api/images')
      .then((res) => res.json())
      .then((data) => {
        setImages(data.images.filter((img: ImageMeta) => img.name.includes('-ori.')));
      })
      .finally(() => setLoading(false));
  }, [open]);

  const filtered = images.filter((img) => img.name.toLowerCase().includes(search.toLowerCase()));

  if (!open) return null;

  return (
    <Modal maxWidth="max-w-3xl" onClose={onClose} showLoader={false}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-white">Bibliothèque d&apos;images originales</h2>
      </div>
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Rechercher..."
        className="w-full mb-4 px-3 py-2 rounded bg-gray-800 text-white border border-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
      />
      {loading ? (
        <div className="text-center text-gray-400 py-8">Chargement...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center text-gray-400 py-8">Aucune image originale trouvée.</div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {filtered.map((img) => (
            <div
              key={img.id}
              className="cursor-pointer bg-gray-800 rounded-lg p-2 hover:ring-2 hover:ring-purple-500 transition"
              onClick={() => {
                logger.debug('[BIBLIO] Image sélectionnée', img);
                onSelect(img);
              }}
              tabIndex={0}
              aria-label={`Sélectionner ${img.name}`}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  logger.debug('[BIBLIO] Image sélectionnée', img);
                  onSelect(img);
                }
              }}
            >
              <Image
                src={getImageUrlForModal(img) || '/placeholder-image.jpg'}
                alt={img.name}
                width={200}
                height={128}
                className="w-full h-32 object-cover rounded mb-2 bg-gray-700"
                unoptimized
              />
              <div className="text-sm text-white truncate" title={img.name}>
                {img.name}
              </div>
              <div className="text-xs text-gray-400">{(img.size / 1024).toFixed(1)} Ko</div>
              <div className="text-xs text-gray-500">{getImageDate(img)}</div>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
};

export default ImageLibraryModal;
