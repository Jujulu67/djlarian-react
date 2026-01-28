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

  // Extract SoundCloud URL when track changes
  useEffect(() => {
    if (track.platforms.soundcloud?.url) {
      setSoundcloudUrl(track.platforms.soundcloud.url);
    }
  }, [track]);

  // Control SoundCloud player when active state changes
  useEffect(() => {
    if (!isActive || !shouldActivate) {
      // When card becomes inactive, hide the player
      setIsSoundcloudVisible(false);
      setPlayWhenReady(false);
      return;
    }

    // When card becomes active, ensure visibility is set
    if (isPlaying && soundcloudUrl) {
      setIsSoundcloudVisible(true);
      logger.debug(
        `[Card ${track.id}] SoundCloud selected. isReady=${isSoundcloudReady}, iframeRef=${!!soundcloudIframeRef.current}`
      );
      // If already ready, play immediately. Otherwise, set flag.
      if (isSoundcloudReady && soundcloudIframeRef.current) {
        logger.debug(`[Card ${track.id}] SoundCloud already ready. Applying volume and playing.`);
        const currentVolume = getInitialVolume();
        logger.debug(`[Card ${track.id}] Applying volume ${currentVolume} before playing.`);
        sendPlayerCommand(soundcloudIframeRef.current, 'soundcloud', 'setVolume', currentVolume);
        sendPlayerCommand(soundcloudIframeRef.current, 'soundcloud', 'play');
        setPlayWhenReady(false);
      } else {
        logger.debug(`[Card ${track.id}] SoundCloud not ready. Setting playWhenReady flag.`);
        setPlayWhenReady(true);
      }
    } else if (!isPlaying && soundcloudIframeRef.current) {
      sendPlayerCommand(soundcloudIframeRef.current, 'soundcloud', 'pause');
      setIsSoundcloudVisible(true);
      setPlayWhenReady(false);
    } else if (soundcloudUrl) {
      // If active but not playing yet, still show the player
      setIsSoundcloudVisible(true);
    }
  }, [
    isActive,
    isPlaying,
    soundcloudUrl,
    isSoundcloudReady,
    track.id,
    track.platforms.soundcloud,
    shouldActivate,
  ]);

  // Effect to play SoundCloud when it becomes ready AND play is intended
  useEffect(() => {
    if (
      playWhenReady &&
      isSoundcloudReady &&
      isActive &&
      isPlaying &&
      shouldActivate &&
      track.platforms.soundcloud &&
      soundcloudIframeRef.current
    ) {
      logger.debug(
        `[Card ${track.id}] useEffect[playWhenReady, isReady]: Triggered. playWhenReady=${playWhenReady}, isReady=${isSoundcloudReady}, isActive=${isActive}, isPlaying=${isPlaying}`
      );
      const currentVolume = getInitialVolume();
      logger.debug(`[Card ${track.id}] Applying volume ${currentVolume} then playing.`);
      sendPlayerCommand(soundcloudIframeRef.current, 'soundcloud', 'setVolume', currentVolume);
      sendPlayerCommand(soundcloudIframeRef.current, 'soundcloud', 'play');
      setPlayWhenReady(false);
    }
  }, [
    playWhenReady,
    isSoundcloudReady,
    isActive,
    isPlaying,
    shouldActivate,
    track.platforms.soundcloud,
    track.id,
  ]);

  // Determine if SoundCloud is active
  const isSoundcloudActive = Boolean(
    shouldActivate &&
    isActive &&
    track.platforms.soundcloud &&
    soundcloudUrl &&
    (isSoundcloudVisible || isSoundcloudLoaded)
  );

  // Handle SoundCloud messages
  useEffect(() => {
    const handleSoundcloudMessage = (event: MessageEvent) => {
      if (
        !soundcloudIframeRef.current ||
        event.source !== soundcloudIframeRef.current.contentWindow
      ) {
        return;
      }

      try {
        const data = JSON.parse(event.data);
        logger.debug(
          `[Card ${track.id}] SoundCloud event received from OWN iframe: ${JSON.stringify(data)}`
        );

        if (data.method === 'ready') {
          logger.debug(
            `[Card ${track.id}] SoundCloud iframe READY event received. Setting isSoundcloudReady to true.`
          );
          setIsSoundcloudReady(true);

          // If we're supposed to play and the iframe just became ready, play immediately
          if (isActive && isPlaying && shouldActivate && soundcloudIframeRef.current) {
            logger.debug(`[Card ${track.id}] Iframe ready while playing. Playing immediately.`);
            const currentVolume = getInitialVolume();
            sendPlayerCommand(
              soundcloudIframeRef.current,
              'soundcloud',
              'setVolume',
              currentVolume
            );
            sendPlayerCommand(soundcloudIframeRef.current, 'soundcloud', 'play');
            setPlayWhenReady(false);
          }
        }
      } catch (e) {
        logger.error(`[Card ${track.id}] Error parsing SoundCloud message:`, e, event.data);
      }
    };

    window.addEventListener('message', handleSoundcloudMessage);

    return () => {
      window.removeEventListener('message', handleSoundcloudMessage);
      setIsSoundcloudReady(false);
      setPlayWhenReady(false);
    };
  }, [isActive, isPlaying, shouldActivate, track.id]);

  // Handle iframe load
  const handleSoundcloudIframeLoad = useCallback(() => {
    logger.debug(
      `SoundCloud iframe loaded for ${track.title}, ID: ${soundcloudIframeRef.current?.id}`
    );
    setIsSoundcloudLoaded(true);

    // If we're supposed to play and the iframe just loaded, try to play after a short delay
    // This helps with cases where the iframe loads but the ready event hasn't fired yet
    if (isActive && isPlaying && shouldActivate && playWhenReady && soundcloudIframeRef.current) {
      logger.debug(
        `[Card ${track.id}] Iframe loaded while playWhenReady is true. Will attempt to play after delay.`
      );
      // Give the iframe a moment to fully initialize, then try to play
      setTimeout(() => {
        if (soundcloudIframeRef.current && isActive && isPlaying) {
          const currentVolume = getInitialVolume();
          logger.debug(`[Card ${track.id}] Attempting to play after iframe load delay.`);
          sendPlayerCommand(soundcloudIframeRef.current, 'soundcloud', 'setVolume', currentVolume);
          sendPlayerCommand(soundcloudIframeRef.current, 'soundcloud', 'play');
        }
      }, 300); // 300ms delay to allow iframe to fully initialize
    }
  }, [track.title, isActive, isPlaying, shouldActivate, playWhenReady, track.id]);

  // Get SoundCloud embed URL
  const getSoundcloudEmbedUrl = useCallback((url: string) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    return `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&color=%23ff5500&auto_play=false&hide_related=true&show_comments=false&show_user=true&show_reposts=false&show_teaser=false&visual=true&buying=false&sharing=false&download=false&single_active=false&callback=true&allow_api=true&origin=${encodeURIComponent(origin)}`;
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
