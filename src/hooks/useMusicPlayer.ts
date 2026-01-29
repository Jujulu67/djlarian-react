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

        // Commands are now handled by the specific player hooks
        return;
      }

      // New track - switch to it
      if (isProcessingRef.current) {
        console.warn(`[PLAYER] Play blocked: processing in progress for track ${track.id}`);
        return;
      }

      console.warn(
        `[PLAYER] Switching to new track: ${track.title} (ID: ${track.id}) - SYNC update`
      );
      logger.remote(`-------------------------------------------`);
      logger.remote(`[PLAYER] SWITCH-TRACK: ${track.title} (${track.id})`);

      // Stop previous track
      if (currentTrack) {
        stopCurrentPlayer(currentTrack.id);
      }

      // Set new track immediately to preserve user gesture for iframe rendering
      const newIndex = filteredTracks.findIndex((t) => t.id === track.id);
      setCurrentTrack(track);
      setIsPlaying(true);
      setActiveIndex(newIndex >= 0 ? newIndex : null);
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
    if (currentIndex === -1 || currentIndex >= filteredTracks.length - 1) {
      console.warn('[PLAYER] Last track reached');
      return;
    }

    const nextTrack = filteredTracks[currentIndex + 1];
    logger.remote(`[PLAYER] NEXT-TRACK: ${nextTrack.title} (${nextTrack.id})`);

    if (currentTrack) {
      stopCurrentPlayer(currentTrack.id);
    }
    setCurrentTrack(nextTrack);
    setActiveIndex(currentIndex + 1);
    setIsPlaying(true);
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
    if (currentIndex <= 0) {
      console.warn('[PLAYER] First track reached');
      return;
    }

    const prevTrack = filteredTracks[currentIndex - 1];
    logger.remote(`[PLAYER] PREV-TRACK: ${prevTrack.title} (${prevTrack.id})`);

    if (currentTrack) {
      stopCurrentPlayer(currentTrack.id);
    }
    setCurrentTrack(prevTrack);
    setActiveIndex(currentIndex - 1);
    setIsPlaying(true);
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
        // Prevent infinite loop if track is already loaded
        if (currentTrack?.id === trackToPlay.id) return;

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
  }, [filteredTracks, playTrack, currentTrack]);

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
