import { Music } from 'lucide-react';
import Image from 'next/image';
import React from 'react';

import { Track } from '@/lib/utils/types';

interface MusicCardImageProps {
  track: Track;
  imageError: boolean;
  onImageError: () => void;
}

/**
 * Component to display track image or placeholder
 */
export const MusicCardImage: React.FC<MusicCardImageProps> = ({
  track,
  imageError,
  onImageError,
}) => {
  if (track.imageId && !imageError) {
    // Vérifier si imageId est une URL complète (http/https)
    const isFullUrl = track.imageId.startsWith('http://') || track.imageId.startsWith('https://');

    // Si c'est une URL complète, l'utiliser directement
    // Sinon, construire le chemin local /uploads/
    const imageSrc = isFullUrl
      ? track.imageId
      : `/uploads/${track.imageId}.jpg?t=${track.updatedAt ? new Date(track.updatedAt).getTime() : Date.now()}`;

    return (
      <Image
        src={imageSrc}
        alt={`Pochette de ${track.title} par ${track.artist}`}
        width={400}
        height={400}
        className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
        onError={onImageError}
        unoptimized
      />
    );
  }

  return (
    <div className="w-full h-full bg-gradient-to-r from-purple-900/30 to-blue-900/30 flex items-center justify-center group-hover:scale-105 transition-transform duration-500">
      <Music className="w-16 h-16 text-gray-600" />
    </div>
  );
};
