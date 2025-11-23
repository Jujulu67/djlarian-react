import { useCallback, useEffect, useRef, useState } from 'react';

import { logger } from '@/lib/logger';
import { sendPlayerCommand } from '@/lib/utils/audioUtils';
import { Track, TrackAction } from '@/lib/utils/types';

interface UseMusicPlayerParams {
  filteredTracks: Track[];
}

interface UseMusicPlayerReturn {
  currentTrack: Track | null;
  isPlaying: boolean;
  activeIndex: number | null;
  playTrack: (track: TrackAction) => void;
  closePlayer: () => void;
  playNextTrack: () => void;
  playPrevTrack: () => void;
  togglePlay: () => void;
}

/**
 * Hook to manage music player state and playback control
 * Handles track selection, play/pause, and navigation between tracks
 */
export function useMusicPlayer({ filteredTracks }: UseMusicPlayerParams): UseMusicPlayerReturn {
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const isProcessingRef = useRef(false);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Stop current player
  const stopCurrentPlayer = useCallback((trackId: string) => {
    const youtubeIframe = document.querySelector<HTMLIFrameElement>(
      `iframe[id="youtube-iframe-${trackId}"]`
    );
    const soundcloudIframe = document.querySelector<HTMLIFrameElement>(
      `iframe[id="soundcloud-iframe-${trackId}"]`
    );

    if (youtubeIframe) {
      sendPlayerCommand(youtubeIframe, 'youtube', 'pause');
    }
    if (soundcloudIframe) {
      sendPlayerCommand(soundcloudIframe, 'soundcloud', 'pause');
    }
  }, []);

  // Close player
  const closePlayer = useCallback(() => {
    if (isProcessingRef.current) {
      logger.debug('Close blocked: processing in progress');
      return;
    }

    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    debounceTimeoutRef.current = setTimeout(() => {
      if (currentTrack) {
        stopCurrentPlayer(currentTrack.id);
      }
      setCurrentTrack(null);
      setIsPlaying(false);
      setActiveIndex(null);
      logger.debug('Player closed, states reset');
    }, 100);
  }, [currentTrack, stopCurrentPlayer]);

  // Play track
  const playTrack = useCallback(
    (track: TrackAction) => {
      logger.debug(`[playTrack] Start - Track: ${track.title} (ID: ${track.id})`);

      // Handle close request
      if ('close' in track && track.close) {
        logger.debug(`[playTrack] Close requested for track ${track.id}`);
        closePlayer();
        return;
      }

      // If same track, toggle play/pause
      if (currentTrack && currentTrack.id === track.id) {
        logger.debug(`[playTrack] Same track - toggle play/pause`);
        const willPlay = !isPlaying;
        setIsPlaying(willPlay);

        // Force play command if switching to play
        if (willPlay) {
          if (debounceTimeoutRef.current) {
            clearTimeout(debounceTimeoutRef.current);
          }
          debounceTimeoutRef.current = setTimeout(() => {
            const youtubeIframe = document.querySelector<HTMLIFrameElement>(
              `iframe[id="youtube-iframe-${track.id}"]`
            );
            const soundcloudIframe = document.querySelector<HTMLIFrameElement>(
              `iframe[id="soundcloud-iframe-${track.id}"]`
            );

            if (youtubeIframe) {
              sendPlayerCommand(youtubeIframe, 'youtube', 'play');
            }
            if (soundcloudIframe) {
              sendPlayerCommand(soundcloudIframe, 'soundcloud', 'play');
            }
          }, 100);
        }
        return;
      }

      // New track - switch to it
      if (isProcessingRef.current) {
        logger.debug(`[playTrack] Play blocked: processing in progress for track ${track.id}`);
        return;
      }

      isProcessingRef.current = true;
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      debounceTimeoutRef.current = setTimeout(() => {
        logger.debug(`[playTrack] Switching to new track: ${track.title} (ID: ${track.id})`);

        // Stop previous track
        if (currentTrack) {
          logger.debug(`[playTrack] Stopping previous track: ${currentTrack.title}`);
          stopCurrentPlayer(currentTrack.id);
        }

        // Set new track
        const newIndex = filteredTracks.findIndex((t) => t.id === track.id);
        logger.debug(`[playTrack] New track index: ${newIndex}`);
        setCurrentTrack(track);
        setIsPlaying(true);
        setActiveIndex(newIndex >= 0 ? newIndex : null);

        isProcessingRef.current = false;

        // Force play command after a delay to ensure iframe is ready
        // Longer delay on mobile for better reliability
        const delay = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ? 300 : 200;
        setTimeout(() => {
          const youtubeIframe = document.querySelector<HTMLIFrameElement>(
            `iframe[id="youtube-iframe-${track.id}"]`
          );
          const soundcloudIframe = document.querySelector<HTMLIFrameElement>(
            `iframe[id="soundcloud-iframe-${track.id}"]`
          );

          logger.debug(
            `[playTrack] Sending play command - YouTube: ${!!youtubeIframe}, SoundCloud: ${!!soundcloudIframe}`
          );

          if (youtubeIframe) {
            sendPlayerCommand(youtubeIframe, 'youtube', 'play');
          }
          if (soundcloudIframe) {
            sendPlayerCommand(soundcloudIframe, 'soundcloud', 'play');
          }
        }, delay);

        logger.debug(`[playTrack] Track ${track.title} activated`);
      }, 150);
    },
    [currentTrack, isPlaying, filteredTracks, closePlayer, stopCurrentPlayer]
  );

  // Toggle play/pause
  const togglePlay = useCallback(() => {
    if (!currentTrack) return;
    setIsPlaying((prev) => !prev);
  }, [currentTrack]);

  // Play next track
  const playNextTrack = useCallback(() => {
    logger.debug(
      `[playNextTrack] Called - currentTrack: ${currentTrack?.title || 'null'}, isProcessing: ${isProcessingRef.current}`
    );

    if (isProcessingRef.current || !currentTrack) {
      logger.debug(
        `[playNextTrack] Blocked - isProcessing: ${isProcessingRef.current}, currentTrack: ${!!currentTrack}`
      );
      return;
    }

    const currentIndex = filteredTracks.findIndex((t) => t.id === currentTrack.id);
    logger.debug(
      `[playNextTrack] Current index: ${currentIndex}, total tracks: ${filteredTracks.length}`
    );

    if (currentIndex === -1 || currentIndex >= filteredTracks.length - 1) {
      logger.debug('Last track reached or invalid index');
      return;
    }

    isProcessingRef.current = true;
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    debounceTimeoutRef.current = setTimeout(() => {
      const nextTrack = filteredTracks[currentIndex + 1];
      logger.debug(`[playNextTrack] Switching to: ${nextTrack.title} (ID: ${nextTrack.id})`);

      if (currentTrack) {
        stopCurrentPlayer(currentTrack.id);
      }
      setCurrentTrack(nextTrack);
      setActiveIndex(currentIndex + 1);
      setIsPlaying(true);
      isProcessingRef.current = false;

      // Force play command after a delay to ensure iframe is ready
      // Longer delay on mobile for better reliability
      const delay = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ? 300 : 200;
      setTimeout(() => {
        const youtubeIframe = document.querySelector<HTMLIFrameElement>(
          `iframe[id="youtube-iframe-${nextTrack.id}"]`
        );
        const soundcloudIframe = document.querySelector<HTMLIFrameElement>(
          `iframe[id="soundcloud-iframe-${nextTrack.id}"]`
        );

        logger.debug(
          `[playNextTrack] Sending play command - YouTube: ${!!youtubeIframe}, SoundCloud: ${!!soundcloudIframe}`
        );

        if (youtubeIframe) {
          sendPlayerCommand(youtubeIframe, 'youtube', 'play');
        }
        if (soundcloudIframe) {
          sendPlayerCommand(soundcloudIframe, 'soundcloud', 'play');
        }
      }, delay);

      logger.debug(`Switched to next track: ${nextTrack.title}`);
    }, 150);
  }, [currentTrack, filteredTracks, stopCurrentPlayer]);

  // Play previous track
  const playPrevTrack = useCallback(() => {
    logger.debug(
      `[playPrevTrack] Called - currentTrack: ${currentTrack?.title || 'null'}, isProcessing: ${isProcessingRef.current}`
    );

    if (isProcessingRef.current || !currentTrack) {
      logger.debug(
        `[playPrevTrack] Blocked - isProcessing: ${isProcessingRef.current}, currentTrack: ${!!currentTrack}`
      );
      return;
    }

    const currentIndex = filteredTracks.findIndex((t) => t.id === currentTrack.id);
    logger.debug(
      `[playPrevTrack] Current index: ${currentIndex}, total tracks: ${filteredTracks.length}`
    );

    if (currentIndex <= 0) {
      logger.debug('First track reached or invalid index');
      return;
    }

    isProcessingRef.current = true;
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    debounceTimeoutRef.current = setTimeout(() => {
      const prevTrack = filteredTracks[currentIndex - 1];
      logger.debug(`[playPrevTrack] Switching to: ${prevTrack.title} (ID: ${prevTrack.id})`);

      if (currentTrack) {
        stopCurrentPlayer(currentTrack.id);
      }
      setCurrentTrack(prevTrack);
      setActiveIndex(currentIndex - 1);
      setIsPlaying(true);
      isProcessingRef.current = false;

      // Force play command after a delay to ensure iframe is ready
      // Longer delay on mobile for better reliability
      const delay = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ? 300 : 200;
      setTimeout(() => {
        const youtubeIframe = document.querySelector<HTMLIFrameElement>(
          `iframe[id="youtube-iframe-${prevTrack.id}"]`
        );
        const soundcloudIframe = document.querySelector<HTMLIFrameElement>(
          `iframe[id="soundcloud-iframe-${prevTrack.id}"]`
        );

        logger.debug(
          `[playPrevTrack] Sending play command - YouTube: ${!!youtubeIframe}, SoundCloud: ${!!soundcloudIframe}`
        );

        if (youtubeIframe) {
          sendPlayerCommand(youtubeIframe, 'youtube', 'play');
        }
        if (soundcloudIframe) {
          sendPlayerCommand(soundcloudIframe, 'soundcloud', 'play');
        }
      }, delay);

      logger.debug(`Switched to previous track: ${prevTrack.title}`);
    }, 150);
  }, [currentTrack, filteredTracks, stopCurrentPlayer]);

  // Handle URL play parameter
  useEffect(() => {
    if (filteredTracks.length === 0) return;

    const params = new URLSearchParams(window.location.search);
    const trackIdToPlay = params.get('play');

    if (trackIdToPlay) {
      const trackToPlay = filteredTracks.find(
        (track) => track.id === trackIdToPlay || track.trackId === trackIdToPlay
      );

      if (trackToPlay) {
        logger.debug(`Auto-playing track from URL: ${trackToPlay.title}`);
        playTrack(trackToPlay);

        // Clean URL
        if (window.history && window.history.replaceState) {
          const url = new URL(window.location.href);
          url.searchParams.delete('play');
          window.history.replaceState({}, document.title, url.toString());
        }
      }
    }
  }, [filteredTracks, playTrack]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  return {
    currentTrack,
    isPlaying,
    activeIndex,
    playTrack,
    closePlayer,
    playNextTrack,
    playPrevTrack,
    togglePlay,
  };
}
