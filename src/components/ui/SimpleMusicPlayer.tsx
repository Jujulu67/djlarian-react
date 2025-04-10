'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Track, MusicPlatform } from '@/lib/utils/types';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
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
  Maximize,
  Youtube,
  Eye,
  EyeOff,
} from 'lucide-react';
import { FaSpotify, FaYoutube, FaSoundcloud, FaMusic } from 'react-icons/fa';
import { getEmbedUrl } from '@/lib/utils/music-service';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

interface SimpleMusicPlayerProps {
  track: Track | null;
  isPlaying: boolean;
  onClose: () => void;
  onTogglePlay: () => void;
  onNextTrack?: () => void;
  onPrevTrack?: () => void;
  youtubePlayerRef?: React.MutableRefObject<any>;
}

export const SimpleMusicPlayer: React.FC<SimpleMusicPlayerProps> = ({
  track,
  isPlaying,
  onClose,
  onTogglePlay,
  onNextTrack,
  onPrevTrack,
  youtubePlayerRef,
}) => {
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
  const [chapters, setChapters] = useState<{ time: number; title: string }[]>([]);
  const [currentChapter, setCurrentChapter] = useState<number>(0);
  const miniPlayerRef = useRef<HTMLDivElement>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Formater le temps (secondes -> MM:SS)
  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Extraire l'ID YouTube de l'URL
  const extractYoutubeId = (url: string): string | null => {
    console.log("Tentative d'extraction d'ID YouTube depuis URL:", url);

    if (!url) {
      console.log('URL YouTube vide');
      return null;
    }

    // Cas où l'URL est déjà un ID
    if (url.match(/^[a-zA-Z0-9_-]{11}$/)) {
      console.log("L'URL est déjà un ID YouTube valide:", url);
      return url;
    }

    // Formats standards: youtube.com/watch?v=ID ou youtu.be/ID
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);

    if (match && match[1]) {
      console.log('ID YouTube extrait avec succès:', match[1]);
      return match[1];
    }

    // Formats alternatifs: youtube.com/embed/ID
    const embedMatch = url.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/);
    if (embedMatch && embedMatch[1]) {
      console.log('ID YouTube extrait depuis URL embed:', embedMatch[1]);
      return embedMatch[1];
    }

    console.log("Échec de l'extraction d'ID YouTube");
    return null;
  };

  // Nettoyer les intervalles lors du démontage
  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, []);

  // Fonction pour récupérer les plateformes disponibles
  const getAvailablePlatforms = useCallback((track: Track | null): MusicPlatform[] => {
    if (!track) return [];

    return Object.entries(track.platforms || {})
      .filter(([_, value]) => value?.url)
      .map(([key]) => key as MusicPlatform);
  }, []);

  // Sélectionner la plateforme par défaut
  useEffect(() => {
    if (!track) return;

    const availablePlatforms = getAvailablePlatforms(track);

    if (availablePlatforms.length === 0) {
      setSelectedPlatform(null);
      return;
    }

    const preferredOrder: MusicPlatform[] = ['spotify', 'youtube', 'soundcloud', 'apple', 'deezer'];

    let platformToUse: MusicPlatform | null = null;

    for (const platform of preferredOrder) {
      if (availablePlatforms.includes(platform)) {
        platformToUse = platform;
        break;
      }
    }

    if (!platformToUse && availablePlatforms.length > 0) {
      platformToUse = availablePlatforms[0];
    }

    setSelectedPlatform(platformToUse);
    setImageError(false);
    setProgress(0);
    setDuration(0);
  }, [track, getAvailablePlatforms]);

  // Mettre à jour l'URL d'embedding quand la plateforme change
  useEffect(() => {
    if (!track || !selectedPlatform) return;

    const platformData = track.platforms[selectedPlatform];
    if (!platformData?.url) return;

    if (selectedPlatform === 'youtube') {
      const videoId = extractYoutubeId(platformData.url);
      console.log('ID YouTube extrait:', videoId, 'depuis URL:', platformData.url);
      setYoutubeVideoId(videoId);
      // Important: Mettre embedUrl à null pour YouTube
      setEmbedUrl(null);
    } else {
      const url = getEmbedUrl(platformData.url, selectedPlatform);
      setEmbedUrl(url);
      setYoutubeVideoId(null);
    }

    // Réinitialiser la progression
    setProgress(0);

    // Simuler une durée basée sur le type de piste
    let estimatedDuration = 180; // 3 minutes par défaut
    if (track.type === 'ep' || track.type === 'album') {
      estimatedDuration = 240; // 4 minutes
    } else if (track.type === 'djset' || track.type === 'live') {
      estimatedDuration = 600; // 10 minutes
    }

    setDuration(estimatedDuration);
  }, [track, selectedPlatform]);

  // Remplacer l'effect pour YouTube par une logique plus simple
  useEffect(() => {
    if (selectedPlatform === 'youtube' && youtubeVideoId && isPlaying) {
      console.log('Piste YouTube en lecture');
      // L'affichage est géré directement dans le rendu
    }
  }, [selectedPlatform, youtubeVideoId, isPlaying]);

  // Simplifier la gestion de la progression pour YouTube
  useEffect(() => {
    const stopProgressInterval = () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };

    stopProgressInterval();

    // Ne pas mettre à jour la progression si on est en lecture YouTube
    if (selectedPlatform === 'youtube') {
      return stopProgressInterval;
    }

    if (isPlaying) {
      progressIntervalRef.current = setInterval(() => {
        setProgress((prev) => {
          if (prev >= duration) {
            if (onNextTrack) {
              onNextTrack();
            }
            return 0;
          }
          return prev + 0.5;
        });
      }, 500);
    }

    return stopProgressInterval;
  }, [isPlaying, duration, onNextTrack, selectedPlatform]);

  // Effet pour gérer la communication YouTube et synchroniser l'état
  useEffect(() => {
    // Uniquement pour YouTube
    if (selectedPlatform !== 'youtube' || !youtubePlayerRef?.current) {
      return;
    }

    console.log("Configuration du gestionnaire d'état YouTube");

    const checkAndSyncYoutubeState = async () => {
      try {
        if (youtubePlayerRef.current) {
          const playerState = await youtubePlayerRef.current.getPlayerState();
          console.log('État actuel du player YouTube:', playerState);

          // YouTube Player States: -1 (unstarted), 0 (ended), 1 (playing), 2 (paused), 3 (buffering), 5 (video cued)

          // Si le player joue mais que notre état est en pause
          if (playerState === 1 && !isPlaying) {
            console.log(
              'État incohérent: YouTube joue mais notre état est pause -> Mise à jour vers LECTURE'
            );
            onTogglePlay();
          }
          // Si le player est en pause mais que notre état est en lecture
          else if ((playerState === 0 || playerState === 2) && isPlaying) {
            console.log(
              'État incohérent: YouTube en pause mais notre état est lecture -> Mise à jour vers PAUSE'
            );
            onTogglePlay();
          }
        }
      } catch (e) {
        console.error("Erreur lors de la vérification de l'état:", e);
      }
    };

    // Vérification initiale après 1.5s
    const initialCheck = setTimeout(() => {
      checkAndSyncYoutubeState();
    }, 1500);

    // Vérification périodique
    const syncInterval = setInterval(checkAndSyncYoutubeState, 5000);

    return () => {
      clearTimeout(initialCheck);
      clearInterval(syncInterval);
    };
  }, [selectedPlatform, youtubePlayerRef, isPlaying, onTogglePlay]);

  // Améliorer la fonction handleSeek pour un meilleur contrôle
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const seekTime = parseFloat(e.target.value);

    // Si c'est YouTube et que la référence existe, utiliser la méthode seekTo
    if (selectedPlatform === 'youtube' && youtubePlayerRef?.current) {
      try {
        // Mettre à jour l'UI immédiatement pour éviter les délais
        setProgress(seekTime);
        // Puis envoyer la commande au player
        youtubePlayerRef.current.seekTo(seekTime);
      } catch (e) {
        console.error('Erreur lors du seek YouTube:', e);
      }
    } else {
      // Pour les autres plateformes, juste mettre à jour l'UI
      setProgress(seekTime);
    }
  };

  // Modifier les fonctions de contrôle pour assurer la synchronisation

  // Fonction pour contrôler la lecture/pause
  const togglePlay = useCallback(() => {
    console.log('togglePlay appelé, état actuel:', isPlaying);

    if (selectedPlatform === 'youtube' && youtubePlayerRef?.current) {
      try {
        // Action directe sur le player YouTube
        if (isPlaying) {
          console.log('Tentative de pause YouTube');
          youtubePlayerRef.current.pauseVideo();
        } else {
          console.log('Tentative de lecture YouTube');
          youtubePlayerRef.current.playVideo();
        }
        // Mettre à jour l'état APRÈS avoir envoyé la commande au player YouTube
        setTimeout(() => {
          onTogglePlay();
        }, 50);
      } catch (e) {
        console.error('Erreur lors du toggle YouTube:', e);
        // En cas d'erreur, on change quand même l'état UI
        onTogglePlay();
      }
    } else {
      // Pour les autres plateformes
      onTogglePlay();

      if (audioRef.current) {
        if (isPlaying) {
          audioRef.current.pause();
        } else {
          audioRef.current.play().catch((e) => {
            console.error('Erreur de lecture audio:', e);
            onTogglePlay(); // Revenir à l'état précédent
          });
        }
      }
    }
  }, [isPlaying, selectedPlatform, onTogglePlay, youtubePlayerRef]);

  // Améliorer le contrôle du volume
  const handleVolumeChange = useCallback(
    (newVolume: number) => {
      // Assurer que le volume est entre 0 et 1
      const clampedVolume = Math.max(0, Math.min(1, newVolume));
      setVolume(clampedVolume);

      if (audioRef.current) {
        audioRef.current.volume = clampedVolume;
      }

      if (selectedPlatform === 'youtube' && youtubePlayerRef?.current) {
        try {
          youtubePlayerRef.current.setVolume(clampedVolume * 100);
        } catch (e) {
          console.error('Erreur lors du changement de volume YouTube:', e);
        }
      }

      // Sauvegarder le volume dans localStorage pour le conserver entre les sessions
      localStorage.setItem('musicPlayerVolume', clampedVolume.toString());
    },
    [selectedPlatform]
  );

  // Simplifier la fonction openYoutubePlayer
  const openYoutubePlayer = () => {
    console.log('Ouverture du lecteur YouTube en plein écran');
    if (youtubeVideoId) {
      setShowYoutubeModal(true);
      setIsFullScreen(true);
    } else {
      console.log("Impossible d'ouvrir le lecteur YouTube: ID manquant");
    }
  };

  // Gérer le swipe vers le haut (pour ouvrir le lecteur complet)
  const handleSwipeUp = () => {
    setIsFullScreen(true);
  };

  // Simplifier le gestionnaire d'état YouTube - supprimer les références aux variables non existantes
  const handleYoutubeStateChange = useCallback(
    (event: any) => {
      console.log("Changement d'état YouTube:", event.data);
      // YouTube Player States: -1 (unstarted), 0 (ended), 1 (playing), 2 (paused), 3 (buffering), 5 (video cued)
      if (event.data === 1) {
        // Playing
        console.log('YouTube joue, état actuel de isPlaying:', isPlaying);
        if (!isPlaying) {
          console.log("Mise à jour de l'état global vers LECTURE");
          onTogglePlay();
        }
      } else if (event.data === 2) {
        // Paused
        console.log('YouTube en pause, état actuel de isPlaying:', isPlaying);
        if (isPlaying) {
          console.log("Mise à jour de l'état global vers PAUSE");
          onTogglePlay();
        }
      } else if (event.data === 0) {
        // Ended
        console.log('YouTube terminé, passage à la piste suivante si disponible');
        if (isPlaying) onTogglePlay();
        if (onNextTrack) {
          onNextTrack();
        }
      }
    },
    [isPlaying, onTogglePlay, onNextTrack]
  );

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

  // Calculer la largeur de la barre de progression
  const progressPercentage = duration > 0 ? (progress / duration) * 100 : 0;

  return (
    <>
      {/* Espace réservé en bas de page pour éviter le chevauchement avec le player */}
      <div className="h-24 md:h-28"></div>

      {/* Player en footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-gray-900/95 backdrop-blur-md border-t border-purple-500/30 p-3 z-50 shadow-xl">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col">
            {/* Barre de progression améliorée avec chapitres */}
            <div className="w-full h-2 bg-gray-800/60 rounded-full mb-3 relative group">
              <div
                className="absolute h-full bg-gradient-to-r from-purple-600 to-blue-500 rounded-full"
                style={{ width: `${progressPercentage}%` }}
              ></div>

              {/* Marqueurs de chapitres réels */}
              {selectedPlatform === 'youtube' && chapters.length > 0 && (
                <>
                  {chapters.map((chapter, index) => {
                    const chapterPosition = (chapter.time / duration) * 100;
                    if (chapterPosition > 0 && chapterPosition < 100) {
                      return (
                        <div
                          key={`chapter-${index}`}
                          className="absolute h-full w-0.5 bg-white/70 z-10 transition-all hover:w-1 hover:bg-white/100"
                          style={{ left: `${chapterPosition}%` }}
                          title={chapter.title}
                          onClick={() => {
                            if (youtubePlayerRef?.current) {
                              youtubePlayerRef.current.seekTo(chapter.time, true);
                            }
                          }}
                        ></div>
                      );
                    }
                    return null;
                  })}
                </>
              )}

              {/* Point de repère visible */}
              <div
                className="absolute top-1/2 transform -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-md transition-all z-20"
                style={{
                  left: `calc(${progressPercentage}% - 6px)`,
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

            {/* Temps et info de chapitre */}
            <div className="flex justify-between text-gray-400 text-xs mb-2 px-1">
              <span>{formatTime(progress)}</span>
              {selectedPlatform === 'youtube' && chapters.length > 0 && currentChapter >= 0 && (
                <span className="text-purple-400">{chapters[currentChapter].title}</span>
              )}
              <span>{formatTime(duration)}</span>
            </div>

            <div className="flex items-center justify-between">
              {/* Info du morceau standard (sans YouTube) */}
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-12 h-12 relative rounded-md overflow-hidden bg-gray-800 flex-shrink-0">
                  {track.coverUrl && !imageError ? (
                    <Image
                      src={track.coverUrl}
                      alt={track.title}
                      width={48}
                      height={48}
                      className="w-full h-full object-cover"
                      onError={() => setImageError(true)}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Music className="w-6 h-6 text-gray-600" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-white font-bold text-sm truncate">{track.title}</h3>
                  <p className="text-gray-400 text-xs truncate">{track.artist}</p>
                </div>
              </div>

              {/* Contrôles standard avec bouton YouTube plein écran */}
              <div className="flex items-center gap-3">
                {/* Contrôle de volume amélioré */}
                <div className="flex items-center gap-2 ml-auto">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-primary"
                    onClick={() => handleVolumeChange(0)}
                  >
                    {volume === 0 ? (
                      <VolumeX className="h-5 w-5" />
                    ) : volume < 0.5 ? (
                      <Volume1 className="h-5 w-5" />
                    ) : (
                      <Volume2 className="h-5 w-5" />
                    )}
                  </Button>

                  <div
                    className="relative w-24 h-6 flex items-center cursor-pointer touch-action-none"
                    onPointerDown={(e) => {
                      const container = e.currentTarget;
                      const rect = container.getBoundingClientRect();
                      const offsetX = e.clientX - rect.left;
                      const newVolume = Math.max(0, Math.min(1, offsetX / rect.width));
                      handleVolumeChange(newVolume);

                      // Gérer le drag du slider
                      const handlePointerMove = (moveEvent: PointerEvent) => {
                        const newOffsetX = moveEvent.clientX - rect.left;
                        const newVol = Math.max(0, Math.min(1, newOffsetX / rect.width));
                        handleVolumeChange(newVol);
                      };

                      // Nettoyer les événements quand on relâche
                      const handlePointerUp = () => {
                        document.removeEventListener('pointermove', handlePointerMove);
                        document.removeEventListener('pointerup', handlePointerUp);
                      };

                      document.addEventListener('pointermove', handlePointerMove);
                      document.addEventListener('pointerup', handlePointerUp);
                    }}
                  >
                    <div className="absolute h-1 w-full bg-muted rounded-full"></div>
                    <div
                      className="absolute h-1 bg-primary rounded-full"
                      style={{ width: `${volume * 100}%` }}
                    ></div>
                    <div
                      className="absolute h-3 w-3 rounded-full bg-primary -ml-1.5"
                      style={{ left: `${volume * 100}%` }}
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
                  onClick={togglePlay}
                  className="p-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-full transition-all transform hover:scale-105"
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

                {/* YouTube - uniquement un bouton pour le plein écran */}
                {selectedPlatform === 'youtube' && youtubeVideoId && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openYoutubePlayer();
                    }}
                    className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-full transition-all transform hover:scale-105"
                    aria-label="YouTube en plein écran"
                  >
                    <Maximize2 className="w-5 h-5" />
                  </button>
                )}

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
      </div>

      {/* Modal de lecteur plein écran */}
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
                    className="p-2 bg-gray-800/70 hover:bg-gray-700/80 text-gray-400 rounded-full"
                    aria-label="Minimiser le lecteur"
                  >
                    <Minimize2 className="w-5 h-5" />
                  </button>
                  <button
                    onClick={onClose}
                    className="p-2 bg-gray-800/70 hover:bg-gray-700/80 text-gray-400 rounded-full"
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
                    {track.coverUrl && !imageError ? (
                      <Image
                        src={track.coverUrl}
                        alt={track.title}
                        width={320}
                        height={320}
                        className="w-full h-full object-cover"
                        onError={() => setImageError(true)}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
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
                      className="absolute h-full bg-gradient-to-r from-purple-600 to-blue-500 rounded-full"
                      style={{ width: `${progressPercentage}%` }}
                    ></div>
                    {/* Point de repère visible */}
                    <div
                      className="absolute top-1/2 transform -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-md"
                      style={{
                        left: `calc(${progressPercentage}% - 8px)`,
                        opacity: duration > 0 ? 0.9 : 0,
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
                </div>

                {/* Volume */}
                <div className="flex items-center justify-center gap-4 mb-8">
                  <button
                    onClick={togglePlay}
                    className="p-2 text-gray-400 hover:text-white"
                    aria-label={isPlaying ? 'Pause' : 'Lecture'}
                  >
                    {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                  </button>
                  <div className="relative w-32 md:w-48 h-2 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-purple-600 to-blue-500 rounded-full"
                      style={{ width: `${volume}%` }}
                    ></div>
                    {/* Point de repère visible */}
                    <div
                      className="absolute top-1/2 transform -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-md"
                      style={{
                        left: `calc(${volume}% - 8px)`,
                        opacity: 0.9,
                      }}
                    ></div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={volume}
                      onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                  </div>
                </div>

                {/* Contrôles YouTube en mode plein écran - simplification */}
                {selectedPlatform === 'youtube' && youtubeVideoId && (
                  <div className="flex justify-center mb-8">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openYoutubePlayer();
                      }}
                      className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-full font-medium transition-colors"
                    >
                      <FaYoutube className="w-5 h-5" />
                      <Maximize2 className="w-5 h-5" />
                      Voir YouTube en plein écran
                    </button>
                  </div>
                )}

                {/* Sélecteur de plateforme */}
                <div className="flex justify-center gap-3 mb-8">
                  {availablePlatforms.map((platform) => (
                    <button
                      key={platform}
                      onClick={() => setSelectedPlatform(platform)}
                      className={`p-3 rounded-full transition-colors ${
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
                      {(platform === 'apple' || platform === 'deezer') && (
                        <FaMusic className="w-6 h-6" />
                      )}
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

      {/* Modal du lecteur YouTube */}
      <AnimatePresence>
        {showYoutubeModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/95 z-[60] flex flex-col"
          >
            <div className="flex justify-end mb-4">
              <button
                onClick={() => {
                  console.log('Fermeture du modal YouTube');
                  setShowYoutubeModal(false);
                  // Ne pas fermer le mode plein écran quand on ferme le modal
                  // setIsFullScreen(false);
                }}
                className="p-2 bg-gray-800/70 text-white rounded-full"
                aria-label="Fermer la vidéo"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 flex items-center justify-center">
              <div className="w-full max-w-4xl aspect-video bg-gray-900 rounded-lg overflow-hidden">
                <iframe
                  key={`youtube-${youtubeVideoId}`}
                  src={`https://www.youtube.com/embed/${youtubeVideoId}?autoplay=1&modestbranding=1&rel=0&showinfo=0&color=white&enablejsapi=1&playsinline=1`}
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

export default SimpleMusicPlayer;
