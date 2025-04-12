import { useRef, useState, useEffect } from 'react';
import { extractYoutubeId } from '@/lib/utils/media-helpers';

interface UseYoutubePlayerProps {
  url?: string | null;
  isActive: boolean;
  isPlaying: boolean;
  onTogglePlay?: () => void;
}

/**
 * Hook personnalisé pour gérer le lecteur YouTube
 * avec une gestion d'état simplifiée pour faciliter les tests
 */
export const useYoutubePlayer = ({
  url,
  isActive,
  isPlaying,
  onTogglePlay,
}: UseYoutubePlayerProps) => {
  const [videoId, setVideoId] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const timeIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Extraire l'ID YouTube de l'URL
  useEffect(() => {
    if (url) {
      const id = extractYoutubeId(url);
      setVideoId(id);

      // Récupérer le temps de lecture sauvegardé
      if (id && typeof window !== 'undefined') {
        const savedTime = localStorage.getItem(`youtube-time-${id}`);
        if (savedTime) {
          setCurrentTime(parseFloat(savedTime));
        }
      }
    } else {
      setVideoId(null);
    }
  }, [url]);

  // Gérer la visibilité du lecteur en fonction de l'état (actif et en lecture)
  useEffect(() => {
    if (isActive) {
      setIsVisible(true);
    } else {
      setIsVisible(false);
      pauseVideo();
    }
  }, [isActive]);

  // Gérer la lecture/pause en fonction de l'état
  useEffect(() => {
    if (isActive && isVisible) {
      if (isPlaying) {
        playVideo();
      } else {
        pauseVideo();
      }
    }
  }, [isActive, isPlaying, isVisible, isLoaded]);

  // Gérer le suivi du temps de lecture
  useEffect(() => {
    if (isActive && isPlaying && videoId) {
      startTimeTracking();
    } else {
      stopTimeTracking();
    }

    return () => {
      stopTimeTracking();
    };
  }, [isActive, isPlaying, videoId]);

  // Démarrer le suivi du temps de lecture
  const startTimeTracking = () => {
    stopTimeTracking();

    // Ne pas démarrer le suivi en mode test
    if (process.env.NODE_ENV === 'test') return;

    timeIntervalRef.current = setInterval(() => {
      try {
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

    // Écouter les messages du lecteur YouTube
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== 'https://www.youtube.com') return;

      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;

        if (data && data.info && typeof data.info.currentTime === 'number') {
          setCurrentTime(data.info.currentTime);

          if (typeof window !== 'undefined' && videoId) {
            localStorage.setItem(`youtube-time-${videoId}`, data.info.currentTime.toString());
          }
        }
      } catch (e) {
        // Ignorer les erreurs de parsing
      }
    };

    window.addEventListener('message', handleMessage);

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  };

  // Arrêter le suivi du temps de lecture
  const stopTimeTracking = () => {
    if (timeIntervalRef.current) {
      clearInterval(timeIntervalRef.current);
      timeIntervalRef.current = null;
    }
  };

  // Démarrer la lecture
  const playVideo = () => {
    if (process.env.NODE_ENV === 'test') return;

    try {
      if (iframeRef.current && iframeRef.current.contentWindow) {
        setTimeout(() => {
          if (iframeRef.current && iframeRef.current.contentWindow) {
            iframeRef.current.contentWindow.postMessage(
              JSON.stringify({ event: 'command', func: 'playVideo' }),
              '*'
            );
          }
        }, 100);
      }
    } catch (e) {
      console.error('Erreur lors de la lecture YouTube:', e);
    }
  };

  // Mettre en pause la lecture
  const pauseVideo = () => {
    if (process.env.NODE_ENV === 'test') return;

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
  };

  // Gérer le chargement de l'iframe
  const handleIframeLoad = () => {
    setIsLoaded(true);

    // Ne pas continuer en mode test
    if (process.env.NODE_ENV === 'test') return;

    // Appliquer l'état actuel après le chargement
    setTimeout(() => {
      if (isActive && isPlaying) {
        playVideo();
      } else {
        pauseVideo();
      }
    }, 300);
  };

  // Obtenir l'URL d'intégration YouTube
  const getEmbedUrl = (): string => {
    if (!videoId) return '';

    return `https://www.youtube.com/embed/${videoId}?enablejsapi=1&autoplay=${
      isPlaying ? '1' : '0'
    }&start=${Math.floor(
      currentTime
    )}&modestbranding=1&rel=0&showinfo=0&color=white&playsinline=1&controls=1&origin=${
      typeof window !== 'undefined' ? encodeURIComponent(window.location.origin) : ''
    }`;
  };

  return {
    videoId,
    isLoaded,
    isVisible,
    currentTime,
    iframeRef,
    handleIframeLoad,
    setIsVisible,
    playVideo,
    pauseVideo,
    getEmbedUrl,
  };
};
