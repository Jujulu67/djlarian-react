'use client';

import React, { useState } from 'react';
import { Track, MusicPlatform } from '@/lib/utils/types';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Play, Pause, ExternalLink, Music, Calendar } from 'lucide-react';
import { FaSpotify, FaYoutube, FaSoundcloud, FaApple, FaMusic } from 'react-icons/fa';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

interface MusicCardProps {
  track: Track;
  onPlay: (track: Track) => void;
  isPlaying: boolean;
  isActive: boolean;
}

const platformIcons: Record<MusicPlatform, React.ReactNode> = {
  spotify: <FaSpotify className="w-4 h-4" />,
  youtube: <FaYoutube className="w-4 h-4" />,
  soundcloud: <FaSoundcloud className="w-4 h-4" />,
  apple: <FaApple className="w-4 h-4" />,
  deezer: <FaMusic className="w-4 h-4" />,
};

const platformColors: Record<MusicPlatform, string> = {
  spotify: 'bg-green-500 hover:bg-green-600',
  youtube: 'bg-red-500 hover:bg-red-600',
  soundcloud: 'bg-orange-500 hover:bg-orange-600',
  apple: 'bg-pink-500 hover:bg-pink-600',
  deezer: 'bg-blue-500 hover:bg-blue-600',
};

export const MusicCard: React.FC<MusicCardProps> = ({ track, onPlay, isPlaying, isActive }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Transforme le type en badge
  const getTypeLabel = (type: string) => {
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

  // Extraire toutes les plateformes disponibles
  const availablePlatforms = Object.entries(track.platforms || {})
    .filter(([_, value]) => value?.url)
    .map(([key]) => key as MusicPlatform);

  return (
    <motion.div
      className={`group relative rounded-xl overflow-hidden border transition-all duration-300 transform hover:-translate-y-1 ${
        isActive
          ? 'border-purple-500/70 shadow-lg shadow-purple-500/20 bg-purple-900/30'
          : 'border-gray-700/50 bg-gray-800/30 hover:border-purple-500/50 hover:shadow-lg hover:shadow-purple-500/10'
      }`}
      whileHover={{ scale: 1.02 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Image avec effet de zoom au survol */}
      <div className="relative overflow-hidden" style={{ aspectRatio: '1/1' }}>
        {track.coverUrl && !imageError ? (
          <Image
            src={track.coverUrl}
            alt={track.title}
            width={400}
            height={400}
            className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-r from-purple-900/30 to-blue-900/30 flex items-center justify-center group-hover:scale-105 transition-transform duration-500">
            <Music className="w-16 h-16 text-gray-600" />
          </div>
        )}

        {/* Overlay sombre pour mieux voir les badges */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent opacity-60 group-hover:opacity-70 transition-opacity"></div>

        {/* Badge type de musique */}
        <div className="absolute top-4 left-4">
          <span className="bg-purple-600/90 backdrop-blur-sm text-white px-3.5 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 shadow-lg">
            <Music className="w-3.5 h-3.5" />
            {getTypeLabel(track.type)}
          </span>
        </div>

        {/* Badge Featured */}
        {track.featured && (
          <div className="absolute top-4 right-4">
            <span className="bg-yellow-500/90 backdrop-blur-sm text-white px-3.5 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 shadow-lg">
              Highlight
            </span>
          </div>
        )}

        {/* Bouton de lecture */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onPlay(track);
            }}
            className="bg-purple-600 hover:bg-purple-700 text-white rounded-full p-4 transform transition-all duration-300 hover:scale-110 shadow-xl"
          >
            {isActive && isPlaying ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8" />}
          </button>
        </div>
      </div>

      <div className="p-5">
        <h3 className="text-xl font-bold text-white mb-2 line-clamp-1 group-hover:text-purple-300 transition-colors">
          {track.title}
        </h3>

        <div className="flex items-center text-gray-400 mb-3 text-sm">
          <Calendar className="w-4 h-4 mr-2 flex-shrink-0" />
          <span>{format(parseISO(track.releaseDate), 'd MMMM yyyy', { locale: fr })}</span>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          {track.genre.map((genre, index) => (
            <span
              key={index}
              className="text-xs px-2 py-1 rounded-full bg-gray-700/50 text-gray-300"
            >
              {genre}
            </span>
          ))}
          {track.bpm && (
            <span className="text-xs px-2 py-1 rounded-full bg-gray-700/50 text-gray-300">
              {track.bpm} BPM
            </span>
          )}
        </div>

        {/* Boutons des plateformes */}
        <div className="flex flex-wrap gap-2 mt-4">
          {availablePlatforms.map((platform) => (
            <a
              key={platform}
              href={track.platforms[platform]?.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className={`${platformColors[platform]} text-white px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all hover:scale-105 shadow-md`}
            >
              {platformIcons[platform]}
              {platform}
            </a>
          ))}
        </div>
      </div>

      {/* Effet de brillance au survol */}
      <div className="absolute inset-0 bg-gradient-to-r from-purple-500/0 via-purple-500/5 to-purple-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
    </motion.div>
  );
};

export default MusicCard;
