import React from 'react';
import { Music, Star } from 'lucide-react';
import { Track } from '@/lib/utils/types';

interface MusicCardBadgesProps {
  track: Track;
  isPlayerVisible: boolean;
}

/**
 * Transform track type to display label
 */
const getTypeLabel = (type: string): string => {
  switch (type) {
    case 'single':
      return 'Single';
    case 'ep':
      return 'EP';
    case 'album':
      return 'Album';
    case 'remix':
      return 'Remix';
    case 'live':
      return 'Live';
    case 'djset':
      return 'DJ Set';
    case 'video':
      return 'Video';
    default:
      return type;
  }
};

/**
 * Component to display track type and featured badges
 */
export const MusicCardBadges: React.FC<MusicCardBadgesProps> = ({ track, isPlayerVisible }) => {
  if (isPlayerVisible) {
    return null;
  }

  return (
    <>
      <div className="absolute top-4 left-4 flex items-center gap-2">
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-600 text-purple-100 shadow-lg">
          <Music className="w-3 h-3 mr-1" />
          {getTypeLabel(track.type)}
        </span>
        {track.featured && (
          <span className="relative flex h-5 w-5" aria-hidden="true">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-300 opacity-75"></span>
            <Star
              className="relative inline-flex h-5 w-5 text-yellow-400"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
            />
          </span>
        )}
      </div>
    </>
  );
};

