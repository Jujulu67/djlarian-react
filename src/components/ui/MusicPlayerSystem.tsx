'use client';

import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Music,
  Play,
  Pause,
  ChevronUp,
  Volume2,
  Volume1,
  VolumeX,
  ExternalLink,
  Maximize2,
  Minimize2,
  SkipBack,
  SkipForward,
} from 'lucide-react';
import Image from 'next/image';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FaSpotify, FaYoutube, FaSoundcloud, FaApple } from 'react-icons/fa';

import { DeezerIcon } from '@/components/icons/DeezerIcon';
import { logger } from '@/lib/logger';
import { isNotEmpty } from '@/lib/utils/arrayHelpers';
import { getImageUrl } from '@/lib/utils/getImageUrl';
import { getEmbedUrl } from '@/lib/utils/music-service';
import type { Track, MusicPlatform } from '@/lib/utils/types';

interface MusicPlayerSystemProps {
  track: Track | null;
  isPlaying: boolean;
  onClose: () => void;
  onTogglePlay: () => void;
  onNextTrack?: () => void;
  onPrevTrack?: () => void;
}

export const MusicPlayerSystem: React.FC<MusicPlayerSystemProps> = ({
  track,
  isPlaying,
  onClose,
  onTogglePlay,
  onNextTrack,
  onPrevTrack,
}) => {
  // Supprimer les logs qui causent des rendus excessifs
  // logger.debug('MusicPlayerSystem rendu avec:', { track: track?.title, isPlaying });

  const [selectedPlatform, setSelectedPlatform] = useState<MusicPlatform | null>(null);
  const [embedUrl, setEmbedUrl] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [youtubeVideoId, setYoutubeVideoId] = useState<string | null>(null);
  const [showYoutubeModal, setShowYoutubeModal] = useState(false);
  const [volume, setVolume] = useState(80);
  const [muted, setMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const miniPlayerRef = useRef<HTMLDivElement>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Formater le temps (secondes -> MM:SS)
  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Extraire l'ID YouTube de l'URL
  const extractYoutubeId = (url: string): string | null => {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
    return match ? match[1] : null;
  };

  // Simuler la progression pour les plateformes autres que YouTube
  const stopProgressInterval = useCallback(() => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  }, []);

  const startProgressInterval = useCallback(() => {
    stopProgressInterval();

    // Durée simulée de 3 minutes si pas de durée réelle
    const estimatedDuration = duration || 180;

    progressIntervalRef.current = setInterval(() => {
      setProgress((prev) => {
        // Réinitialiser à la fin
        if (prev >= estimatedDuration) {
          if (onNextTrack) onNextTrack();
          return 0;
        }
        return prev + 0.5;
      });
    }, 500);
  }, [duration, onNextTrack, stopProgressInterval]);

  const restartProgressInterval = useCallback(() => {
    stopProgressInterval();
    if (isPlaying) {
      startProgressInterval();
    }
  }, [isPlaying, stopProgressInterval, startProgressInterval]);

  // Sélectionner la plateforme par défaut
  useEffect(() => {
    if (track) {
      logger.debug('useEffect [track] déclenché, track =', track.title);

      const availablePlatforms = Object.entries(track.platforms || {})
        .filter(([_, value]) => value?.url)
        .map(([key]) => key as MusicPlatform);

      const preferredOrder: MusicPlatform[] = [
        'spotify',
        'youtube',
        'soundcloud',
        'apple',
        'deezer',
      ];

      let platformToUse: MusicPlatform | null = null;

      for (const platform of preferredOrder) {
        if (availablePlatforms.includes(platform)) {
          platformToUse = platform;
          break;
        }
      }

      if (!platformToUse && isNotEmpty(availablePlatforms)) {
        platformToUse = availablePlatforms[0];
      }

      setSelectedPlatform(platformToUse);

      // Si YouTube est sélectionné, extraire l'ID de la vidéo
      if (platformToUse === 'youtube' && track.platforms.youtube?.url) {
        const videoId = extractYoutubeId(track.platforms.youtube.url);
        setYoutubeVideoId(videoId);
      } else {
        setYoutubeVideoId(null);
      }

      setImageError(false);

      // Réinitialiser la progression
      setProgress(0);
      setDuration(0);

      // Démarrer la progression simulée pour les plateformes non-YouTube
      startProgressInterval();
    } else {
      setSelectedPlatform(null);
      setYoutubeVideoId(null);
      stopProgressInterval();
    }

    return () => {
      stopProgressInterval();
    };
  }, [track, stopProgressInterval, startProgressInterval]);

  // Mettre à jour l'URL d'embedding
  useEffect(() => {
    if (track && selectedPlatform && track.platforms[selectedPlatform]?.url) {
      logger.debug('useEffect [track, selectedPlatform] déclenché, plateforme =', selectedPlatform);

      if (selectedPlatform === 'youtube') {
        const videoId = extractYoutubeId(track.platforms.youtube!.url);
        logger.debug('YouTube ID extrait:', videoId);
        setYoutubeVideoId(videoId);
        setEmbedUrl(null); // On n'utilise pas d'iframe pour YouTube
      } else {
        const url = getEmbedUrl(track.platforms[selectedPlatform]!.url, selectedPlatform);
        logger.debug("URL d'embedding générée:", url);
        setEmbedUrl(url);
        setYoutubeVideoId(null);
      }

      // Réinitialiser la progression à chaque changement de plateforme
      setProgress(0);
      setDuration(0);

      // Redémarrer la simulation de progression
      restartProgressInterval();
    } else {
      setEmbedUrl(null);
      setYoutubeVideoId(null);
      stopProgressInterval();
    }
  }, [track, selectedPlatform, restartProgressInterval, stopProgressInterval]);

  // Gérer la lecture/pause
  useEffect(() => {
    if (isPlaying) {
      startProgressInterval();
    } else {
      stopProgressInterval();
    }
  }, [isPlaying, startProgressInterval, stopProgressInterval]);

  // Gérer le changement de position dans la piste
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const seekTime = parseFloat(e.target.value);
    setProgress(seekTime);
  };

  // Gérer le changement de volume
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseInt(e.target.value);
    setVolume(newVolume);
    setMuted(newVolume === 0);
  };

  // Gérer la fonction muet
  const toggleMute = () => {
    setMuted(!muted);
  };

  // Ouvrir le modal YouTube simplifié
  const openYoutubePlayer = () => {
    if (youtubeVideoId) {
      setShowYoutubeModal(true);
      setIsFullScreen(true);
    }
  };

  // Gérer le swipe vers le haut (pour ouvrir le lecteur complet)
  const handleSwipeUp = () => {
    setIsFullScreen(true);
  };

  if (!track) return null;

  // Obtenir les plateformes disponibles
  const availablePlatforms = Object.entries(track.platforms || {})
    .filter(([_, value]) => value?.url)
    .map(([key]) => key as MusicPlatform);

  // Icône de volume basée sur le niveau
  const getVolumeIcon = () => {
    if (muted || volume === 0) return <VolumeX />;
    if (volume < 50) return <Volume1 />;
    return <Volume2 />;
  };

  return (
    <>
      {/* Mini-lecteur (toujours présent quand un morceau est sélectionné) */}
      <motion.div
        ref={miniPlayerRef}
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: isFullScreen ? 100 : 0, opacity: isFullScreen ? 0 : 1 }}
        exit={{ y: 100, opacity: 0 }}
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        onDragEnd={(_, info) => {
          if (info.offset.y < -50) {
            handleSwipeUp();
          }
        }}
        className="fixed bottom-0 left-0 right-0 bg-gray-900/95 backdrop-blur-md border-t border-purple-500/30 p-3 z-50 shadow-xl"
      >
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col">
            {/* Barre de progression améliorée */}
            <div className="w-full h-2 bg-gray-800/60 rounded-full mb-3 relative group">
              <div
                className="absolute h-full bg-gradient-to-r from-purple-600 to-blue-500 rounded-full"
                style={{ width: `${duration > 0 ? (progress / duration) * 100 : 0}%` }}
              ></div>
              {/* Point de repère visible */}
              <div
                className="absolute top-1/2 transform -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-md transition-all"
                style={{
                  left: `calc(${duration > 0 ? (progress / duration) * 100 : 0}% - 6px)`,
                  opacity: duration > 0 ? 1 : 0,
                }}
              ></div>
              <input
                type="range"
                min="0"
                max={duration || 180}
                value={progress}
                onChange={handleSeek}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
            </div>

            {/* Temps au-dessus des contrôles */}
            <div className="flex justify-between text-gray-400 text-xs mb-2 px-1">
              <span>{formatTime(progress)}</span>
              <span>{formatTime(duration)}</span>
            </div>

            <div className="flex items-center justify-between">
              {/* Info du morceau */}
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-12 h-12 relative rounded-md overflow-hidden bg-gray-800 flex-shrink-0">
                  {track.imageId && !imageError ? (
                    <Image
                      src={getImageUrl(track.imageId) || ''}
                      alt={track.title}
                      width={48}
                      height={48}
                      className="w-full h-full object-cover"
                      onError={() => setImageError(true)}
                      onLoad={() => setImageError(false)}
                      unoptimized
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-r from-purple-900/30 to-blue-900/30 flex items-center justify-center">
                      <Music className="w-6 h-6 text-gray-600" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-white font-bold text-sm truncate">{track.title}</h3>
                  <p className="text-gray-400 text-xs truncate">{track.artist}</p>
                </div>
              </div>

              {/* Contrôles avec volume amélioré */}
              <div className="flex items-center gap-3">
                {/* Volume (amélioré et affiché sur tous les dispositifs) */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={toggleMute}
                    className="p-2 text-gray-400 hover:text-gray-200 transition-colors"
                    aria-label={muted ? 'Réactiver le son' : 'Couper le son'}
                  >
                    {getVolumeIcon()}
                  </button>
                  <div className="hidden md:block w-24 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-purple-600 to-blue-500 rounded-full"
                      style={{ width: `${muted ? 0 : volume}%` }}
                    ></div>
                  </div>
                </div>

                {/* Précédent */}
                {onPrevTrack && (
                  <button
                    onClick={onPrevTrack}
                    className="p-2 text-gray-400 hover:text-gray-200 transition-colors"
                    aria-label="Morceau précédent"
                  >
                    <SkipBack className="w-5 h-5" />
                  </button>
                )}

                {/* Lecture/Pause */}
                <button
                  onClick={onTogglePlay}
                  className="p-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-full focus:rounded-full active:rounded-full transition-all transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                  aria-label={isPlaying ? 'Pause' : 'Lecture'}
                >
                  {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                </button>

                {/* Suivant */}
                {onNextTrack && (
                  <button
                    onClick={onNextTrack}
                    className="p-2 text-gray-400 hover:text-gray-200 transition-colors"
                    aria-label="Morceau suivant"
                  >
                    <SkipForward className="w-5 h-5" />
                  </button>
                )}

                {/* YouTube - ouverture du modal */}
                {selectedPlatform === 'youtube' && (
                  <button
                    onClick={openYoutubePlayer}
                    className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-full focus:rounded-full active:rounded-full transition-all transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-red-500/50"
                    aria-label="Ouvrir YouTube"
                  >
                    <FaYoutube className="w-5 h-5" />
                  </button>
                )}

                {/* Plein écran */}
                <button
                  onClick={() => setIsFullScreen(true)}
                  className="p-2 text-gray-400 hover:text-gray-200 transition-colors"
                  aria-label="Agrandir le lecteur"
                >
                  <ChevronUp className="w-5 h-5" />
                </button>

                {/* Fermer */}
                <button
                  onClick={onClose}
                  className="p-2 text-gray-400 hover:text-gray-200 transition-colors"
                  aria-label="Fermer le lecteur"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Lecteur complet (affiché uniquement en mode plein écran) */}
      <AnimatePresence>
        {isFullScreen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-gray-900/98 backdrop-blur-lg z-50 flex flex-col p-4 md:p-6"
          >
            <div className="max-w-4xl w-full mx-auto flex-1 flex flex-col">
              {/* Header */}
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-white">En lecture</h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => setIsFullScreen(false)}
                    className="p-2 bg-gray-800/70 hover:bg-gray-700/80 text-gray-400 rounded-full focus:rounded-full active:rounded-full focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                    aria-label="Minimiser le lecteur"
                  >
                    <Minimize2 className="w-5 h-5" />
                  </button>
                  <button
                    onClick={onClose}
                    className="p-2 bg-gray-800/70 hover:bg-gray-700/80 text-gray-400 rounded-full focus:rounded-full active:rounded-full focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                    aria-label="Fermer le lecteur"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Contenu principal */}
              <div className="flex-1 flex flex-col">
                {/* Couverture et infos */}
                <div className="flex flex-col items-center mb-8">
                  <div className="w-64 h-64 md:w-80 md:h-80 relative rounded-lg overflow-hidden bg-gray-800 mb-6 shadow-xl">
                    {track.imageId && !imageError ? (
                      <Image
                        src={getImageUrl(track.imageId) || ''}
                        alt={`Pochette de ${track.title} par ${track.artist}`}
                        width={320}
                        height={320}
                        className="w-full h-full object-cover"
                        priority
                        onError={() => setImageError(true)}
                        onLoad={() => setImageError(false)}
                        unoptimized
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-r from-purple-900/30 to-blue-900/30 flex items-center justify-center">
                        <Music className="w-20 h-20 text-gray-600" />
                      </div>
                    )}
                  </div>

                  <h1 className="text-2xl font-bold text-white mb-2 text-center">{track.title}</h1>
                  <p className="text-gray-400 mb-4 text-center">{track.artist}</p>

                  <div className="flex flex-wrap justify-center gap-2 mb-4">
                    {track.genre.map((genre, index) => (
                      <span
                        key={index}
                        className="text-xs px-3 py-1 rounded-full bg-gray-800/70 text-gray-300"
                      >
                        {genre}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Barre de progression avec affichage du temps */}
                <div className="w-full mb-6">
                  <div className="flex justify-between text-gray-400 text-sm mb-2">
                    <span>{formatTime(progress)}</span>
                    <span>{formatTime(duration)}</span>
                  </div>
                  <div className="w-full h-2 bg-gray-800 rounded-full relative">
                    <div
                      className="absolute h-full bg-purple-600 rounded-full"
                      style={{ width: `${duration > 0 ? (progress / duration) * 100 : 0}%` }}
                    ></div>
                    <input
                      type="range"
                      min="0"
                      max={duration || 180}
                      value={progress}
                      onChange={handleSeek}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                  </div>
                </div>

                {/* Volume */}
                <div className="flex items-center justify-center gap-4 mb-8">
                  <button
                    onClick={toggleMute}
                    className="p-2 text-gray-400 hover:text-white"
                    aria-label={muted ? 'Réactiver le son' : 'Couper le son'}
                  >
                    {getVolumeIcon()}
                  </button>
                  <div className="relative w-32 md:w-48 h-2 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-purple-600 to-blue-500 rounded-full"
                      style={{ width: `${muted ? 0 : volume}%` }}
                    ></div>
                    {/* Point de repère visible */}
                    <div
                      className="absolute top-1/2 transform -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-md"
                      style={{
                        left: `calc(${muted ? 0 : volume}% - 8px)`,
                        opacity: 0.9,
                      }}
                    ></div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={muted ? 0 : volume}
                      onChange={handleVolumeChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                  </div>
                </div>

                {/* Sélecteur de plateforme */}
                <div className="flex justify-center gap-3 mb-8">
                  {availablePlatforms.map((platform) => (
                    <button
                      key={platform}
                      onClick={() => setSelectedPlatform(platform)}
                      className={`p-3 rounded-full focus:rounded-full active:rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500/50 ${
                        selectedPlatform === platform
                          ? platform === 'youtube'
                            ? 'bg-red-600 text-white'
                            : platform === 'spotify'
                              ? 'bg-green-600 text-white'
                              : 'bg-purple-600 text-white'
                          : 'bg-gray-800/70 text-gray-400 hover:bg-gray-700/80'
                      }`}
                      aria-label={`Écouter sur ${platform}`}
                    >
                      {platform === 'spotify' && <FaSpotify className="w-6 h-6" />}
                      {platform === 'youtube' && <FaYoutube className="w-6 h-6" />}
                      {platform === 'soundcloud' && <FaSoundcloud className="w-6 h-6" />}
                      {platform === 'apple' && <FaApple className="w-6 h-6" />}
                      {platform === 'deezer' && <DeezerIcon className="w-6 h-6" />}
                    </button>
                  ))}
                </div>

                {/* Lecteur intégré (non YouTube) */}
                {selectedPlatform !== 'youtube' && embedUrl && (
                  <div className="w-full h-24 md:h-28 rounded-lg overflow-hidden bg-black/50 relative mb-8">
                    <iframe
                      src={embedUrl}
                      width="100%"
                      height="100%"
                      frameBorder="0"
                      allow="autoplay; encrypted-media"
                      allowFullScreen
                      className="absolute inset-0"
                    />
                  </div>
                )}

                {/* Si YouTube est sélectionné, montrer un bouton pour ouvrir le modal YouTube */}
                {selectedPlatform === 'youtube' && youtubeVideoId && (
                  <div className="flex justify-center my-6">
                    <button
                      onClick={openYoutubePlayer}
                      className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-full focus:rounded-full active:rounded-full font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-red-500/50"
                    >
                      <FaYoutube className="w-5 h-5" />
                      Regarder sur YouTube
                    </button>
                  </div>
                )}

                {/* Contrôles de lecture */}
                <div className="flex justify-center items-center gap-6 mt-auto">
                  {onPrevTrack && (
                    <button
                      onClick={onPrevTrack}
                      className="p-3 bg-gray-800/70 hover:bg-gray-700/80 text-gray-300 rounded-full focus:rounded-full active:rounded-full focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                      aria-label="Morceau précédent"
                    >
                      <SkipBack className="w-8 h-8" />
                    </button>
                  )}

                  <button
                    onClick={onTogglePlay}
                    className="p-5 bg-purple-600 hover:bg-purple-700 text-white rounded-full focus:rounded-full active:rounded-full focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                    aria-label={isPlaying ? 'Pause' : 'Lecture'}
                  >
                    {isPlaying ? (
                      <Pause className="w-10 h-10" />
                    ) : (
                      <Play className="w-10 h-10 pl-1" />
                    )}
                  </button>

                  {onNextTrack && (
                    <button
                      onClick={onNextTrack}
                      className="p-3 bg-gray-800/70 hover:bg-gray-700/80 text-gray-300 rounded-full focus:rounded-full active:rounded-full focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                      aria-label="Morceau suivant"
                    >
                      <SkipForward className="w-8 h-8" />
                    </button>
                  )}
                </div>

                {/* Lien externe */}
                {selectedPlatform && track.platforms[selectedPlatform]?.url && (
                  <div className="flex justify-center mt-8">
                    <a
                      href={track.platforms[selectedPlatform]!.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span className="text-sm">
                        Ouvrir sur{' '}
                        {selectedPlatform.charAt(0).toUpperCase() + selectedPlatform.slice(1)}
                      </span>
                    </a>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal YouTube simplifié avec iframe standard */}
      <AnimatePresence>
        {showYoutubeModal && youtubeVideoId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/95 z-50 flex flex-col p-4"
          >
            <div className="flex justify-end mb-4">
              <button
                onClick={() => {
                  setShowYoutubeModal(false);
                }}
                className="p-2 bg-gray-800/70 text-white rounded-full focus:rounded-full active:rounded-full focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                aria-label="Fermer la vidéo"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 flex items-center justify-center">
              <div className="w-full max-w-4xl aspect-video bg-gray-900 rounded-lg overflow-hidden">
                {/* Utilisation d'un iframe YouTube standard */}
                <iframe
                  src={`https://www.youtube.com/embed/${youtubeVideoId}?autoplay=1&modestbranding=1&rel=0&showinfo=0&color=white`}
                  width="100%"
                  height="100%"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full"
                ></iframe>
              </div>
            </div>

            {/* Indication de contrôle */}
            <div className="mt-4 flex justify-center">
              <div className="text-white text-sm bg-black/60 px-3 py-1 rounded-full">
                Utilisez les contrôles YouTube pour ajuster le volume et la lecture
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default MusicPlayerSystem;
