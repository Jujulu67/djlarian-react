import React from 'react';
import { FaSpotify, FaYoutube, FaSoundcloud, FaApple } from 'react-icons/fa';

import { DeezerIcon } from '@/components/icons/DeezerIcon';
import type { MusicPlatform } from '@/lib/utils/types';

export const platformLabels: Record<MusicPlatform, string> = {
  spotify: 'Spotify',
  youtube: 'YouTube',
  soundcloud: 'SoundCloud',
  apple: 'Apple Music',
  deezer: 'Deezer',
};

export const platformIcons: Record<MusicPlatform, React.ReactNode> = {
  spotify: React.createElement(FaSpotify, { className: 'w-5 h-5' }),
  youtube: React.createElement(FaYoutube, { className: 'w-5 h-5' }),
  soundcloud: React.createElement(FaSoundcloud, { className: 'w-5 h-5' }),
  apple: React.createElement(FaApple, { className: 'w-5 h-5' }),
  deezer: React.createElement(DeezerIcon, { className: 'w-5 h-5' }),
};

export type AdminMusicTab = 'tracks' | 'collections' | 'auto-detect';
