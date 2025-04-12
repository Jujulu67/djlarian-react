'use client';

import React from 'react';
import { Track } from '@/lib/utils/types';
import { motion } from 'framer-motion';
import { X, Music, Play, Pause, SkipBack, SkipForward, Volume, VolumeX } from 'lucide-react';
import { useMusicContext } from '@/context/MusicPlayerContext';
import { useTrackImage } from '@/hooks/useTrackImage';
import TrackTitle from './TrackTitle';

interface SimpleMusicPlayerProps {
  track: Track | null;
  isPlaying: boolean;
  onClose: () => void;
  onTogglePlay: () => void;
  onNextTrack?: () => void;
  onPrevTrack?: () => void;
}

const SimpleMusicPlayer: React.FC<SimpleMusicPlayerProps> = ({
  track,
  isPlaying,
  onClose,
  onTogglePlay,
  onNextTrack,
  onPrevTrack,
}) => {
  const { volume, isMuted, setVolume, toggleMute } = useMusicContext();

  // Utiliser le hook personnalisé pour l'image
  const { ImageComponent } = useTrackImage({
    coverUrl: track?.coverUrl,
    title: track?.title || 'Track cover',
    size: 48,
    className: 'w-full h-full object-cover',
    testId: 'footer-track-cover',
  });

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolumePercent = parseInt(e.target.value);
    setVolume(newVolumePercent);
  };

  if (!track) return null;

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      transition={{ type: 'spring', damping: 20 }}
      className="fixed bottom-0 left-0 right-0 bg-gradient-to-r from-gray-900/95 to-gray-800/95 backdrop-blur-md border-t border-purple-500/30 shadow-[0_-4px_20px_rgba(139,92,246,0.15)] z-50"
      data-footer-player="true"
      data-testid="footer-player"
    >
      <div className="max-w-7xl mx-auto p-3">
        <div className="grid grid-cols-3 items-center">
          {/* Info du morceau (à gauche) */}
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-12 h-12 relative rounded-md overflow-hidden bg-gray-800 flex-shrink-0 ring-1 ring-purple-500/20">
              {ImageComponent}
            </div>
            <div className="min-w-0 flex-1">
              <TrackTitle
                title={track.title}
                testId="footer-track-title"
                className="text-white font-bold text-sm truncate"
              />
              <p className="text-gray-400 text-xs truncate">{track.artist}</p>
            </div>
          </div>

          {/* Contrôles (centrés) */}
          <div className="flex items-center justify-center space-x-4">
            {/* Précédent */}
            {onPrevTrack && (
              <button
                onClick={onPrevTrack}
                className="p-2 text-gray-400 hover:text-white transition-colors rounded-full hover:bg-gray-800"
                aria-label="Morceau précédent"
                data-footer-control="true"
                data-testid="prev-button"
              >
                <SkipBack className="w-5 h-5" />
              </button>
            )}

            {/* Lecture/Pause */}
            <button
              onClick={onTogglePlay}
              className="p-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-full transition-all transform hover:scale-105 shadow-md shadow-purple-700/20"
              aria-label={isPlaying ? 'Pause' : 'Lecture'}
              data-footer-control="true"
              data-testid="footer-play-button"
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
            </button>

            {/* Suivant */}
            {onNextTrack && (
              <button
                onClick={onNextTrack}
                className="p-2 text-gray-400 hover:text-white transition-colors rounded-full hover:bg-gray-800"
                aria-label="Morceau suivant"
                data-footer-control="true"
                data-testid="next-button"
              >
                <SkipForward className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Volume et bouton de fermeture (à droite) */}
          <div className="flex justify-end items-center space-x-3">
            {/* Contrôle du volume */}
            <div className="flex items-center space-x-2 group">
              <button
                onClick={toggleMute}
                className="p-1.5 text-gray-400 hover:text-white transition-colors rounded-full hover:bg-gray-800"
                aria-label={isMuted ? 'Réactiver le son' : 'Couper le son'}
                data-footer-control="true"
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume className="w-4 h-4" />}
              </button>

              {/* Conteneur de volume qui s'étend sur hover */}
              <div className="relative h-8 flex items-center">
                {/* Slider de volume visible en permanence sur desktop, au hover sur mobile */}
                <div className="w-0 md:w-20 group-hover:w-20 transition-all duration-200 overflow-hidden h-6 flex items-center">
                  {/* Barre de volume */}
                  <div className="w-20 h-1.5 bg-gray-800 rounded-full overflow-hidden relative mx-1">
                    <div
                      className="h-full bg-gradient-to-r from-purple-600 to-purple-400"
                      style={{ width: `${volume * 100}%` }}
                    ></div>

                    {/* Petit rond sur le slider */}
                    <div
                      className="absolute top-1/2 transform -translate-y-1/2 w-2.5 h-2.5 bg-white rounded-full shadow-sm"
                      style={{
                        left: `calc(${volume * 100}% - ${volume > 0 ? '4px' : '0px'})`,
                        opacity: volume > 0 ? 1 : 0,
                      }}
                    ></div>

                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="1"
                      value={volume * 100}
                      onChange={handleSliderChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      aria-label="Volume"
                      data-footer-control="true"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Bouton de fermeture */}
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white transition-colors rounded-full hover:bg-gray-800"
              aria-label="Fermer le lecteur"
              data-footer-control="true"
              data-testid="close-button"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default SimpleMusicPlayer;
