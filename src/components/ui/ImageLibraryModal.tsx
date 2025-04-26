import React, { useEffect, useState } from 'react';
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

const getImageUrl = (img: ImageMeta) => {
  // Si l'url n'est pas déjà correcte, la recalculer
  if (img.url && img.url.startsWith('/uploads/')) return img.url;
  return `/uploads/${img.name}`;
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
        <h2 className="text-xl font-bold text-white">Bibliothèque d'images originales</h2>
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
                console.log('[BIBLIO] Image sélectionnée', img);
                onSelect(img);
              }}
              tabIndex={0}
              aria-label={`Sélectionner ${img.name}`}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  console.log('[BIBLIO] Image sélectionnée', img);
                  onSelect(img);
                }
              }}
            >
              <img
                src={getImageUrl(img)}
                alt={img.name}
                className="w-full h-32 object-cover rounded mb-2 bg-gray-700"
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
