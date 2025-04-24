'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Track, MusicPlatform } from '@/lib/utils/types';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Play, Pause, ExternalLink, Music, Calendar, X, Star } from 'lucide-react';
import { FaSpotify, FaYoutube, FaSoundcloud, FaApple, FaMusic } from 'react-icons/fa';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  sendPlayerCommand,
  getInitialVolume,
  applyVolumeToAllPlayers,
} from '@/lib/utils/audioUtils';

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

/**
 * MusicCard Component:
 * Displays individual track information and provides controls for playing the track.
 * Manages the embedded YouTube/SoundCloud iframe player lifecycle (loading, visibility, commands)
 * based on whether the card is the currently active track (`isActive`) and the global playback state (`isPlaying`).
 * It uses utility functions for sending commands and applying initial volume.
 */
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
  const [isSoundcloudReady, setIsSoundcloudReady] = useState(false);
  const [playWhenReady, setPlayWhenReady] = useState(false);

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

      // Utiliser la fonction centralisée pour mettre en pause
      sendPlayerCommand(iframeRef.current, 'youtube', 'pause');
      sendPlayerCommand(soundcloudIframeRef.current, 'soundcloud', 'pause');
    } else {
      // Si c'est la carte active, synchroniser avec l'état global
      // mais seulement après un court délai pour éviter les changements transitoires
      const syncTimeout = setTimeout(() => {
        console.log(
          `MusicCard: synchronisation de l'état local pour track ${track.id} - isPlaying=${isPlaying}`
        );
        setLocalIsPlaying(isPlaying);
      }, 50); // Délai court pour éviter les réactions aux changements transitoires

      return () => clearTimeout(syncTimeout);
    }
  }, [isActive, isPlaying, track.id]);

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

  // Effect for activating/controlling the correct player when isActive changes or playback state changes
  useEffect(() => {
    if (!isActive) return; // Only run for the active card

    const platform = track.platforms.youtube
      ? 'youtube'
      : track.platforms.soundcloud
        ? 'soundcloud'
        : null;
    //const iframe = platform === 'youtube' ? iframeRef.current : soundcloudIframeRef.current; // We'll get the iframe ref inside logic now

    console.log(
      `Active Card Effect: Track ${track.id}, isPlaying: ${isPlaying}, platform: ${platform}`
    );

    if (isPlaying) {
      // Indicate intention to play when ready
      if (platform === 'youtube' && youtubeVideoId) {
        setIsYoutubeVisible(true);
        setIsSoundcloudVisible(false);
        setPlayWhenReady(false); // Reset soundcloud flag
        console.log(`[Card ${track.id}] YouTube selected. Visibility set. Play command delayed.`);
        // Delay play command slightly to ensure iframe is ready/visible (YouTube seems less problematic)
        // TODO: Consider adding 'ready' handling for YouTube as well for robustness
        setTimeout(() => sendPlayerCommand(iframeRef.current, 'youtube', 'play'), 150);
      } else if (platform === 'soundcloud' && soundcloudUrl) {
        setIsSoundcloudVisible(true);
        setIsYoutubeVisible(false);
        console.log(
          `[Card ${track.id}] SoundCloud selected. isReady=${isSoundcloudReady}, iframeRef=${!!soundcloudIframeRef.current}`
        );
        // If already ready, play immediately. Otherwise, set flag.
        if (isSoundcloudReady && soundcloudIframeRef.current) {
          console.log(`[Card ${track.id}] SoundCloud already ready. Applying volume and playing.`);
          // Apply current volume immediately before playing
          const currentVolume = getInitialVolume(); // Or ideally get from global state/context
          console.log(`[Card ${track.id}] Applying volume ${currentVolume} before playing.`);
          sendPlayerCommand(soundcloudIframeRef.current, 'soundcloud', 'setVolume', currentVolume);
          sendPlayerCommand(soundcloudIframeRef.current, 'soundcloud', 'play');
          setPlayWhenReady(false); // Reset flag
        } else {
          console.log(`[Card ${track.id}] SoundCloud not ready. Setting playWhenReady flag.`);
          setPlayWhenReady(true); // Set flag to play when 'ready' event arrives
        }
      }
    } else {
      // Pause command
      setPlayWhenReady(false); // Reset flag if pausing
      if (platform === 'youtube' && iframeRef.current) {
        sendPlayerCommand(iframeRef.current, 'youtube', 'pause');
        // Keep visible for active track
        setIsYoutubeVisible(true);
      } else if (platform === 'soundcloud' && soundcloudIframeRef.current) {
        sendPlayerCommand(soundcloudIframeRef.current, 'soundcloud', 'pause');
        // Keep visible for active track
        setIsSoundcloudVisible(true);
      }
    }
  }, [
    isActive,
    isPlaying, // Re-run when play state changes
    track.id,
    track.platforms.youtube,
    track.platforms.soundcloud,
    youtubeVideoId,
    soundcloudUrl,
    isSoundcloudReady, // Re-run when SoundCloud becomes ready
  ]); // Dependencies include platform info and ready state

  // Effect to play SoundCloud when it becomes ready AND play is intended
  useEffect(() => {
    if (
      playWhenReady &&
      isSoundcloudReady &&
      isActive &&
      isPlaying && // Ensure we are still supposed to be playing
      track.platforms.soundcloud &&
      soundcloudIframeRef.current
    ) {
      console.log(
        `[Card ${track.id}] useEffect[playWhenReady, isReady]: Triggered. playWhenReady=${playWhenReady}, isReady=${isSoundcloudReady}, isActive=${isActive}, isPlaying=${isPlaying}`
      );
      // Apply current volume immediately before playing
      const currentVolume = getInitialVolume(); // Or ideally get from global state/context
      console.log(`[Card ${track.id}] Applying volume ${currentVolume} then playing.`);
      sendPlayerCommand(soundcloudIframeRef.current, 'soundcloud', 'setVolume', currentVolume);
      sendPlayerCommand(soundcloudIframeRef.current, 'soundcloud', 'play');
      setPlayWhenReady(false); // Reset the flag
    }
  }, [playWhenReady, isSoundcloudReady, isActive, isPlaying, track.platforms.soundcloud]);

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

          // IMPORTANT: Ignorer les événements de changement d'état (playerState)
          // qui viennent de l'API YouTube et qui pourraient perturber notre logique
          // PlayerState: -1 (non démarré), 0 (terminé), 1 (lecture), 2 (pause), 3 (buffering), 5 (vidéo à lire)
          if (data && data.info && typeof data.info.playerState !== 'undefined') {
            console.log(
              `[Card ${track.id}] Événement YouTube ignoré - playerState: ${data.info.playerState}`
            );
            // Si on reçoit un événement de lecture (playerState=1) alors que localIsPlaying est déjà true,
            // ou un événement de pause (playerState=2) alors que localIsPlaying est déjà false,
            // c'est probablement un écho de notre commande et on peut l'ignorer
            if (
              (data.info.playerState === 1 && localIsPlaying) ||
              (data.info.playerState === 2 && !localIsPlaying)
            ) {
              console.log(
                `[Card ${track.id}] Événement YouTube cohérent avec état actuel - ignoré`
              );
              return;
            }

            // Si on reçoit un événement contradictoire, on pourrait avoir besoin de le bloquer
            // pour empêcher des cycles, mais ne pas toucher à l'état global car cela pourrait
            // interférer avec la navigation entre pistes
            console.log(
              `[Card ${track.id}] Événement YouTube contradictoire avec état actuel - bloqué`
            );
            return;
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
  }, [isYoutubeActive, youtubeVideoId, track.id, localIsPlaying]);

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
        // Utiliser la fonction centralisée pour mettre en pause
        sendPlayerCommand(iframeRef.current, 'youtube', 'pause');
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
          // Utiliser la fonction centralisée pour jouer
          sendPlayerCommand(iframeRef.current, 'youtube', 'play');
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

  // Gérer le clic sur le bouton de lecture - Simplifié
  const handlePlayClick = () => {
    // Simplement notifier le parent de l'intention de jouer cette piste.
    // Le parent (MusicPage) gérera le changement d'état et l'activation.
    onPlay(track);
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

  // Gérer le chargement initial de l'iframe YouTube
  const handleIframeLoad = () => {
    setIsYoutubeLoaded(true);
    setIsLoading(false); // Fin du chargement pour YouTube
    console.log(`YouTube iframe loaded for ${track.title}, ID: ${iframeRef.current?.id}`);

    // Appliquer le volume initial une fois l'API chargée
    // Note: On utilise applyVolumeToAllPlayers pour s'assurer que ce nouveau lecteur reçoit le volume actuel
    const currentVolume = getInitialVolume();
    applyVolumeToAllPlayers(currentVolume);
    console.log(`MusicCard: Applied initial volume ${currentVolume} globally after YouTube load`);
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
          sendPlayerCommand(iframeRef.current, 'youtube', 'pause');
        }
      } catch (error) {
        console.error('Erreur lors de la mise en pause YouTube:', error);
      }
    }

    // Fermer SoundCloud si actif
    if (isSoundcloudVisible) {
      try {
        if (soundcloudIframeRef.current && soundcloudIframeRef.current.contentWindow) {
          sendPlayerCommand(soundcloudIframeRef.current, 'soundcloud', 'pause');
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
        analyzerRef.current = null; // Clean up analyzer node
      };
    } else {
      // Réinitialiser les données quand le lecteur n'est pas actif
      setAudioData(Array(20).fill(0));
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    }
  }, [isYoutubeActive, isYoutubeVisible, isSoundcloudActive, isSoundcloudVisible]);

  // Gérer les messages entrants de l'iframe SoundCloud
  useEffect(() => {
    const handleSoundcloudMessage = (event: MessageEvent) => {
      // Check if the source iframe matches this card's iframe
      if (
        !soundcloudIframeRef.current ||
        event.source !== soundcloudIframeRef.current.contentWindow
      ) {
        // console.log(`[Card ${track.id}] Message ignored: Source mismatch or iframe ref not set.`);
        return; // Ignore messages not from this specific iframe instance
      }

      try {
        const data = JSON.parse(event.data);
        console.log(
          `[Card ${track.id}] SoundCloud event received from OWN iframe: ${JSON.stringify(data)}`
        );

        if (data.method === 'ready') {
          console.log(
            `[Card ${track.id}] SoundCloud iframe READY event received. Setting isSoundcloudReady to true.`
          );
          setIsSoundcloudReady(true); // Mettre à jour l'état ready
        }
        // Handle other methods if needed
      } catch (e) {
        console.error(`[Card ${track.id}] Error parsing SoundCloud message:`, e, event.data);
      }
    };

    window.addEventListener('message', handleSoundcloudMessage);

    return () => {
      window.removeEventListener('message', handleSoundcloudMessage);
      // Réinitialiser l'état ready quand le composant est démonté ou la track change
      console.log(`[Card ${track.id}] Cleanup: Resetting isSoundcloudReady and playWhenReady.`);
      setIsSoundcloudReady(false);
      setPlayWhenReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Remove track.id dependency - listener identity doesn't depend on it, cleanup uses closure.

  // Fonction pour mettre en pause et cacher le lecteur SoundCloud sans le détruire
  const pauseAndHideSoundcloud = () => {
    try {
      // Mettre en pause la vidéo
      if (soundcloudIframeRef.current && soundcloudIframeRef.current.contentWindow) {
        sendPlayerCommand(soundcloudIframeRef.current, 'soundcloud', 'pause');
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
          sendPlayerCommand(soundcloudIframeRef.current, 'soundcloud', 'play');
        }, 100);
      }
    } catch (e) {
      console.error('Erreur lors de la reprise SoundCloud:', e);
    }
  };

  // Gérer le chargement initial de l'iframe SoundCloud
  const handleSoundcloudIframeLoad = () => {
    console.log(
      `SoundCloud iframe loaded for ${track.title}, ID: ${soundcloudIframeRef.current?.id}`
    );
    setIsSoundcloudLoaded(true);
    // !!! SUPPRIMÉ: Appel redondant et potentiellement problématique
    // applyVolumeToAllPlayers(getInitialVolume());
    // console.log(`MusicCard: Applied initial volume ${getInitialVolume()} globally after SoundCloud load`);
  };

  // Préparation de l'URL pour l'embed SoundCloud
  const getSoundcloudEmbedUrl = (url: string) => {
    // Format standard pour les URL d'embed SoundCloud avec API JS
    return `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&color=%23ff5500&auto_play=false&hide_related=true&show_comments=false&show_user=true&show_reposts=false&show_teaser=false&visual=true&buying=false&sharing=false&download=false&single_active=false&callback=true&allow_api=true&origin=${encodeURIComponent(window.location.origin)}`;
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
            {track.imageId && !imageError ? (
              <img
                src={`/uploads/${track.imageId}.jpg?t=${track.updatedAt ? new Date(track.updatedAt).getTime() : Date.now()}`}
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
          <div className="absolute top-4 left-4 flex items-center gap-2">
            {/* Badge Type */}
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-600 text-purple-100 shadow-lg">
              <Music className="w-3 h-3 mr-1" />
              {getTypeLabel(track.type)}
            </span>
            {/* Étoile Featured (si applicable) ajoutée ici */}
            {track.featured && (
              <span className="relative flex h-5 w-5" aria-hidden="true">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-300 opacity-75"></span>
                <Star
                  className="relative inline-flex h-5 w-5 text-yellow-400"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                />
              </span>
            )}
          </div>
        )}

        {/* Combined Top-Right Badges: Platforms only (Featured star removed from here) */}
        <div className="absolute top-4 right-4 flex flex-row items-center gap-2 z-10">
          {/* Platform Badges - only visible when info section is shown */}
          {!isYoutubeVisible && !isSoundcloudVisible && (
            <>
              {/* YouTube Badge/Link */}
              {track.platforms.youtube?.url && (
                <a
                  href={track.platforms.youtube.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className={`${platformColors.youtube} text-white p-1.5 rounded-full transition-all hover:scale-105 shadow-md`}
                  title="Voir sur YouTube"
                >
                  {platformIcons.youtube}
                </a>
              )}
              {/* SoundCloud Badge/Link */}
              {track.platforms.soundcloud?.url && (
                <a
                  href={track.platforms.soundcloud.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className={`${platformColors.soundcloud} text-white p-1.5 rounded-full transition-all hover:scale-105 shadow-md`}
                  title="Écouter sur SoundCloud"
                >
                  {platformIcons.soundcloud}
                </a>
              )}
              {/* Spotify Badge/Link */}
              {track.platforms.spotify?.url && (
                <a
                  href={track.platforms.spotify.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className={`${platformColors.spotify} text-white p-1.5 rounded-full transition-all hover:scale-105 shadow-md`}
                  title="Écouter sur Spotify"
                >
                  {platformIcons.spotify}
                </a>
              )}
              {/* Apple Music Badge/Link */}
              {track.platforms.apple?.url && (
                <a
                  href={track.platforms.apple.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className={`${platformColors.apple} text-white p-1.5 rounded-full transition-all hover:scale-105 shadow-md`}
                  title="Écouter sur Apple Music"
                >
                  {platformIcons.apple}
                </a>
              )}
              {/* Deezer Badge/Link */}
              {track.platforms.deezer?.url && (
                <a
                  href={track.platforms.deezer.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className={`${platformColors.deezer} text-white p-1.5 rounded-full transition-all hover:scale-105 shadow-md`}
                  title="Écouter sur Deezer"
                >
                  {platformIcons.deezer}
                </a>
              )}
            </>
          )}
        </div>

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
        <div className="p-5 flex flex-col">
          <div>
            <h3 className="text-xl font-bold text-white mb-2 line-clamp-1 group-hover:text-purple-300 transition-colors">
              {track.title}
            </h3>

            <div className="flex items-center text-gray-400 mb-3 text-sm">
              <Calendar className="w-4 h-4 mr-2 flex-shrink-0" />
              <span>{format(parseISO(track.releaseDate), 'd MMMM yyyy', { locale: fr })}</span>
            </div>

            {/* Badges Type, Featured, Genre, BPM */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Étoile Featured (si applicable) - DÉJÀ SUPPRIMÉE D'ICI */}
              {/* Badges Genre */}
              {track.genre.map((genre, index) => (
                <span
                  key={index}
                  className="text-xs px-2 py-1 rounded-full bg-gray-700/50 text-gray-300 order-3"
                >
                  {genre}
                </span>
              ))}
              {/* Badge BPM */}
              {track.bpm && (
                <span className="text-xs px-2 py-1 rounded-full bg-gray-700/50 text-gray-300 order-4">
                  {track.bpm} BPM
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Effet de brillance au survol */}
      {!isYoutubeVisible && !isSoundcloudVisible && (
        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/0 via-purple-500/5 to-purple-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
      )}

      {/* Espace réservé avec animation chromatique pour les lecteurs actifs (Reduced height) */}
      {(isYoutubeVisible || isSoundcloudVisible) && (
        <div className="h-[64px] bg-gradient-to-r from-purple-900/10 via-purple-900/30 to-purple-900/10 flex items-end justify-center overflow-hidden">
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
