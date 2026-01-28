'use client';

import { motion } from 'framer-motion';
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';

import { useAudioFrequencyCapture } from '@/hooks/useAudioFrequencyCapture';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useSoundCloudPlayer } from '@/hooks/useSoundCloudPlayer';
import { useYouTubePlayer } from '@/hooks/useYouTubePlayer';
import { logger } from '@/lib/logger';
import { sendPlayerCommand } from '@/lib/utils/audioUtils';
import { selectPreferredPlatform } from '@/lib/utils/platformSelector';
import { Track } from '@/lib/utils/types';

import { MusicCardBadges } from './MusicCard/MusicCardBadges';
import { MusicCardControls } from './MusicCard/MusicCardControls';
import { MusicCardImage } from './MusicCard/MusicCardImage';
import { MusicCardInfo } from './MusicCard/MusicCardInfo';
import { MusicCardPlatforms } from './MusicCard/MusicCardPlatforms';
import { MusicCardPlayer } from './MusicCard/MusicCardPlayer';
import { MusicCardVisualizer } from './MusicCard/MusicCardVisualizer';

interface MusicCardProps {
  track: Track;
  onPlay: (track: Track) => void;
  isPlaying: boolean;
  isActive: boolean;
  playerRef?: React.RefObject<HTMLIFrameElement | null>;
  priority?: boolean;
}

/**
 * MusicCard Component:
 * Displays individual track information and provides controls for playing the track.
 * Manages the embedded YouTube/SoundCloud iframe player lifecycle (loading, visibility, commands)
 * based on whether the card is the currently active track (`isActive`) and the global playback state (`isPlaying`).
 * It uses utility functions for sending commands and applying initial volume.
 */
const MusicCardComponent: React.FC<MusicCardProps> = ({
  track,
  onPlay,
  isPlaying,
  isActive,
  priority = false,
}) => {
  const [imageError, setImageError] = useState(false);
  const [localIsPlaying, setLocalIsPlaying] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  // Determine which platform to use based on priority (YouTube > SoundCloud) - memoized
  // Utiliser track comme dépendance pour correspondre à l'inférence du React Compiler
  const preferredPlatform = useMemo(() => selectPreferredPlatform(track), [track]);
  const shouldUseYouTube = preferredPlatform === 'youtube';
  const shouldUseSoundCloud = preferredPlatform === 'soundcloud';

  // Use YouTube player hook (only if YouTube is the preferred platform)
  const youtubePlayer = useYouTubePlayer({
    track,
    isActive,
    isPlaying,
    onPlay,
    shouldActivate: shouldUseYouTube,
  });

  // Use SoundCloud player hook (only if SoundCloud is the preferred platform)
  const soundcloudPlayer = useSoundCloudPlayer({
    track,
    isActive,
    isPlaying,
    onPlay,
    shouldActivate: shouldUseSoundCloud,
  });

  // Determine if any player is active
  const isPlayerActive = youtubePlayer.isYoutubeActive || soundcloudPlayer.isSoundcloudActive;
  const isPlayerVisible = youtubePlayer.isYoutubeVisible || soundcloudPlayer.isSoundcloudVisible;

  // Try to capture real audio frequencies
  const activeIframeRef = isPlayerVisible
    ? youtubePlayer.isYoutubeVisible
      ? youtubePlayer.iframeRef
      : soundcloudPlayer.soundcloudIframeRef
    : null;

  // Disable audio capture on mobile for performance
  const audioCapture = useAudioFrequencyCapture({
    iframeRef: activeIframeRef || { current: null },
    isPlaying: isPlaying && isActive && !isMobile,
    isVisible: isPlayerVisible && !isMobile,
  });

  // Synchronize local state with global state for non-active cards
  useEffect(() => {
    if (!isActive) {
      setLocalIsPlaying(false);
      youtubePlayer.setIsYoutubeVisible(false);
      soundcloudPlayer.setIsSoundcloudVisible(false);

      sendPlayerCommand(youtubePlayer.iframeRef.current, 'youtube', 'pause');
      sendPlayerCommand(soundcloudPlayer.soundcloudIframeRef.current, 'soundcloud', 'pause');
    } else {
      // When card becomes active, ensure visibility is set to true
      // Force visibility regardless of playing state to ensure card reopens
      if (shouldUseYouTube && youtubePlayer.youtubeVideoId) {
        youtubePlayer.setIsYoutubeVisible(true);
      }
      if (shouldUseSoundCloud && soundcloudPlayer.soundcloudUrl) {
        soundcloudPlayer.setIsSoundcloudVisible(true);
      }

      const syncTimeout = setTimeout(() => {
        setLocalIsPlaying(isPlaying);
      }, 50);

      return () => clearTimeout(syncTimeout);
    }
  }, [
    isActive,
    isPlaying,
    track.id,
    youtubePlayer,
    soundcloudPlayer,
    shouldUseYouTube,
    shouldUseSoundCloud,
  ]);

  // Force visibility when isPlaying changes from false to true (even if already active)
  useEffect(() => {
    if (isActive && isPlaying) {
      // Force visibility when playing starts, even if card was already active
      if (shouldUseYouTube && youtubePlayer.youtubeVideoId) {
        youtubePlayer.setIsYoutubeVisible(true);
      }
      if (shouldUseSoundCloud && soundcloudPlayer.soundcloudUrl) {
        soundcloudPlayer.setIsSoundcloudVisible(true);
      }
    }
  }, [isPlaying, isActive, shouldUseYouTube, shouldUseSoundCloud, youtubePlayer, soundcloudPlayer]);

  // Auto-scroll to card when activated (disabled on mobile for better UX)
  useEffect(() => {
    if (isActive && localIsPlaying && cardRef.current && !isMobile) {
      setTimeout(() => {
        cardRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      }, 100);
    }
  }, [isActive, localIsPlaying, track.id, isMobile]);

  // Handle play click
  const handlePlayClick = useCallback(() => {
    logger.debug(`[MusicCard ${track.id}] handlePlayClick called for track: ${track.title}`);
    logger.debug(
      `[MusicCard ${track.id}] Current state - isActive: ${isActive}, isPlaying: ${isPlaying}`
    );
    onPlay(track);
  }, [onPlay, track, isActive, isPlaying]);

  // Handle close player (combines both platforms)
  const handleClosePlayer = useCallback(
    (e?: React.MouseEvent) => {
      if (e) {
        e.stopPropagation();
      }

      youtubePlayer.handleClosePlayer(e);
      soundcloudPlayer.handleClosePlayer(e);
    },
    [youtubePlayer, soundcloudPlayer]
  );

  // Handle card click
  const handleCardClick = useCallback(
    (e: React.MouseEvent) => {
      const target = e.target as HTMLElement;

      // Always ignore clicks on actual buttons and links (not iframes)
      const isButtonOrLink = target.closest('button, a');
      if (isButtonOrLink) {
        logger.debug(`[MusicCard ${track.id}] Card click on button/link, ignoring`);
        return;
      }

      // For iframes: allow click if card is not active or if it's paused
      // This allows re-clicking on an old card to reactivate it
      const isIframe = target.closest('iframe');
      if (isIframe) {
        if (!isActive || !isPlaying) {
          logger.debug(
            `[MusicCard ${track.id}] Card click on iframe - card not active or paused, allowing play`
          );
          handlePlayClick();
        } else {
          logger.debug(
            `[MusicCard ${track.id}] Card click on iframe - card already active and playing, ignoring`
          );
        }
        return;
      }

      // For other clicks (on the card itself), always allow
      logger.debug(
        `[MusicCard ${track.id}] Card clicked - target: ${target.tagName}, calling handlePlayClick`
      );
      handlePlayClick();
    },
    [handlePlayClick, track.id, isActive, isPlaying]
  );

  return (
    <motion.div
      id={`music-card-${track.id}`}
      ref={cardRef}
      className={`group relative rounded-xl overflow-hidden transition-all duration-300 transform ${
        isPlayerActive ? '' : 'cursor-pointer'
      } ${
        isActive
          ? 'glass-modern border-purple-500/50 shadow-[0_0_30px_rgba(168,85,247,0.2)]'
          : 'glass-modern glass-modern-hover'
      } ${isPlayerActive ? 'col-span-1 md:col-span-2' : ''}`}
      whileHover={isPlayerActive ? {} : { scale: 1.02 }}
      onClick={handleCardClick}
    >
      {/* Display YouTube, SoundCloud or image - with fixed aspect ratio */}
      <div
        className="relative overflow-hidden"
        style={{
          aspectRatio: isPlayerActive ? '16/9' : '1/1',
        }}
      >
        {/* YouTube Player */}
        {track.platforms.youtube &&
          youtubePlayer.youtubeVideoId &&
          (youtubePlayer.isYoutubeVisible || youtubePlayer.isYoutubeLoaded) && (
            <MusicCardPlayer
              track={track}
              platform="youtube"
              videoId={youtubePlayer.youtubeVideoId}
              currentTime={youtubePlayer.currentTime}
              iframeRef={youtubePlayer.iframeRef}
              isVisible={youtubePlayer.isYoutubeVisible}
              isLoaded={youtubePlayer.isYoutubeLoaded}
              onLoad={youtubePlayer.handleIframeLoad}
              onClose={handleClosePlayer}
            />
          )}

        {/* SoundCloud Player */}
        {track.platforms.soundcloud &&
          soundcloudPlayer.soundcloudUrl &&
          (soundcloudPlayer.isSoundcloudVisible || soundcloudPlayer.isSoundcloudLoaded) && (
            <MusicCardPlayer
              track={track}
              platform="soundcloud"
              embedUrl={soundcloudPlayer.getSoundcloudEmbedUrl(soundcloudPlayer.soundcloudUrl)}
              iframeRef={soundcloudPlayer.soundcloudIframeRef}
              isVisible={soundcloudPlayer.isSoundcloudVisible}
              isLoaded={soundcloudPlayer.isSoundcloudLoaded}
              onLoad={soundcloudPlayer.handleSoundcloudIframeLoad}
              onClose={handleClosePlayer}
            />
          )}

        {/* Normal image - visible when no player is active */}
        {!isPlayerVisible && (
          <>
            <MusicCardImage
              track={track}
              imageError={imageError}
              onImageError={() => setImageError(true)}
              priority={priority}
            />
          </>
        )}

        {/* Dark overlay for better badge visibility - hidden when player is active */}
        {!isPlayerVisible && (
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent opacity-60 group-hover:opacity-70 transition-opacity"></div>
        )}

        {/* Track type and featured badges */}
        <MusicCardBadges track={track} isPlayerVisible={isPlayerVisible} />

        {/* Platform badges */}
        <MusicCardPlatforms track={track} isPlayerVisible={isPlayerVisible} />

        {/* Play overlay - shown on hover or when active but not playing YouTube/SoundCloud */}
        <MusicCardControls
          isActive={isActive}
          isPlaying={isPlaying}
          isPlayerVisible={isPlayerVisible}
          onPlayClick={handlePlayClick}
        />
      </div>

      {/* Audio Visualizer - Below player in purple section when player is active */}
      {/* Disabled on mobile for performance reasons */}
      {isPlayerVisible && !isMobile && (
        <div className="w-full bg-gradient-to-b from-purple-900/90 via-purple-800/80 to-purple-900/90 h-20 flex items-center">
          <MusicCardVisualizer
            isVisible={true}
            isPlaying={isPlaying && isActive}
            frequencyData={audioCapture.frequencyData}
            isRealAudio={audioCapture.isCapturing}
          />
        </div>
      )}

      {/* Track info - Hidden when player is active */}
      <MusicCardInfo track={track} isPlayerVisible={isPlayerVisible} />

      {/* Hover shine effect */}
      {!isPlayerVisible && (
        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/0 via-purple-500/5 to-purple-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
      )}
    </motion.div>
  );
};

// Memoize MusicCard to prevent unnecessary re-renders
// Only re-render if track.id, isPlaying, isActive, or priority changes
export const MusicCard = React.memo(MusicCardComponent, (prevProps, nextProps) => {
  return (
    prevProps.track.id === nextProps.track.id &&
    prevProps.isPlaying === nextProps.isPlaying &&
    prevProps.isActive === nextProps.isActive &&
    prevProps.priority === nextProps.priority &&
    prevProps.track.title === nextProps.track.title &&
    prevProps.track.artist === nextProps.track.artist &&
    prevProps.track.imageId === nextProps.track.imageId &&
    JSON.stringify(prevProps.track.platforms) === JSON.stringify(nextProps.track.platforms)
  );
});

MusicCard.displayName = 'MusicCard';

export default MusicCard;
