import { Music } from 'lucide-react';
import Image from 'next/image';
import React from 'react';

import { getImageUrl } from '@/lib/utils/getImageUrl';
import { Track } from '@/lib/utils/types';

interface MusicCardImageProps {
  track: Track;
  imageError: boolean;
  onImageError: () => void;
  priority?: boolean;
}

/**
 * Component to display track image or placeholder
 */
export const MusicCardImage: React.FC<MusicCardImageProps> = ({
  track,
  imageError,
  onImageError,
  priority = false,
}) => {
  if (track.imageId && !imageError) {
    const imageSrc = getImageUrl(track.imageId, {
      cacheBust: track.updatedAt ? new Date(track.updatedAt).getTime() : 0,
    });

    if (!imageSrc) {
      return (
        <div className="w-full h-full bg-gradient-to-r from-purple-900/30 to-blue-900/30 flex items-center justify-center group-hover:scale-105 transition-transform duration-500 v2:bg-none v2:bg-white/[0.03] v2:duration-700 v2:ease-[cubic-bezier(0.16,1,0.3,1)] v2:group-hover:scale-[1.03]">
          <Music className="w-16 h-16 text-gray-600 v2:h-12 v2:w-12 v2:text-white/20" />
        </div>
      );
    }

    return (
      <Image
        src={imageSrc}
        alt={`Pochette de ${track.title} par ${track.artist}`}
        width={400}
        height={400}
        className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500 v2:duration-700 v2:ease-[cubic-bezier(0.16,1,0.3,1)] v2:group-hover:scale-[1.03]"
        onError={onImageError}
        priority={priority}
        unoptimized
      />
    );
  }

  return (
    <div className="w-full h-full bg-gradient-to-r from-purple-900/30 to-blue-900/30 flex items-center justify-center group-hover:scale-105 transition-transform duration-500 v2:bg-none v2:bg-white/[0.03] v2:duration-700 v2:ease-[cubic-bezier(0.16,1,0.3,1)] v2:group-hover:scale-[1.03]">
      <Music className="w-16 h-16 text-gray-600 v2:h-12 v2:w-12 v2:text-white/20" />
    </div>
  );
};
