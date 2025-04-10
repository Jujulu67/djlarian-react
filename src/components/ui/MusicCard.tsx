'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Track, MusicPlatform } from '@/lib/utils/types';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Play, Pause, ExternalLink, Music, Calendar, X } from 'lucide-react';
import { FaSpotify, FaYoutube, FaSoundcloud, FaApple, FaMusic } from 'react-icons/fa';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { setGlobalVolume } from './SimpleMusicPlayer';

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
  const [soundcloudUrl, setSoundcloudUrl] = useState<string | null>(null);
  const [isSoundcloudVisible, setIsSoundcloudVisible] = useState(false);
  const [isSoundcloudLoaded, setIsSoundcloudLoaded] = useState(false);
  const soundcloudIframeRef = useRef<HTMLIFrameElement | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showYouTube, setShowYouTube] = useState(false);
  const [showSoundCloud, setShowSoundCloud] = useState(false);
  const [trackType, setTrackType] = useState<MusicPlatform | null>(null);

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

  // Extraire l'URL SoundCloud quand c'est une piste SoundCloud
  useEffect(() => {
    if (track.platforms.soundcloud?.url) {
      setSoundcloudUrl(track.platforms.soundcloud.url);
    }
  }, [track]);

  // Synchroniser l'état local avec l'état global pour les cartes non-actives
  useEffect(() => {
    if (!isActive) {
      setLocalIsPlaying(false);
      setIsYoutubeVisible(false);
      setIsSoundcloudVisible(false);

      // Mettre en pause la vidéo YouTube et SoundCloud si elles existent
      try {
        if (iframeRef.current && iframeRef.current.contentWindow) {
          iframeRef.current.contentWindow.postMessage(
            JSON.stringify({ event: 'command', func: 'pauseVideo' }),
            '*'
          );
        }
        if (soundcloudIframeRef.current && soundcloudIframeRef.current.contentWindow) {
          soundcloudIframeRef.current.contentWindow.postMessage('{"method":"pause"}', '*');
        }
      } catch (e) {
        console.error('Erreur lors de la mise en pause YouTube et SoundCloud:', e);
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

  // Activer le lecteur approprié lorsque la carte devient active
  useEffect(() => {
    // Si cette carte devient active
    if (isActive) {
      console.log(`Card ${track.id} became active, isPlaying=${isPlaying}`);

      // Synchroniser l'état local avec l'état global
      setLocalIsPlaying(isPlaying);

      // Si la lecture est active, activer le bon lecteur
      if (isPlaying) {
        if (track.platforms.youtube && youtubeVideoId) {
          console.log(`Activating YouTube player for track ${track.id}`);

          // Activer la visibilité immédiatement pour éviter des basculements visuels
          setIsYoutubeVisible(true);
          setIsSoundcloudVisible(false);

          // S'assurer que le lecteur est visible
          const updateYoutubePlayer = () => {
            if (iframeRef.current) {
              iframeRef.current.style.opacity = '1';
              iframeRef.current.style.pointerEvents = 'auto';

              // Attendre que l'iframe soit visible avant d'envoyer la commande play
              // pour éviter des problèmes de synchronisation
              if (iframeRef.current.contentWindow) {
                iframeRef.current.contentWindow.postMessage(
                  JSON.stringify({ event: 'command', func: 'playVideo' }),
                  '*'
                );
              }
            }
          };

          // Utiliser un court délai pour s'assurer que les propriétés DOM sont appliquées
          setTimeout(updateYoutubePlayer, 100);
        } else if (track.platforms.soundcloud && soundcloudUrl) {
          console.log(`Activating SoundCloud player for track ${track.id}`);
          setIsSoundcloudVisible(true);
          setIsYoutubeVisible(false);

          // S'assurer que le lecteur est visible et actif
          setTimeout(() => {
            if (soundcloudIframeRef.current) {
              soundcloudIframeRef.current.style.opacity = '1';
              soundcloudIframeRef.current.style.pointerEvents = 'auto';

              // Démarrer la lecture
              if (soundcloudIframeRef.current.contentWindow) {
                soundcloudIframeRef.current.contentWindow.postMessage('{"method":"play"}', '*');
              }
            }
          }, 100);
        }
      } else {
        // Si on est en pause, s'assurer que les iframes sont en pause mais rester visible
        if (
          track.platforms.youtube &&
          youtubeVideoId &&
          iframeRef.current &&
          iframeRef.current.contentWindow
        ) {
          // Maintenir la visibilité même si en pause
          setIsYoutubeVisible(true);

          // Envoyer la commande de pause avec un délai
          setTimeout(() => {
            if (iframeRef.current && iframeRef.current.contentWindow) {
              iframeRef.current.contentWindow.postMessage(
                JSON.stringify({ event: 'command', func: 'pauseVideo' }),
                '*'
              );
            }
          }, 50);
        }

        if (
          track.platforms.soundcloud &&
          soundcloudUrl &&
          soundcloudIframeRef.current &&
          soundcloudIframeRef.current.contentWindow
        ) {
          // Maintenir la visibilité même si en pause
          setIsSoundcloudVisible(true);

          soundcloudIframeRef.current.contentWindow.postMessage('{"method":"pause"}', '*');
        }
      }
    }
  }, [isActive, isPlaying, track.id, youtubeVideoId, soundcloudUrl]);

  // Définir si on est en mode lecture YouTube ou SoundCloud, pour maintenir le format même en pause
  const isYoutubeActive =
    isActive && track.platforms.youtube && youtubeVideoId && (isYoutubeVisible || isYoutubeLoaded);
  const isSoundcloudActive =
    isActive &&
    track.platforms.soundcloud &&
    soundcloudUrl &&
    (isSoundcloudVisible || isSoundcloudLoaded);

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

    // Mettre à jour l'état local mais ne pas cacher le lecteur
    setLocalIsPlaying(false);
    // NE PAS cacher le lecteur YouTube pour maintenir le format 16/9
    // setIsYoutubeVisible(false);

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

  // Gérer le clic sur le bouton de lecture
  const handlePlayClick = () => {
    setIsLoading(true);

    if (isPlaying) {
      // Si déjà en lecture, mettre en pause sans fermer le lecteur
      if (track.platforms.youtube && youtubeVideoId && iframeRef.current) {
        try {
          // Envoyer la commande pause à l'iframe YouTube
          iframeRef.current.contentWindow?.postMessage(
            JSON.stringify({ event: 'command', func: 'pauseVideo' }),
            '*'
          );
          // Mettre à jour l'état local
          setLocalIsPlaying(false);
          // Mettre à jour l'état global
          onPlay(track);
        } catch (error) {
          console.error('Erreur lors de la mise en pause YouTube:', error);
        }
      } else if (track.platforms.soundcloud && soundcloudUrl && soundcloudIframeRef.current) {
        try {
          // Envoyer la commande pause à l'iframe SoundCloud
          soundcloudIframeRef.current.contentWindow?.postMessage('{"method":"pause"}', '*');
          // Mettre à jour l'état local
          setLocalIsPlaying(false);
          // Mettre à jour l'état global
          onPlay(track);
        } catch (error) {
          console.error('Erreur lors de la mise en pause SoundCloud:', error);
        }
      }
    } else {
      // Si en pause, reprendre la lecture et mettre à jour l'interface
      if (track.platforms.youtube && youtubeVideoId && iframeRef.current) {
        // Rendre l'iframe visible si nécessaire
        iframeRef.current.style.opacity = '1';
        iframeRef.current.style.pointerEvents = 'auto';
        // Assurer que le lecteur reste visible
        setIsYoutubeVisible(true);

        try {
          // Envoyer la commande play à l'iframe YouTube
          iframeRef.current.contentWindow?.postMessage(
            JSON.stringify({ event: 'command', func: 'playVideo' }),
            '*'
          );
          // Mettre à jour l'état local
          setLocalIsPlaying(true);
          // Mettre à jour l'état global
          onPlay(track);
        } catch (error) {
          console.error('Erreur lors de la reprise de lecture YouTube:', error);
        }
      } else if (track.platforms.soundcloud && soundcloudUrl && soundcloudIframeRef.current) {
        // Rendre l'iframe visible si nécessaire
        soundcloudIframeRef.current.style.opacity = '1';
        soundcloudIframeRef.current.style.pointerEvents = 'auto';
        // Assurer que le lecteur reste visible
        setIsSoundcloudVisible(true);

        try {
          // Envoyer la commande play à l'iframe SoundCloud
          soundcloudIframeRef.current.contentWindow?.postMessage('{"method":"play"}', '*');
          // Mettre à jour l'état local
          setLocalIsPlaying(true);
          // Mettre à jour l'état global
          onPlay(track);
        } catch (error) {
          console.error('Erreur lors de la reprise de lecture SoundCloud:', error);
        }
      } else {
        // Le lecteur n'est pas affiché, on l'affiche et lance la lecture
        if (track.platforms.youtube) {
          setShowYouTube(true);
        } else if (track.platforms.soundcloud) {
          setShowSoundCloud(true);
        }
        // Mettre à jour l'état local
        setLocalIsPlaying(true);
        // Mettre à jour l'état global
        onPlay(track);
      }
    }

    setIsLoading(false);
  };

  // Choisir l'icône de lecture appropriée
  const renderPlayButton = () => {
    // Afficher l'icône de lecture/pause selon l'état
    if (isActive && isPlaying) {
      return <Pause className="h-12 w-12 text-white drop-shadow-lg" />;
    } else {
      return <Play className="h-12 w-12 text-white drop-shadow-lg ml-1" />;
    }
  };

  // Appliquer le volume lors de la navigation entre pistes
  useEffect(() => {
    // Fonction pour appliquer le volume global aux iframes
    const applyVolumeToCurrentPlayer = () => {
      try {
        // Récupérer le volume global actuel
        const volume =
          typeof localStorage !== 'undefined'
            ? Number(localStorage.getItem('global-music-volume') || '0.8')
            : 0.8;

        console.log(`Applying volume ${volume} to active player for track: ${track.title}`);

        if (isYoutubeActive && iframeRef.current?.contentWindow) {
          // Appliquer directement le volume à YouTube
          const youtubeVolume = Math.min(100, Math.floor(volume * 100));
          iframeRef.current.contentWindow.postMessage(
            JSON.stringify({
              event: 'command',
              func: 'setVolume',
              args: [youtubeVolume],
            }),
            '*'
          );
          console.log(`Applied volume ${youtubeVolume} to YouTube player`);
        }

        if (isSoundcloudActive && soundcloudIframeRef.current?.contentWindow) {
          // Appliquer directement le volume à SoundCloud
          const soundcloudVolume = Math.min(100, Math.floor(volume * 100));
          soundcloudIframeRef.current.contentWindow.postMessage(
            `{"method":"setVolume","value":${soundcloudVolume}}`,
            '*'
          );
          console.log(`Applied volume ${soundcloudVolume} to SoundCloud player`);
        }
      } catch (error) {
        console.error('Error applying volume to current player:', error);
      }
    };

    // Si la carte devient active et en lecture, appliquer le volume
    if (isActive && localIsPlaying) {
      // Ajouter un délai pour s'assurer que l'API est prête
      setTimeout(applyVolumeToCurrentPlayer, 300);
    }
  }, [isActive, localIsPlaying, isYoutubeActive, isSoundcloudActive, track.id, track.title]);

  // Chargement paresseux pour l'iframe YouTube
  const handleIframeLoad = () => {
    setIsYoutubeLoaded(true);
    console.log(`YouTube iframe loaded for track: ${track.title}`);

    // Appliquer le volume global avec un délai pour s'assurer que l'API YouTube est prête
    setTimeout(() => {
      try {
        // Récupérer le volume actuel
        const volume =
          typeof localStorage !== 'undefined'
            ? Number(localStorage.getItem('global-music-volume') || '0.8')
            : 0.8;

        // Amplifier le volume pour YouTube
        const youtubeVolume = Math.min(100, Math.floor(volume * 100));

        console.log(`Setting volume to ${youtubeVolume} for YouTube iframe: ${track.title}`);

        // Utiliser le format de message correct pour YouTube
        if (iframeRef.current?.contentWindow) {
          iframeRef.current.contentWindow.postMessage(
            JSON.stringify({
              event: 'command',
              func: 'setVolume',
              args: [youtubeVolume],
            }),
            '*'
          );
        }

        // S'assurer également que la vidéo est visible si nécessaire
        if (isActive && localIsPlaying && iframeRef.current) {
          iframeRef.current.style.opacity = '1';
          iframeRef.current.style.pointerEvents = 'auto';

          if (iframeRef.current.contentWindow) {
            iframeRef.current.contentWindow.postMessage(
              JSON.stringify({ event: 'command', func: 'playVideo' }),
              '*'
            );
          }
        }
      } catch (error) {
        console.error('Error initializing YouTube volume:', error);
      }
    }, 800); // Un délai plus long pour s'assurer que l'API YouTube est complètement initialisée
  };

  // Fonction pour fermer le lecteur YouTube ou SoundCloud
  const handleClosePlayer = (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }

    // Fermer d'abord YouTube si actif
    if (isYoutubeVisible) {
      try {
        if (iframeRef.current && iframeRef.current.contentWindow) {
          // Mettre en pause avant de fermer complètement
          iframeRef.current.contentWindow.postMessage(
            JSON.stringify({ event: 'command', func: 'pauseVideo' }),
            '*'
          );
        }
      } catch (error) {
        console.error('Erreur lors de la mise en pause YouTube:', error);
      }
    }

    // Fermer SoundCloud si actif
    if (isSoundcloudVisible) {
      try {
        if (soundcloudIframeRef.current && soundcloudIframeRef.current.contentWindow) {
          soundcloudIframeRef.current.contentWindow.postMessage('{"method":"pause"}', '*');
        }
      } catch (error) {
        console.error('Erreur lors de la mise en pause SoundCloud:', error);
      }
    }

    // Mettre à jour les états locaux - fermer complètement le lecteur
    setLocalIsPlaying(false);
    setIsYoutubeVisible(false);
    setIsSoundcloudVisible(false);

    // Réinitialiser l'état global pour fermer aussi le footer player
    // Au lieu de basculer l'état, on signale au parent qu'il faut arrêter complètement la lecture
    if (isActive) {
      // Communiquer au parent qu'il faut fermer le lecteur
      onPlay({ ...track, close: true } as any);
    }
  };

  // Analyser l'audio pour la waveform (uniquement pour YouTube)
  useEffect(() => {
    if ((isYoutubeActive && isYoutubeVisible) || (isSoundcloudActive && isSoundcloudVisible)) {
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
  }, [isYoutubeActive, isYoutubeVisible, isSoundcloudActive, isSoundcloudVisible]);

  // Ajout du gestionnaire pour SoundCloud
  useEffect(() => {
    if (isSoundcloudActive) {
      // Activer l'affichage SoundCloud
      setIsSoundcloudVisible(true);

      // Écouter les messages de SoundCloud (SC Widget API)
      const handleSoundcloudMessage = (event: MessageEvent) => {
        if (event.origin !== 'https://w.soundcloud.com') return;

        try {
          const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
          // Gérer les éventuels événements de l'API SoundCloud
          console.log('SoundCloud event:', data);
        } catch (e) {
          // Ignorer les erreurs de parsing
        }
      };

      window.addEventListener('message', handleSoundcloudMessage);

      return () => {
        window.removeEventListener('message', handleSoundcloudMessage);
      };
    }
  }, [isSoundcloudActive, soundcloudUrl]);

  // Fonction pour mettre en pause et cacher le lecteur SoundCloud sans le détruire
  const pauseAndHideSoundcloud = () => {
    try {
      // Mettre en pause la vidéo
      if (soundcloudIframeRef.current && soundcloudIframeRef.current.contentWindow) {
        soundcloudIframeRef.current.contentWindow.postMessage('{"method":"pause"}', '*');
      }
    } catch (e) {
      console.error('Erreur lors de la mise en pause SoundCloud:', e);
    }

    // Mettre à jour l'état local mais ne pas cacher le lecteur
    setLocalIsPlaying(false);
    // NE PAS cacher le lecteur SoundCloud pour maintenir le format 16/9
    // setIsSoundcloudVisible(false);

    // S'assurer que l'état global est aussi mis à jour pour corriger l'affichage du bouton
    if (isPlaying) {
      onPlay(track); // Cela basculera l'état isPlaying
    }
  };

  // Fonction pour reprendre la lecture SoundCloud
  const resumeSoundcloud = () => {
    setLocalIsPlaying(true);
    setIsSoundcloudVisible(true);

    // Mettre à jour l'état global si nécessaire
    if (!isPlaying) {
      onPlay(track);
    }

    // Si l'iframe est déjà chargée, on reprend la lecture
    try {
      if (soundcloudIframeRef.current && soundcloudIframeRef.current.contentWindow) {
        setTimeout(() => {
          soundcloudIframeRef.current?.contentWindow?.postMessage('{"method":"play"}', '*');
        }, 100);
      }
    } catch (e) {
      console.error('Erreur lors de la reprise SoundCloud:', e);
    }
  };

  // Chargement paresseux pour l'iframe SoundCloud
  const handleSoundcloudIframeLoad = () => {
    setIsSoundcloudLoaded(true);
    console.log(`SoundCloud iframe loaded for track: ${track.title}`);

    // Appliquer le volume global avec un délai pour s'assurer que l'API SoundCloud est prête
    setTimeout(() => {
      try {
        // Récupérer le volume actuel
        let volume =
          typeof localStorage !== 'undefined'
            ? Number(localStorage.getItem('global-music-volume') || '0.8')
            : 0.8;

        // Amplifier le volume pour SoundCloud
        const soundcloudVolume = Math.min(100, Math.floor(volume * 100));

        console.log(`Setting volume to ${soundcloudVolume} for SoundCloud iframe: ${track.title}`);

        // Utiliser le format de message correct pour SoundCloud
        if (soundcloudIframeRef.current?.contentWindow) {
          soundcloudIframeRef.current.contentWindow.postMessage(
            `{"method":"setVolume","value":${soundcloudVolume}}`,
            '*'
          );
        }

        // S'assurer également que l'iframe est visible si nécessaire
        if (isActive && localIsPlaying && soundcloudIframeRef.current) {
          soundcloudIframeRef.current.style.opacity = '1';
          soundcloudIframeRef.current.style.pointerEvents = 'auto';

          if (soundcloudIframeRef.current.contentWindow) {
            soundcloudIframeRef.current.contentWindow.postMessage('{"method":"play"}', '*');
          }
        }
      } catch (error) {
        console.error('Error initializing SoundCloud volume:', error);
      }
    }, 800); // Un délai plus long pour s'assurer que l'API SoundCloud est complètement initialisée
  };

  // Préparation de l'URL pour l'embed SoundCloud
  const getSoundcloudEmbedUrl = (url: string) => {
    // Format standard pour les URL d'embed SoundCloud avec API JS
    return `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&color=%23ff5500&auto_play=true&hide_related=true&show_comments=false&show_user=true&show_reposts=false&show_teaser=false&visual=true&buying=false&sharing=false&download=false&single_active=false&callback=true&allow_api=true&origin=${encodeURIComponent(window.location.origin)}`;
  };

  return (
    <motion.div
      id={`music-card-${track.id}`}
      ref={cardRef}
      className={`group relative rounded-xl overflow-hidden border transition-all duration-300 transform ${
        isYoutubeActive || isSoundcloudActive
          ? '' // Pas de cursor-pointer quand YouTube ou SoundCloud est actif
          : 'cursor-pointer hover:-translate-y-1'
      } ${
        isActive
          ? 'border-purple-500/70 shadow-lg shadow-purple-500/20 bg-purple-900/30'
          : 'border-gray-700/50 bg-gray-800/30 hover:border-purple-500/50 hover:shadow-lg hover:shadow-purple-500/10'
      } ${isYoutubeActive || isSoundcloudActive ? 'col-span-1 md:col-span-2' : ''}`}
      whileHover={isYoutubeActive || isSoundcloudActive ? {} : { scale: 1.02 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={(e) => {
        // Ne déclencher handlePlayClick que si on n'a pas cliqué sur un élément interactif
        if (!(e.target as HTMLElement).closest('button, a, iframe')) {
          handlePlayClick();
        }
      }}
    >
      {/* Affichage YouTube, SoundCloud ou image selon le cas - avec aspect ratio fixé */}
      <div
        className="relative overflow-hidden"
        style={{
          aspectRatio:
            isYoutubeActive || isSoundcloudActive
              ? '16/9' // Video ou player ratio
              : '1/1', // Default square ratio
        }}
      >
        {/* YouTube iframe - voir code existant */}
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

            {/* Bouton X pour fermer la vidéo YouTube - bien intégré */}
            <div className="absolute top-0 right-0 z-50">
              <button
                onClick={(e) => handleClosePlayer(e)}
                className="flex items-center justify-center bg-purple-600/70 hover:bg-purple-700/90 text-white/90 rounded-bl-lg p-1.5 transition-colors shadow-lg"
                aria-label="Fermer le lecteur"
                style={{ width: '28px', height: '28px' }}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ) : null}

        {/* SoundCloud iframe */}
        {track.platforms.soundcloud &&
        soundcloudUrl &&
        (isSoundcloudVisible || isSoundcloudLoaded) ? (
          <div
            className={`w-full h-full bg-black pointer-events-auto transition-opacity duration-300 ${
              isSoundcloudVisible ? 'opacity-100' : 'opacity-0 absolute inset-0 pointer-events-none'
            }`}
          >
            <iframe
              id={`soundcloud-iframe-${track.id}`}
              src={getSoundcloudEmbedUrl(soundcloudUrl)}
              width="100%"
              height="100%"
              frameBorder="0"
              allow="autoplay"
              className="w-full h-full z-30"
              ref={soundcloudIframeRef}
              onLoad={handleSoundcloudIframeLoad}
            ></iframe>

            {/* Bouton X pour fermer la vidéo SoundCloud - bien intégré */}
            <div className="absolute top-0 right-0 z-50">
              <button
                onClick={(e) => handleClosePlayer(e)}
                className="flex items-center justify-center bg-orange-500/70 hover:bg-orange-600/90 text-white/90 rounded-bl-lg p-1.5 transition-colors shadow-lg"
                aria-label="Fermer le lecteur"
                style={{ width: '28px', height: '28px' }}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ) : null}

        {/* Image normale - visible quand aucun player n'est actif */}
        {!isYoutubeVisible && !isSoundcloudVisible && (
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

        {/* Overlay sombre pour mieux voir les badges - masqué quand un player est actif */}
        {!isYoutubeVisible && !isSoundcloudVisible && (
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent opacity-60 group-hover:opacity-70 transition-opacity"></div>
        )}

        {/* Badge type de musique - masqué quand un player est actif */}
        {!isYoutubeVisible && !isSoundcloudVisible && (
          <div className="absolute top-4 left-4">
            <span className="bg-purple-600/90 backdrop-blur-sm text-white px-3.5 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 shadow-lg">
              <Music className="w-3.5 h-3.5" />
              {getTypeLabel(track.type)}
            </span>
          </div>
        )}

        {/* Badge Featured - masqué quand un player est actif */}
        {track.featured && !isYoutubeVisible && !isSoundcloudVisible && (
          <div className="absolute top-4 right-4">
            <span className="bg-yellow-500/90 backdrop-blur-sm text-white px-3.5 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 shadow-lg">
              Highlight
            </span>
          </div>
        )}

        {/* Overlay de lecture - affiché sur hover ou quand actif mais pas en lecture YouTube/SoundCloud */}
        {!isYoutubeVisible && !isSoundcloudVisible && (
          <div
            className={`absolute inset-0 flex items-center justify-center bg-black/40 transition-opacity music-card-overlay ${
              isActive && isPlaying ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
            }`}
            onClick={(e) => {
              e.stopPropagation();
              handlePlayClick();
            }}
          >
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              className="p-4 rounded-full bg-purple-700/80 hover:bg-purple-600/90 flex items-center justify-center backdrop-blur-sm play-button"
              onClick={(e) => {
                e.stopPropagation();
                handlePlayClick();
              }}
              aria-label={isPlaying && isActive ? 'Pause' : 'Lecture'}
            >
              {renderPlayButton()}
            </motion.button>
          </div>
        )}
      </div>

      {/* Infos du morceau - Masqué quand un player est actif */}
      {!isYoutubeVisible && !isSoundcloudVisible && (
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
            {track.platforms.soundcloud?.url && (
              <a
                href={track.platforms.soundcloud.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className={`${platformColors.soundcloud} text-white px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all hover:scale-105 shadow-md`}
              >
                {platformIcons.soundcloud}
                SoundCloud
              </a>
            )}
          </div>
        </div>
      )}

      {/* Effet de brillance au survol */}
      {!isYoutubeVisible && !isSoundcloudVisible && (
        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/0 via-purple-500/5 to-purple-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
      )}

      {/* Espace réservé avec animation chromatique pour les lecteurs actifs (YouTube ou SoundCloud) */}
      {(isYoutubeVisible || isSoundcloudVisible) && (
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
                    transition={{ duration: 0.5, ease: 'easeOut' }}
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
