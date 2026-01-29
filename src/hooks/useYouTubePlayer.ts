import { useState, useEffect, useRef, useCallback } from 'react';

import { logger } from '@/lib/logger';
import {
  sendPlayerCommand,
  getInitialVolume,
  applyVolumeToAllPlayers,
} from '@/lib/utils/audioUtils';
import { Track, TrackWithClose } from '@/lib/utils/types';

interface UseYouTubePlayerProps {
  track: Track;
  isActive: boolean;
  isPlaying: boolean;
  onPlay: (track: Track) => void;
  shouldActivate?: boolean;
}

interface UseYouTubePlayerReturn {
  youtubeVideoId: string | null;
  currentTime: number;
  isYoutubeLoaded: boolean;
  isYoutubeVisible: boolean;
  isYoutubeActive: boolean;
  iframeRef: React.RefObject<HTMLIFrameElement | null>;
  setIsYoutubeVisible: (visible: boolean) => void;
  handleIframeLoad: () => void;
  pauseAndHideYoutube: () => void;
  resumeYoutube: () => void;
  handleClosePlayer: (e?: React.MouseEvent) => void;
}

/**
 * Hook to manage YouTube player functionality
 * Handles video ID extraction, iframe lifecycle, play/pause commands, and time tracking
 */
export const useYouTubePlayer = ({
  track,
  isActive,
  isPlaying,
  onPlay,
  shouldActivate = true,
}: UseYouTubePlayerProps): UseYouTubePlayerReturn => {
  const [youtubeVideoId, setYoutubeVideoId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isYoutubeLoaded, setIsYoutubeLoaded] = useState(false);
  const [isYoutubeVisible, setIsYoutubeVisible] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  // Synchronous state adjustment during render to preserve User Gesture on Mobile Safari
  const [prevIsActive, setPrevIsActive] = useState(isActive);
  const [prevIsPlaying, setPrevIsPlaying] = useState(isPlaying);

  if (isActive !== prevIsActive || isPlaying !== prevIsPlaying) {
    if (isActive && isPlaying && shouldActivate && !isYoutubeVisible) {
      logger.remote(`[YT-SYNC] Synchronously setting visibility to true for ${track.id}`);
      setIsYoutubeVisible(true);
    }
    setPrevIsActive(isActive);
    setPrevIsPlaying(isPlaying);
  }
  const timeIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Extract YouTube video ID from URL
  const extractYoutubeId = useCallback((url: string): string | null => {
    if (!url) return null;

    // Case where URL is already an ID
    if (url.match(/^[a-zA-Z0-9_-]{11}$/)) {
      return url;
    }

    // Standard formats: youtube.com/watch?v=ID or youtu.be/ID
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    if (match && match[1]) {
      return match[1];
    }

    // Alternative formats: youtube.com/embed/ID
    const embedMatch = url.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/);
    if (embedMatch && embedMatch[1]) {
      return embedMatch[1];
    }

    return null;
  }, []);

  // Extract YouTube video ID when track changes
  useEffect(() => {
    if (track.platforms.youtube?.url) {
      const videoId = extractYoutubeId(track.platforms.youtube.url);
      setYoutubeVideoId(videoId);

      // Retrieve saved playback time
      if (videoId) {
        const savedTime = localStorage.getItem(`youtube-time-${videoId}`);
        if (savedTime) {
          setCurrentTime(parseFloat(savedTime));
        }
      }
    }
  }, [track, extractYoutubeId]);

  // Use refs to avoid stale closures in message handlers
  const isPlayingRef = useRef(isPlaying);
  const isActiveRef = useRef(isActive);
  const shouldActivateRef = useRef(shouldActivate);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
    isActiveRef.current = isActive;
    shouldActivateRef.current = shouldActivate;
  }, [isPlaying, isActive, shouldActivate]);

  // Handle YouTube messages (ready, state changes, etc.)
  useEffect(() => {
    const handleYouTubeMessage = (event: MessageEvent) => {
      if (event.origin !== 'https://www.youtube.com') return;

      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;

        // Handle "ready" event
        if (data.event === 'onReady') {
          setIsYoutubeLoaded(true);
          logger.debug(`[Card ${track.id}] YouTube player READY`);

          // If we should be playing and were not already, this is a good time to ensure volume
          if (isPlayingRef.current && isActiveRef.current && iframeRef.current) {
            const currentVolume = getInitialVolume();
            sendPlayerCommand(iframeRef.current, 'youtube', 'setVolume', currentVolume);
            // We rely on autoplay=1 for the initial play, but we can verify here if needed
          }
        }
      } catch (e) {
        // Ignore parsing errors
      }
    };

    window.addEventListener('message', handleYouTubeMessage);
    return () => window.removeEventListener('message', handleYouTubeMessage);
  }, [track.id, youtubeVideoId]);

  // Control YouTube player when active state changes
  useEffect(() => {
    if (!isActive || !shouldActivate) {
      if (isYoutubeVisible) setIsYoutubeVisible(false);
      return;
    }

    // When card becomes active
    if (isPlaying && youtubeVideoId) {
      setIsYoutubeVisible(true);

      // If already loaded, we can send commands directly
      if (isYoutubeLoaded && iframeRef.current) {
        sendPlayerCommand(iframeRef.current, 'youtube', 'play');
      }
    } else if (!isPlaying && iframeRef.current) {
      sendPlayerCommand(iframeRef.current, 'youtube', 'pause');
      setIsYoutubeVisible(true);
    } else if (youtubeVideoId) {
      setIsYoutubeVisible(true);
    }
  }, [isActive, isPlaying, youtubeVideoId, isYoutubeLoaded, shouldActivate]);

  // Determine if YouTube is active
  const isYoutubeActive = Boolean(
    shouldActivate &&
    isActive &&
    track.platforms.youtube &&
    youtubeVideoId &&
    (isYoutubeVisible || isYoutubeLoaded)
  );

  // Track and save playback position for YouTube videos
  useEffect(() => {
    if (isYoutubeActive && youtubeVideoId) {
      setIsYoutubeVisible(true);

      // Start tracking playback time
      if (timeIntervalRef.current) {
        clearInterval(timeIntervalRef.current);
      }

      // Check and save playback time every 5 seconds
      timeIntervalRef.current = setInterval(() => {
        try {
          if (iframeRef.current && iframeRef.current.contentWindow) {
            iframeRef.current.contentWindow.postMessage(
              JSON.stringify({ event: 'command', func: 'getCurrentTime' }),
              '*'
            );
          }
        } catch (e) {
          logger.error('Erreur lors de la récupération du temps:', e);
        }
      }, 5000);

      // Listen to YouTube player messages for current time
      const handleMessage = (event: MessageEvent) => {
        if (event.origin !== 'https://www.youtube.com') return;

        try {
          const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;

          // If we receive time data
          if (data && data.info && typeof data.info.currentTime === 'number') {
            setCurrentTime(data.info.currentTime);
            localStorage.setItem(
              `youtube-time-${youtubeVideoId}`,
              data.info.currentTime.toString()
            );
          }
        } catch (e) {
          // Ignore parsing errors for non-matching messages
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
  }, [isYoutubeActive, youtubeVideoId, track.id]);

  // Handle iframe load
  const handleIframeLoad = useCallback(() => {
    setIsYoutubeLoaded(true);
    logger.debug(`YouTube iframe loaded for ${track.title}, ID: ${iframeRef.current?.id}`);

    // Apply initial volume once API is loaded
    const currentVolume = getInitialVolume();
    applyVolumeToAllPlayers(currentVolume);
    logger.debug(`MusicCard: Applied initial volume ${currentVolume} globally after YouTube load`);
  }, [track.title]);

  // Pause and hide YouTube player
  const pauseAndHideYoutube = useCallback(() => {
    try {
      if (iframeRef.current && iframeRef.current.contentWindow) {
        sendPlayerCommand(iframeRef.current, 'youtube', 'pause');
      }
    } catch (e) {
      logger.error('Erreur lors de la mise en pause YouTube:', e);
    }
    setIsYoutubeVisible(false);
  }, []);

  // Resume YouTube playback
  const resumeYoutube = useCallback(() => {
    setIsYoutubeVisible(true);

    if (!isPlaying) {
      onPlay(track);
    }

    try {
      if (iframeRef.current && iframeRef.current.contentWindow) {
        setTimeout(() => {
          sendPlayerCommand(iframeRef.current, 'youtube', 'play');
        }, 100);
      }
    } catch (e) {
      logger.error('Erreur lors de la reprise YouTube:', e);
    }
  }, [isPlaying, onPlay, track]);

  // Close player
  const handleClosePlayer = useCallback(
    (e?: React.MouseEvent) => {
      if (e) {
        e.stopPropagation();
      }

      if (isYoutubeVisible) {
        try {
          if (iframeRef.current && iframeRef.current.contentWindow) {
            sendPlayerCommand(iframeRef.current, 'youtube', 'pause');
          }
        } catch (error) {
          logger.error('Erreur lors de la mise en pause YouTube:', error);
        }
      }

      setIsYoutubeVisible(false);

      if (isActive) {
        onPlay({ ...track, close: true } as TrackWithClose);
      }
    },
    [isYoutubeVisible, isActive, onPlay, track]
  );

  return {
    youtubeVideoId,
    currentTime,
    isYoutubeLoaded,
    isYoutubeVisible,
    isYoutubeActive,
    iframeRef,
    setIsYoutubeVisible,
    handleIframeLoad,
    pauseAndHideYoutube,
    resumeYoutube,
    handleClosePlayer,
  };
};
