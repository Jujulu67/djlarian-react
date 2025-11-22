import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Calendar } from 'lucide-react';
import React from 'react';

import { Track } from '@/lib/utils/types';

interface MusicCardInfoProps {
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
 * Component to display track information (title, date, badges)
 */
export const MusicCardInfo: React.FC<MusicCardInfoProps> = ({ track, isPlayerVisible }) => {
  if (isPlayerVisible) {
    return null;
  }

  return (
    <div className="p-5 flex flex-col">
      <div>
        <h3 className="text-xl font-bold text-white mb-1 line-clamp-1 group-hover:text-purple-300 transition-colors">
          {track.title}
        </h3>
        {track.artist && <p className="text-sm text-gray-400 mb-3 line-clamp-1">{track.artist}</p>}

        <div className="flex items-center text-gray-400 mb-3 text-sm">
          <Calendar className="w-4 h-4 mr-2 flex-shrink-0" />
          <span>{format(parseISO(track.releaseDate), 'd MMMM yyyy', { locale: fr })}</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {track.genre.map((genre, index) => (
            <span
              key={index}
              className="text-xs px-2 py-1 rounded-full bg-gray-700/50 text-gray-300 order-3"
            >
              {genre}
            </span>
          ))}
          {track.bpm && (
            <span className="text-xs px-2 py-1 rounded-full bg-gray-700/50 text-gray-300 order-4">
              {track.bpm} BPM
            </span>
          )}
          {track.musicalKey && (
            <span className="text-xs px-2 py-1 rounded-full bg-gray-700/50 text-gray-300 order-5">
              {track.musicalKey}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
