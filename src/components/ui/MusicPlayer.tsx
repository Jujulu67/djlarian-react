'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, Music } from 'lucide-react';
import Image from 'next/image';
import React, { useState, useEffect } from 'react';
import { FaSpotify, FaYoutube, FaSoundcloud, FaApple } from 'react-icons/fa';

import { DeezerIcon } from '@/components/icons/DeezerIcon';
import { getImageUrl } from '@/lib/utils/getImageUrl';
import { getEmbedUrl } from '@/lib/utils/music-service';
import { Track, MusicPlatform } from '@/lib/utils/types';

interface MusicPlayerProps {
  track: Track | null;
  isPlaying: boolean;
  onClose: () => void;
  onTogglePlay: () => void;
}

const MusicPlayer: React.FC<MusicPlayerProps> = ({ track, isPlaying, onClose, onTogglePlay }) => {
  const [selectedPlatform, setSelectedPlatform] = useState<MusicPlatform | null>(null);
  const [embedUrl, setEmbedUrl] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);

  // Sélectionner la première plateforme disponible par défaut
  useEffect(() => {
    if (track) {
      const availablePlatforms = Object.entries(track.platforms || {})
        .filter(([_, value]) => value?.url)
        .map(([key]) => key as MusicPlatform);

      // Ordre de préférence: Spotify, YouTube, SoundCloud, autres
      const preferredOrder: MusicPlatform[] = [
        'spotify',
        'youtube',
        'soundcloud',
        'apple',
        'deezer',
      ];

      let platformToUse: MusicPlatform | null = null;

      // Trouver la première plateforme disponible selon l'ordre de préférence
      for (const platform of preferredOrder) {
        if (availablePlatforms.includes(platform)) {
          platformToUse = platform;
          break;
        }
      }

      // Si aucune plateforme préférée n'est disponible, utiliser la première disponible
      if (!platformToUse && availablePlatforms.length > 0) {
        platformToUse = availablePlatforms[0];
      }

      setSelectedPlatform(platformToUse);
      setImageError(false);
    } else {
      setSelectedPlatform(null);
    }
  }, [track]);

  // Mettre à jour l'URL d'embedding lorsque la plateforme change
  useEffect(() => {
    if (track && selectedPlatform && track.platforms[selectedPlatform]?.url) {
      const url = getEmbedUrl(track.platforms[selectedPlatform]!.url, selectedPlatform);
      setEmbedUrl(url);
    } else {
      setEmbedUrl(null);
    }
  }, [track, selectedPlatform]);

  if (!track) return null;

  // Obtenir toutes les plateformes disponibles pour ce morceau
  const availablePlatforms = Object.entries(track.platforms || {})
    .filter(([_, value]) => value?.url)
    .map(([key]) => key as MusicPlatform);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 50 }}
        className="fixed bottom-0 left-0 right-0 bg-gray-900/95 backdrop-blur-lg border-t border-purple-500/30 p-4 md:p-6 z-50 shadow-xl"
      >
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col">
            {/* Header du player avec informations sur le morceau */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 relative rounded-md overflow-hidden bg-gray-800">
                  {track.imageId && !imageError ? (
                    <Image
                      src={getImageUrl(track.imageId) || ''}
                      alt={track.title}
                      width={64}
                      height={64}
                      className="w-full h-full object-cover"
                      onError={() => setImageError(true)}
                      onLoad={() => setImageError(false)}
                      unoptimized
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-800">
                      <Music className="w-8 h-8 text-gray-600" />
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="text-white font-bold text-lg">{track.title}</h3>
                  <p className="text-gray-400 text-sm">{track.artist}</p>
                </div>
              </div>

              {/* Sélecteur de plateforme */}
              <div className="flex items-center gap-2">
                {availablePlatforms.map((platform) => (
                  <button
                    key={platform}
                    onClick={() => setSelectedPlatform(platform)}
                    className={`p-2 rounded-full focus:rounded-full active:rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500/50 ${
                      selectedPlatform === platform
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-800/70 text-gray-400 hover:bg-gray-700/80'
                    }`}
                    aria-label={`Écouter sur ${platform}`}
                  >
                    {platform === 'spotify' && <FaSpotify className="w-5 h-5" />}
                    {platform === 'youtube' && <FaYoutube className="w-5 h-5" />}
                    {platform === 'soundcloud' && <FaSoundcloud className="w-5 h-5" />}
                    {platform === 'apple' && <FaApple className="w-5 h-5" />}
                    {platform === 'deezer' && <DeezerIcon className="w-5 h-5" />}
                  </button>
                ))}

                <button
                  onClick={onClose}
                  className="p-2 rounded-full focus:rounded-full active:rounded-full bg-gray-800/70 text-gray-400 hover:bg-gray-700/80 ml-2 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                  aria-label="Fermer le lecteur"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Contenu intégré */}
            <div
              className="w-full rounded-lg overflow-hidden bg-black/50 relative"
              style={{
                height: selectedPlatform === 'youtube' ? '360px' : '152px',
              }}
            >
              {embedUrl ? (
                <iframe
                  src={embedUrl}
                  width="100%"
                  height="100%"
                  frameBorder="0"
                  allow="autoplay; encrypted-media"
                  allowFullScreen
                  className="absolute inset-0"
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-gray-400">Lecteur non disponible</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default MusicPlayer;
