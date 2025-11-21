'use client';

import { motion } from 'framer-motion';
import { X, Music, Play, Pause, SkipBack, SkipForward, Volume, VolumeX } from 'lucide-react';
import Image from 'next/image';
import React, { useState, useEffect, useRef } from 'react';

import { logger } from '@/lib/logger';
import { getInitialVolume, applyVolumeToAllPlayers } from '@/lib/utils/audioUtils';
import { getImageUrl } from '@/lib/utils/getImageUrl';
import type { Track } from '@/lib/utils/types';

interface SimpleMusicPlayerProps {
  track: Track | null;
  isPlaying: boolean;
  onClose: () => void;
  onFooterToggle: () => void;
  onNextTrack?: () => void;
  onPrevTrack?: () => void;
}

/**
 * SimpleMusicPlayer Component:
 * A persistent footer player that displays the currently playing track and controls.
 * Manages local UI state for volume slider/mute based on the global volume, and handles
 * user interactions for volume changes, play/pause, next/prev track, and closing the player.
 */
const SimpleMusicPlayer: React.FC<SimpleMusicPlayerProps> = ({
  track,
  isPlaying,
  onClose,
  onFooterToggle,
  onNextTrack,
  onPrevTrack,
}) => {
  const [imageError, setImageError] = useState(false);
  const [volume, setVolume] = useState(() => getInitialVolume() * 100);
  const [isMuted, setIsMuted] = useState(() => getInitialVolume() === 0);
  const [internalIsPlaying, setInternalIsPlaying] = useState(isPlaying);
  const previousVolumeRef = useRef<number>(getInitialVolume());
  const isProcessingFooterToggle = useRef(false);

  useEffect(() => {
    setInternalIsPlaying(isPlaying);
    logger.debug(`SimpleMusicPlayer: état de lecture mis à jour à ${isPlaying ? 'play' : 'pause'}`);
    isProcessingFooterToggle.current = false;
    logger.debug('SimpleMusicPlayer: Footer toggle lock released (immediately on prop update).');
  }, [isPlaying]);

  useEffect(() => {
    if (track) {
      setImageError(false);
      logger.debug(
        `SimpleMusicPlayer: Réinitialisation de l\'erreur d\'image pour la piste ${track.id}`
      );
    }
  }, [track]);

  useEffect(() => {
    try {
      logger.debug('Initialisation du lecteur musical et chargement du volume...');
      const initialVolume = getInitialVolume();
      setVolume(initialVolume * 100);
      setIsMuted(initialVolume === 0);
      applyVolumeToAllPlayers(initialVolume);
      if (initialVolume > 0) {
        previousVolumeRef.current = initialVolume;
      } else {
        try {
          const prevVolStr = localStorage.getItem('prev-volume');
          previousVolumeRef.current = prevVolStr ? Number(prevVolStr) : 0.5;
        } catch {
          previousVolumeRef.current = 0.5;
        }
      }
      logger.debug(`Volume initialisé et appliqué: ${initialVolume * 100}%`);
    } catch (error) {
      logger.error("Erreur lors de l'initialisation du volume:", error);
    }
  }, []);

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const newVolumeValue = parseInt(e.target.value);
      const newVolumeNormalized = newVolumeValue / 100;
      logger.debug(`Volume slider changed to ${newVolumeValue}%`);

      setVolume(newVolumeValue);
      setIsMuted(newVolumeNormalized === 0);

      const appliedVolume = applyVolumeToAllPlayers(newVolumeNormalized);
      logger.debug(`Volume appliqué à tous les lecteurs: ${appliedVolume * 100}%`);

      if (appliedVolume > 0) {
        previousVolumeRef.current = appliedVolume;
        try {
          localStorage.setItem('prev-volume', String(appliedVolume));
        } catch (error) {
          logger.error('Could not save previous volume to localStorage', error);
        }
      }
    } catch (error) {
      logger.error('Erreur lors du changement de volume:', error);
    }
  };

  const toggleMute = () => {
    try {
      const currentVolume = previousVolumeRef.current;
      const newMuted = !isMuted;
      logger.debug(newMuted ? 'Activation du mute' : 'Désactivation du mute');

      setIsMuted(newMuted);

      if (newMuted) {
        if (currentVolume > 0) {
          previousVolumeRef.current = currentVolume;
          try {
            localStorage.setItem('prev-volume', currentVolume.toString());
            logger.debug(`Sauvegarde du volume précédent: ${currentVolume * 100}%`);
          } catch (error) {
            logger.error('Could not save previous volume to localStorage', error);
          }
        }
        setVolume(0);
        applyVolumeToAllPlayers(0);
        logger.debug('Volume mis à zéro et appliqué');
      } else {
        const volumeToRestore = previousVolumeRef.current > 0 ? previousVolumeRef.current : 0.5;
        logger.debug(`Restauration du volume précédent: ${volumeToRestore * 100}%`);

        setVolume(volumeToRestore * 100);
        applyVolumeToAllPlayers(volumeToRestore);
        logger.debug(`Volume restauré à ${volumeToRestore * 100}% et appliqué`);
      }
    } catch (error) {
      logger.error("Erreur lors du changement de l'état muet:", error);
    }
    onFooterToggle();
  };

  const handleTogglePlay = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    e.nativeEvent.stopImmediatePropagation();

    if (isProcessingFooterToggle.current) {
      logger.debug('Footer toggle ignoré (traitement en cours)');
      return;
    }
    isProcessingFooterToggle.current = true;
    logger.debug('SimpleMusicPlayer: Footer toggle lock acquired, calling onFooterToggle');
    onFooterToggle();
  };

  const handleClose = () => {
    onClose();
  };

  const handleImageError = () => {
    setImageError(true);
  };

  if (!track) return null;

  return (
    <motion.div
      data-footer-player="true"
      initial={{ y: '100%', opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: '100%', opacity: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-black via-gray-900/95 to-gray-900/90 backdrop-blur-md shadow-lg z-50 border-t border-gray-700/50 p-3 md:p-4 rounded-t-2xl"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 md:gap-6">
        <div className="flex items-center gap-3 md:gap-4 flex-1 min-w-0 md:flex-none md:w-1/4">
          <div className="relative flex-shrink-0 w-12 h-12 md:w-16 md:h-16 rounded-md overflow-hidden border border-gray-700/50 bg-gray-800">
            {imageError || !track.imageId ? (
              <div className="w-full h-full bg-gradient-to-r from-purple-900/30 to-blue-900/30 flex items-center justify-center">
                <Music className="w-16 h-16 text-gray-600" />
              </div>
            ) : (
              <Image
                src={getImageUrl(track.imageId) || ''}
                alt={track.title}
                fill
                className="object-cover object-center"
                onError={handleImageError}
                onLoad={() => setImageError(false)}
                unoptimized
              />
            )}
          </div>
          <div className="min-w-0">
            <p className="text-sm md:text-base font-semibold text-white truncate">
              {track.title || 'Titre inconnu'}
            </p>
            <p className="text-xs md:text-sm text-gray-400 truncate">
              {track.artist || 'Artiste inconnu'}
            </p>
          </div>
        </div>

        <div
          className="flex justify-center items-center gap-2 md:gap-4 flex-shrink-0"
          data-footer-control="true"
        >
          {onPrevTrack && (
            <button
              onClick={onPrevTrack}
              aria-label="Piste précédente"
              className="text-gray-300 hover:text-white transition-colors p-1.5 md:p-2 rounded-full hover:bg-gray-700/50"
            >
              <SkipBack className="w-4 h-4 md:w-5 md:h-5" />
            </button>
          )}
          <button
            onClick={handleTogglePlay}
            aria-label={internalIsPlaying ? 'Pause' : 'Lecture'}
            className="bg-purple-600 text-white rounded-full p-2.5 md:p-3 hover:bg-purple-700 transition-colors shadow-md"
          >
            {internalIsPlaying ? (
              <Pause className="w-5 h-5 md:w-6 md:h-6" />
            ) : (
              <Play className="w-5 h-5 md:w-6 md:h-6" />
            )}
          </button>
          {onNextTrack && (
            <button
              onClick={onNextTrack}
              aria-label="Piste suivante"
              className="text-gray-300 hover:text-white transition-colors p-1.5 md:p-2 rounded-full hover:bg-gray-700/50"
            >
              <SkipForward className="w-4 h-4 md:w-5 md:h-5" />
            </button>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 md:gap-4 flex-shrink-0 md:w-1/4">
          <div
            className="hidden md:flex items-center gap-2 flex-shrink-0"
            data-footer-control="true"
          >
            <button
              onClick={toggleMute}
              aria-label={isMuted ? 'Réactiver le son' : 'Désactiver le son'}
              className="text-gray-400 hover:text-white transition-colors p-1.5 rounded-full hover:bg-gray-700/50"
            >
              {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume className="w-5 h-5" />}
            </button>
            <input
              type="range"
              min="0"
              max="100"
              value={volume}
              onChange={handleVolumeChange}
              className="w-20 h-1.5 bg-gray-600 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-purple-500 [&::-webkit-slider-thumb]:rounded-full [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:bg-purple-500 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-none"
              aria-label="Contrôle du volume"
            />
          </div>

          {/* Bouton muet visible sur mobile */}
          <button
            onClick={toggleMute}
            aria-label={isMuted ? 'Réactiver le son' : 'Désactiver le son'}
            className="md:hidden text-gray-400 hover:text-white transition-colors p-1.5 rounded-full hover:bg-gray-700/50 flex-shrink-0"
            data-footer-control="true"
          >
            {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume className="w-5 h-5" />}
          </button>

          <button
            onClick={handleClose}
            aria-label="Fermer le lecteur"
            className="text-gray-400 hover:text-white transition-colors p-1.5 md:p-2 rounded-full hover:bg-gray-700/50 flex-shrink-0"
            data-footer-control="true"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default SimpleMusicPlayer;
