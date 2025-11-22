import { Music } from 'lucide-react';
import Image from 'next/image';
import React from 'react';

import { getImageUrl } from '@/lib/utils/getImageUrl';
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
    const imageSrc = getImageUrl(track.imageId, {
      cacheBust: track.updatedAt ? new Date(track.updatedAt).getTime() : 0,
    });

    if (!imageSrc) {
      return (
        <div className="w-full h-full bg-gradient-to-r from-purple-900/30 to-blue-900/30 flex items-center justify-center group-hover:scale-105 transition-transform duration-500">
          <Music className="w-16 h-16 text-gray-600" />
        </div>
      );
    }

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
