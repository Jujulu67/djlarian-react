import React from 'react';
import { FaSpotify, FaYoutube, FaSoundcloud, FaApple } from 'react-icons/fa';

import { DeezerIcon } from '@/components/icons/DeezerIcon';
import { Track, MusicPlatform } from '@/lib/utils/types';

const platformIcons: Record<MusicPlatform, React.ReactNode> = {
  spotify: <FaSpotify className="w-4 h-4" />,
  youtube: <FaYoutube className="w-4 h-4" />,
  soundcloud: <FaSoundcloud className="w-4 h-4" />,
  apple: <FaApple className="w-4 h-4" />,
  deezer: <DeezerIcon className="w-4 h-4" />,
};

const platformColors: Record<MusicPlatform, string> = {
  spotify: 'bg-green-500 hover:bg-green-600',
  youtube: 'bg-red-500 hover:bg-red-600',
  soundcloud: 'bg-orange-500 hover:bg-orange-600',
  apple: 'bg-pink-500 hover:bg-pink-600',
  deezer: 'bg-blue-500 hover:bg-blue-600',
};

const platformTitles: Record<MusicPlatform, string> = {
  spotify: 'Écouter sur Spotify',
  youtube: 'Voir sur YouTube',
  soundcloud: 'Écouter sur SoundCloud',
  apple: 'Écouter sur Apple Music',
  deezer: 'Écouter sur Deezer',
};

interface MusicCardPlatformsProps {
  track: Track;
  isPlayerVisible: boolean;
}

/**
 * Component to display platform badges/links
 */
export const MusicCardPlatforms: React.FC<MusicCardPlatformsProps> = ({
  track,
  isPlayerVisible,
}) => {
  if (isPlayerVisible) {
    return null;
  }

  const platforms: Array<{ platform: MusicPlatform; url: string }> = [];

  if (track.platforms.youtube?.url) {
    platforms.push({ platform: 'youtube', url: track.platforms.youtube.url });
  }
  if (track.platforms.soundcloud?.url) {
    platforms.push({ platform: 'soundcloud', url: track.platforms.soundcloud.url });
  }
  if (track.platforms.spotify?.url) {
    platforms.push({ platform: 'spotify', url: track.platforms.spotify.url });
  }
  if (track.platforms.apple?.url) {
    platforms.push({ platform: 'apple', url: track.platforms.apple.url });
  }
  if (track.platforms.deezer?.url) {
    platforms.push({ platform: 'deezer', url: track.platforms.deezer.url });
  }

  if (platforms.length === 0) {
    return null;
  }

  return (
    <div className="absolute top-4 right-4 flex flex-row items-center gap-2 z-10">
      {platforms.map(({ platform, url }) => (
        <a
          key={platform}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className={`${platformColors[platform]} text-white p-1.5 rounded-full focus:rounded-full active:rounded-full transition-all hover:scale-105 shadow-md focus:outline-none focus:ring-2 focus:ring-purple-500/50`}
          title={platformTitles[platform]}
        >
          {platformIcons[platform]}
        </a>
      ))}
    </div>
  );
};
