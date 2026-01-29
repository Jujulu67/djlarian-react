import { useState, useEffect, useRef, useCallback } from 'react';

import { logger } from '@/lib/logger';
import { sendPlayerCommand, getInitialVolume } from '@/lib/utils/audioUtils';
import { Track, TrackWithClose } from '@/lib/utils/types';

interface UseSoundCloudPlayerProps {
  track: Track;
  isActive: boolean;
  isPlaying: boolean;
  onPlay: (track: Track) => void;
  shouldActivate?: boolean;
}

interface UseSoundCloudPlayerReturn {
  soundcloudUrl: string | null;
  isSoundcloudLoaded: boolean;
  isSoundcloudVisible: boolean;
  isSoundcloudReady: boolean;
  isSoundcloudActive: boolean;
  soundcloudIframeRef: React.RefObject<HTMLIFrameElement | null>;
  setIsSoundcloudVisible: (visible: boolean) => void;
  handleSoundcloudIframeLoad: () => void;
  getSoundcloudEmbedUrl: (url: string) => string;
  pauseAndHideSoundcloud: () => void;
  resumeSoundcloud: () => void;
  handleClosePlayer: (e?: React.MouseEvent) => void;
}

/**
 * Hook to manage SoundCloud player functionality
 * Handles URL extraction, iframe lifecycle, play/pause commands, and ready state management
 */
export const useSoundCloudPlayer = ({
  track,
  isActive,
  isPlaying,
  onPlay,
  shouldActivate = true,
}: UseSoundCloudPlayerProps): UseSoundCloudPlayerReturn => {
  const [soundcloudUrl, setSoundcloudUrl] = useState<string | null>(null);
  const [isSoundcloudLoaded, setIsSoundcloudLoaded] = useState(false);
  const [isSoundcloudVisible, setIsSoundcloudVisible] = useState(false);
  const [isSoundcloudReady, setIsSoundcloudReady] = useState(false);
  const [playWhenReady, setPlayWhenReady] = useState(false);
  const soundcloudIframeRef = useRef<HTMLIFrameElement | null>(null);
  const initialCommandsSentRef = useRef(false);

  // Synchronous state adjustment during render to preserve User Gesture on Mobile Safari
  const [prevIsActive, setPrevIsActive] = useState(isActive);
  const [prevIsPlaying, setPrevIsPlaying] = useState(isPlaying);

  if (isActive !== prevIsActive || isPlaying !== prevIsPlaying) {
    if (isActive && isPlaying && shouldActivate && !isSoundcloudVisible) {
      logger.remote(`[SC-SYNC] Synchronously setting visibility to true for ${track.id}`);
      setIsSoundcloudVisible(true);
    }
    setPrevIsActive(isActive);
    setPrevIsPlaying(isPlaying);
  }

  // Extract SoundCloud URL when track changes
  useEffect(() => {
    if (track.platforms.soundcloud?.url) {
      setSoundcloudUrl(track.platforms.soundcloud.url);
      initialCommandsSentRef.current = false;
      setIsSoundcloudReady(false); // Reset ready state for new src
      setIsSoundcloudLoaded(false); // Reset loaded state
    }
  }, [track.id, track.platforms.soundcloud?.url]);

  // Main effect to control SoundCloud player state and lifecycle
  useEffect(() => {
    // 1. Handle Inactivity
    if (!isActive || !shouldActivate) {
      if (isSoundcloudVisible) {
        setIsSoundcloudVisible(false);
        logger.remote(`[SC] Hiding player for track ${track.id} (inactive)`);
      }
      setPlayWhenReady(false);
      initialCommandsSentRef.current = false; // Reset for next time
      return;
    }

    // 2. Handle Playback Visibility
    if (isPlaying && soundcloudUrl) {
      setIsSoundcloudVisible(true);
    } else if (soundcloudUrl) {
      setIsSoundcloudVisible(true);
    }

    // 3. Handle PAUSE command
    if (!isPlaying && isSoundcloudReady && soundcloudIframeRef.current) {
      sendPlayerCommand(soundcloudIframeRef.current, 'soundcloud', 'pause');
      setPlayWhenReady(false);
      return;
    }

    // 4. Handle PLAY initialization (Volume + Play)
    if (
      isPlaying &&
      isSoundcloudReady &&
      playWhenReady &&
      soundcloudIframeRef.current &&
      !initialCommandsSentRef.current
    ) {
      initialCommandsSentRef.current = true;
      const currentVolume = getInitialVolume();

      logger.remote(
        `[SC] Main Effect: Sending Volume and starting delayed Play timer for ${track.id}`
      );

      // Send volume immediately
      sendPlayerCommand(soundcloudIframeRef.current, 'soundcloud', 'setVolume', currentVolume);

      // Send play after a short delay
      // Note: with auto_play=true in the URL, this might be redundant but acts as a fallback
      const playTimer = setTimeout(() => {
        if (soundcloudIframeRef.current && isPlaying && isActive) {
          logger.remote(`[SC] Executing Play command (fallback) for ${track.id}`);
          sendPlayerCommand(soundcloudIframeRef.current, 'soundcloud', 'play');
        }
      }, 200);

      setPlayWhenReady(false);
      return () => clearTimeout(playTimer);
    }

    // 5. If not ready yet but should be playing, queue it
    if (isPlaying && !isSoundcloudReady && !playWhenReady) {
      logger.remote(`[SC] Active & Playing, but not ready. Queuing playWhenReady.`);
      setPlayWhenReady(true);
    }
  }, [
    isActive,
    isPlaying,
    soundcloudUrl,
    isSoundcloudReady,
    track.id,
    shouldActivate,
    playWhenReady,
  ]);

  // Determine if SoundCloud is active
  const isSoundcloudActive = Boolean(
    shouldActivate &&
    isActive &&
    track.platforms.soundcloud &&
    soundcloudUrl &&
    (isSoundcloudVisible || isSoundcloudLoaded)
  );

  // Use refs to avoid stale closures in message handlers
  const isPlayingRef = useRef(isPlaying);
  const isActiveRef = useRef(isActive);
  const shouldActivateRef = useRef(shouldActivate);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
    isActiveRef.current = isActive;
    shouldActivateRef.current = shouldActivate;
  }, [isPlaying, isActive, shouldActivate]);

  // Handle SoundCloud messages
  useEffect(() => {
    const handleSoundcloudMessage = (event: MessageEvent) => {
      // Direct access check for faster filtering
      if (
        !soundcloudIframeRef.current ||
        event.source !== soundcloudIframeRef.current.contentWindow
      ) {
        return;
      }

      // Ignore non-string data or very large payloads to save CPU
      if (typeof event.data !== 'string' || event.data.length > 2000) {
        return;
      }

      try {
        const data = JSON.parse(event.data);

        // Track and log all important state changes from the widget
        if (data.method === 'ready') {
          logger.remote(`[SC] Widget READY event received for card ${track.id}`);
          setIsSoundcloudReady(true);
        } else if (data.method === 'play') {
          logger.remote(`[SC] Widget Status: PLAYING for card ${track.id}`);
        } else if (data.method === 'pause') {
          logger.remote(`[SC] Widget Status: PAUSED for card ${track.id}`);
        } else if (data.method === 'finish') {
          logger.remote(`[SC] Widget Status: FINISHED for card ${track.id}`);
        } else if (data.method === 'error') {
          logger.remote(`[SC] Widget ERROR for card ${track.id}:`, data.value);
        }
      } catch (e) {
        if (!event.data.includes('__sc_') && !event.data.includes('playProgress')) {
          console.warn(`[SC-IFRAME] Error parsing message for card ${track.id}:`, e);
        }
      }
    };

    window.addEventListener('message', handleSoundcloudMessage);

    return () => {
      window.removeEventListener('message', handleSoundcloudMessage);
    };
  }, [track.id, soundcloudUrl]); // Re-bind if track or URL changes

  // Handle iframe load
  const handleSoundcloudIframeLoad = useCallback(() => {
    logger.remote(`[SC] IFRAME LOADED for ${track.id}`);
    setIsSoundcloudLoaded(true);
  }, [track.id]);

  // Get SoundCloud embed URL
  const getSoundcloudEmbedUrl = useCallback((url: string) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    return `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&color=%235500ff&auto_play=true&hide_related=false&show_comments=true&show_user=true&show_reposts=false&show_teaser=true&visual=true&buying=false&sharing=false&download=false&single_active=true&callback=true&allow_api=true&origin=${encodeURIComponent(origin)}`;
  }, []);

  // Pause and hide SoundCloud player
  const pauseAndHideSoundcloud = useCallback(() => {
    try {
      if (soundcloudIframeRef.current && soundcloudIframeRef.current.contentWindow) {
        sendPlayerCommand(soundcloudIframeRef.current, 'soundcloud', 'pause');
      }
    } catch (e) {
      logger.error('Erreur lors de la mise en pause SoundCloud:', e);
    }
    setPlayWhenReady(false);
  }, []);

  // Resume SoundCloud playback
  const resumeSoundcloud = useCallback(() => {
    setIsSoundcloudVisible(true);

    if (!isPlaying) {
      onPlay(track);
    }

    try {
      if (soundcloudIframeRef.current && soundcloudIframeRef.current.contentWindow) {
        setTimeout(() => {
          sendPlayerCommand(soundcloudIframeRef.current, 'soundcloud', 'play');
        }, 100);
      }
    } catch (e) {
      logger.error('Erreur lors de la reprise SoundCloud:', e);
    }
  }, [isPlaying, onPlay, track]);

  // Close player
  const handleClosePlayer = useCallback(
    (e?: React.MouseEvent) => {
      if (e) {
        e.stopPropagation();
      }

      if (isSoundcloudVisible) {
        try {
          if (soundcloudIframeRef.current && soundcloudIframeRef.current.contentWindow) {
            sendPlayerCommand(soundcloudIframeRef.current, 'soundcloud', 'pause');
          }
        } catch (error) {
          logger.error('Erreur lors de la mise en pause SoundCloud:', error);
        }
      }

      setIsSoundcloudVisible(false);
      setPlayWhenReady(false);

      if (isActive) {
        onPlay({ ...track, close: true } as TrackWithClose);
      }
    },
    [isSoundcloudVisible, isActive, onPlay, track]
  );

  return {
    soundcloudUrl,
    isSoundcloudLoaded,
    isSoundcloudVisible,
    isSoundcloudReady,
    isSoundcloudActive,
    soundcloudIframeRef,
    setIsSoundcloudVisible,
    handleSoundcloudIframeLoad,
    getSoundcloudEmbedUrl,
    pauseAndHideSoundcloud,
    resumeSoundcloud,
    handleClosePlayer,
  };
};
