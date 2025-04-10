'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Track, MusicPlatform } from '@/lib/utils/types';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Play, Pause, ExternalLink, Music, Calendar, X } from 'lucide-react';
import { FaSpotify, FaYoutube, FaSoundcloud, FaApple, FaMusic } from 'react-icons/fa';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

interface MusicCardProps {
  track: Track;
  onPlay: (track: Track) => void;
  isPlaying: boolean;
  isActive: boolean;
  playerRef?: React.MutableRefObject<any>;
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

export const MusicCard: React.FC<MusicCardProps> = ({
  track,
  onPlay,
  isPlaying,
  isActive,
  playerRef,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [youtubeVideoId, setYoutubeVideoId] = useState<string | null>(null);
  const [localIsPlaying, setLocalIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isYoutubeLoaded, setIsYoutubeLoaded] = useState(false);
  const [isYoutubeVisible, setIsYoutubeVisible] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const timeIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [audioData, setAudioData] = useState<number[]>(Array(20).fill(0));
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Extraire l'ID YouTube quand c'est une piste YouTube
  useEffect(() => {
    if (track.platforms.youtube?.url) {
      const videoId = extractYoutubeId(track.platforms.youtube.url);
      setYoutubeVideoId(videoId);

      // Récupérer le temps de lecture sauvegardé
      if (videoId) {
        const savedTime = localStorage.getItem(`youtube-time-${videoId}`);
        if (savedTime) {
          setCurrentTime(parseFloat(savedTime));
        }
      }
    }
  }, [track]);

  // Synchroniser l'état local avec l'état global pour les cartes non-actives
  useEffect(() => {
    if (!isActive) {
      setLocalIsPlaying(false);
      setIsYoutubeVisible(false);

      // Mettre en pause la vidéo YouTube si elle existe
      try {
        if (iframeRef.current && iframeRef.current.contentWindow) {
          iframeRef.current.contentWindow.postMessage(
            JSON.stringify({ event: 'command', func: 'pauseVideo' }),
            '*'
          );
        }
      } catch (e) {
        console.error('Erreur lors de la mise en pause YouTube:', e);
      }
    }
  }, [isActive]);

  // Défiler automatiquement vers la carte quand elle est activée
  useEffect(() => {
    if (isActive && localIsPlaying && cardRef.current) {
      // Attendre un peu pour que l'interface ait le temps de mettre à jour
      setTimeout(() => {
        cardRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      }, 100);
    }
  }, [isActive, localIsPlaying]);

  // Extraire toutes les plateformes disponibles
  const availablePlatforms = Object.entries(track.platforms || {})
    .filter(([_, value]) => value?.url)
    .map(([key]) => key as MusicPlatform);

  // Déterminer si on est en mode lecture YouTube
  const isYoutubeActive = isActive && localIsPlaying && track.platforms.youtube && youtubeVideoId;

  // Suivre et sauvegarder la position de lecture pour les vidéos YouTube
  useEffect(() => {
    if (isYoutubeActive && youtubeVideoId) {
      // Activer l'affichage YouTube
      setIsYoutubeVisible(true);

      // Démarrer le suivi du temps de lecture
      if (timeIntervalRef.current) {
        clearInterval(timeIntervalRef.current);
      }

      // Vérifier et sauvegarder le temps de lecture toutes les 5 secondes
      timeIntervalRef.current = setInterval(() => {
        try {
          // Utiliser postMessage pour obtenir le temps actuel
          if (iframeRef.current && iframeRef.current.contentWindow) {
            iframeRef.current.contentWindow.postMessage(
              JSON.stringify({ event: 'command', func: 'getCurrentTime' }),
              '*'
            );
          }
        } catch (e) {
          console.error('Erreur lors de la récupération du temps:', e);
        }
      }, 5000);

      // Écouter les messages du lecteur YouTube pour obtenir le temps actuel
      const handleMessage = (event: MessageEvent) => {
        if (event.origin !== 'https://www.youtube.com') return;

        try {
          const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;

          // Si nous recevons des données de temps
          if (data && data.info && typeof data.info.currentTime === 'number') {
            setCurrentTime(data.info.currentTime);
            // Sauvegarder le temps dans localStorage
            localStorage.setItem(
              `youtube-time-${youtubeVideoId}`,
              data.info.currentTime.toString()
            );
          }
        } catch (e) {
          // Ignorer les erreurs de parsing
        }
      };

      window.addEventListener('message', handleMessage);

      return () => {
        window.removeEventListener('message', handleMessage);
        if (timeIntervalRef.current) {
          clearInterval(timeIntervalRef.current);
        }
      };
    }
  }, [isYoutubeActive, youtubeVideoId]);

  // Ajouter un gestionnaire de clic global pour mettre en pause la vidéo en cliquant ailleurs
  useEffect(() => {
    // Si la carte n'est pas en mode lecture YouTube, on ne fait rien
    if (!isYoutubeActive) {
      return;
    }

    // Fonction qui détecte si on a cliqué en dehors de la carte
    const handleOutsideClick = (event: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(event.target as Node)) {
        // Au lieu de fermer complètement, on met juste en pause et on cache
        pauseAndHideYoutube();
      }
    };

    // Ajouter l'écouteur d'événement
    document.addEventListener('click', handleOutsideClick);

    // Nettoyer l'écouteur quand le composant est démonté ou quand l'état change
    return () => {
      document.removeEventListener('click', handleOutsideClick);
    };
  }, [isYoutubeActive]);

  // Fonction pour mettre en pause et cacher le lecteur YouTube sans le détruire
  const pauseAndHideYoutube = () => {
    try {
      // Mettre en pause la vidéo
      if (iframeRef.current && iframeRef.current.contentWindow) {
        iframeRef.current.contentWindow.postMessage(
          JSON.stringify({ event: 'command', func: 'pauseVideo' }),
          '*'
        );
      }
    } catch (e) {
      console.error('Erreur lors de la mise en pause YouTube:', e);
    }

    // Mettre à jour l'état local et global
    setLocalIsPlaying(false);
    setIsYoutubeVisible(false);
    // S'assurer que l'état global est aussi mis à jour pour corriger l'affichage du bouton
    if (isPlaying) {
      onPlay(track); // Cela basculera l'état isPlaying
    }
  };

  // Fonction pour reprendre la lecture
  const resumeYoutube = () => {
    setLocalIsPlaying(true);
    setIsYoutubeVisible(true);

    // Mettre à jour l'état global si nécessaire
    if (!isPlaying) {
      onPlay(track);
    }

    // Si l'iframe est déjà chargée, on reprend la lecture
    try {
      if (iframeRef.current && iframeRef.current.contentWindow) {
        setTimeout(() => {
          iframeRef.current?.contentWindow?.postMessage(
            JSON.stringify({ event: 'command', func: 'playVideo' }),
            '*'
          );
        }, 100);
      }
    } catch (e) {
      console.error('Erreur lors de la reprise YouTube:', e);
    }
  };

  // Fonction pour extraire l'ID YouTube de l'URL
  const extractYoutubeId = (url: string): string | null => {
    if (!url) return null;

    // Cas où l'URL est déjà un ID
    if (url.match(/^[a-zA-Z0-9_-]{11}$/)) {
      return url;
    }

    // Formats standards: youtube.com/watch?v=ID ou youtu.be/ID
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    if (match && match[1]) {
      return match[1];
    }

    // Formats alternatifs: youtube.com/embed/ID
    const embedMatch = url.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/);
    if (embedMatch && embedMatch[1]) {
      return embedMatch[1];
    }

    return null;
  };

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

  // Action lorsqu'on clique sur le bouton de lecture
  const handlePlayClick = (e: React.MouseEvent) => {
    e.stopPropagation();

    // Si c'est une vidéo YouTube et qu'elle est active et déjà chargée
    if (isActive && track.platforms.youtube && youtubeVideoId && isYoutubeLoaded) {
      // On bascule simplement entre lecture et pause
      if (localIsPlaying) {
        pauseAndHideYoutube();
      } else {
        resumeYoutube();
      }
    } else {
      // Pour les autres cas, on utilise le comportement standard
      onPlay(track);

      // Si c'est une vidéo YouTube, on active la lecture locale
      if (track.platforms.youtube && youtubeVideoId) {
        setLocalIsPlaying(true);
        setIsYoutubeVisible(true);

        // Si l'iframe est déjà chargée, s'assurer que la vidéo démarre
        if (isYoutubeLoaded && iframeRef.current && iframeRef.current.contentWindow) {
          setTimeout(() => {
            iframeRef.current?.contentWindow?.postMessage(
              JSON.stringify({ event: 'command', func: 'playVideo' }),
              '*'
            );
          }, 100);
        }
      }
    }
  };

  // Chargement paresseux pour l'iframe YouTube
  const handleIframeLoad = () => {
    setIsYoutubeLoaded(true);
  };

  // Analyser l'audio pour la waveform (uniquement pour YouTube)
  useEffect(() => {
    if (isYoutubeActive && isYoutubeVisible) {
      // Animation chromatique plus légère que l'analyse audio
      const animateBars = () => {
        // Créer un tableau de 20 barres avec des hauteurs variables
        const newData = Array(20)
          .fill(0)
          .map((_, index) => {
            // Revenir à un mouvement plus lent et fluide
            const time = Date.now() / 1000; // Plus lent comme avant
            const position = index / 20;

            // Fonction complexe pour créer un mouvement fluide et intéressant
            // Amplitudes plus grandes pour remplir l'espace
            const value =
              50 + // Hauteur de base encore plus élevée
              30 * Math.sin(time * 1.5 + position * 10) + // Onde principale plus ample
              15 * Math.sin(time * 2.7 + position * 5) + // Onde secondaire
              10 * Math.sin(time * 5.3 + position * 15); // Détails fins

            return Math.max(15, Math.min(100, value)); // Limites maximisées
          });

        setAudioData(newData);
        animationFrameRef.current = requestAnimationFrame(animateBars);
      };

      // Démarrer l'animation
      animateBars();

      // Nettoyage
      return () => {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
      };
    } else {
      // Réinitialiser les données quand le lecteur n'est pas actif
      setAudioData(Array(20).fill(0));
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    }
  }, [isYoutubeActive, isYoutubeVisible]);

  return (
    <motion.div
      ref={cardRef}
      className={`group relative rounded-xl overflow-hidden border transition-all duration-300 transform ${
        isYoutubeActive
          ? '' // Pas de cursor-pointer quand YouTube est actif
          : 'cursor-pointer hover:-translate-y-1'
      } ${
        isActive
          ? 'border-purple-500/70 shadow-lg shadow-purple-500/20 bg-purple-900/30'
          : 'border-gray-700/50 bg-gray-800/30 hover:border-purple-500/50 hover:shadow-lg hover:shadow-purple-500/10'
      } ${isYoutubeActive ? 'col-span-1 md:col-span-2' : ''}`}
      whileHover={isYoutubeActive ? {} : { scale: 1.02 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={(e) => {
        // Désactiver le clic quand le lecteur YouTube est actif
        if (isYoutubeActive) {
          // Ne rien faire pour permettre l'interaction avec YouTube
          return;
        }
        handlePlayClick(e);
      }}
    >
      {/* Affichage YouTube ou image selon le cas - avec aspect ratio fixé */}
      <div
        className="relative overflow-hidden"
        style={{
          aspectRatio: isYoutubeActive
            ? '16/9' // YouTube video ratio
            : '1/1', // Default square ratio
        }}
      >
        {/* YouTube iframe - toujours présent pour les cartes YouTube après le premier chargement, 
            mais caché quand non actif */}
        {track.platforms.youtube && youtubeVideoId && (isYoutubeVisible || isYoutubeLoaded) ? (
          <div
            className={`w-full h-full bg-black pointer-events-auto transition-opacity duration-300 ${
              isYoutubeVisible ? 'opacity-100' : 'opacity-0 absolute inset-0 pointer-events-none'
            }`}
          >
            <iframe
              id={`youtube-iframe-${track.id}`}
              src={`https://www.youtube.com/embed/${youtubeVideoId}?enablejsapi=1&autoplay=1&start=${Math.floor(
                currentTime
              )}&modestbranding=1&rel=0&showinfo=0&color=white&playsinline=1&controls=1&origin=${encodeURIComponent(
                window.location.origin
              )}`}
              width="100%"
              height="100%"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full h-full z-30"
              ref={iframeRef}
              onLoad={handleIframeLoad}
            ></iframe>
          </div>
        ) : null}

        {/* Image normale - visible quand YouTube n'est pas actif */}
        {!isYoutubeVisible && (
          <>
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
          </>
        )}

        {/* Overlay sombre pour mieux voir les badges - masqué quand YouTube est actif */}
        {!isYoutubeVisible && (
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent opacity-60 group-hover:opacity-70 transition-opacity"></div>
        )}

        {/* Badge type de musique - masqué quand YouTube est actif */}
        {!isYoutubeVisible && (
          <div className="absolute top-4 left-4">
            <span className="bg-purple-600/90 backdrop-blur-sm text-white px-3.5 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 shadow-lg">
              <Music className="w-3.5 h-3.5" />
              {getTypeLabel(track.type)}
            </span>
          </div>
        )}

        {/* Badge Featured - masqué quand YouTube est actif */}
        {track.featured && !isYoutubeVisible && (
          <div className="absolute top-4 right-4">
            <span className="bg-yellow-500/90 backdrop-blur-sm text-white px-3.5 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 shadow-lg">
              Highlight
            </span>
          </div>
        )}

        {/* Bouton de lecture - visible uniquement quand le lecteur YouTube n'est pas affiché */}
        {!isYoutubeVisible && (
          <div
            className={`absolute inset-0 flex items-center justify-center ${isHovered ? 'opacity-100' : 'opacity-0'} transition-opacity`}
          >
            <button
              onClick={handlePlayClick}
              className="bg-purple-600 hover:bg-purple-700 text-white rounded-full p-4 transform transition-all duration-300 hover:scale-110 shadow-xl z-10"
            >
              {isActive && isPlaying ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8" />}
            </button>
          </div>
        )}
      </div>

      {/* Infos du morceau - Masqué quand YouTube est actif */}
      {!isYoutubeVisible && (
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
      )}

      {/* Bouton X pour fermer la vidéo - plus discret et mieux intégré */}
      {isYoutubeVisible && (
        <div className="absolute top-0 right-0 z-50">
          <button
            onClick={(e) => {
              e.stopPropagation();
              pauseAndHideYoutube();
            }}
            className="flex items-center justify-center bg-purple-600/70 hover:bg-purple-700/90 text-white/90 rounded-bl-lg p-1.5 transition-colors shadow-lg"
            aria-label="Fermer le lecteur"
            style={{ width: '28px', height: '28px' }}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Effet de brillance au survol */}
      {!isYoutubeVisible && (
        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/0 via-purple-500/5 to-purple-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
      )}

      {/* Espace réservé avec animation chromatique pour les vidéos YouTube actives */}
      {isYoutubeVisible && (
        <div className="h-[74px] bg-gradient-to-r from-purple-900/10 via-purple-900/30 to-purple-900/10 flex items-end justify-center overflow-hidden">
          {/* Animation chromatique */}
          <div className="w-full h-full flex items-end justify-center">
            <div className="flex items-end justify-between w-full h-full gap-[3px] pt-0">
              {audioData.map((value, index) => {
                // Calculer les couleurs en fonction de la position et de la valeur
                const hue = (index * 12 + Date.now() / 200) % 360;
                const saturation = 85 + Math.sin(Date.now() / 1200 + index) * 10; // Plus lent
                const lightness = 60 + Math.sin(Date.now() / 1500 + index) * 15; // Plus ample

                return (
                  <motion.div
                    key={index}
                    className="backdrop-blur-sm rounded-t-md w-full"
                    style={{
                      height: `${value}%`,
                      minWidth: '10px',
                      background: `linear-gradient(to top, 
                        hsla(${hue}, ${saturation}%, ${lightness - 30}%, 0.5) 0%, 
                        hsla(${hue + 40}, ${saturation}%, ${lightness}%, 0.8) 50%, 
                        hsla(${hue + 70}, ${saturation}%, ${lightness + 15}%, 0.6) 100%)`,
                      boxShadow: `0 0 15px hsla(${hue}, 95%, 65%, 0.7)`,
                      filter: 'blur(0.5px)',
                    }}
                    initial={{ height: 0 }}
                    animate={{ height: `${value}%` }}
                    transition={{ duration: 0.5, ease: 'easeOut' }} // Plus lent
                  />
                );
              })}
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default MusicCard;
