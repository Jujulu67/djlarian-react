'use client';

import { motion } from 'framer-motion';
import React, { useState, useEffect, useRef, useCallback } from 'react';

import { useAudioFrequencyCapture } from '@/hooks/useAudioFrequencyCapture';
import { useSoundCloudPlayer } from '@/hooks/useSoundCloudPlayer';
import { useYouTubePlayer } from '@/hooks/useYouTubePlayer';
import { logger } from '@/lib/logger';
import { sendPlayerCommand } from '@/lib/utils/audioUtils';
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
  playerRef?: React.MutableRefObject<HTMLIFrameElement | null>;
}

/**
 * MusicCard Component:
 * Displays individual track information and provides controls for playing the track.
 * Manages the embedded YouTube/SoundCloud iframe player lifecycle (loading, visibility, commands)
 * based on whether the card is the currently active track (`isActive`) and the global playback state (`isPlaying`).
 * It uses utility functions for sending commands and applying initial volume.
 */
export const MusicCard: React.FC<MusicCardProps> = ({ track, onPlay, isPlaying, isActive }) => {
  const [imageError, setImageError] = useState(false);
  const [localIsPlaying, setLocalIsPlaying] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // Use YouTube player hook
  const youtubePlayer = useYouTubePlayer({
    track,
    isActive,
    isPlaying,
    onPlay,
  });

  // Use SoundCloud player hook
  const soundcloudPlayer = useSoundCloudPlayer({
    track,
    isActive,
    isPlaying,
    onPlay,
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

  const audioCapture = useAudioFrequencyCapture({
    iframeRef: activeIframeRef || { current: null },
    isPlaying: isPlaying && isActive,
    isVisible: isPlayerVisible,
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
      const syncTimeout = setTimeout(() => {
        logger.debug(
          `MusicCard: synchronisation de l'état local pour track ${track.id} - isPlaying=${isPlaying}`
        );
        setLocalIsPlaying(isPlaying);
      }, 50);

      return () => clearTimeout(syncTimeout);
    }
  }, [isActive, isPlaying, track.id, youtubePlayer, soundcloudPlayer]);

  // Auto-scroll to card when activated
  useEffect(() => {
    if (isActive && localIsPlaying && cardRef.current) {
      setTimeout(() => {
        cardRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      }, 100);
    }
  }, [isActive, localIsPlaying, track.id]);

  // Handle play click
  const handlePlayClick = useCallback(() => {
    onPlay(track);
  }, [onPlay, track]);

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
      if (!(e.target as HTMLElement).closest('button, a, iframe')) {
        handlePlayClick();
      }
    },
    [handlePlayClick]
  );

  return (
    <motion.div
      id={`music-card-${track.id}`}
      ref={cardRef}
      className={`group relative rounded-xl overflow-hidden border transition-all duration-300 transform ${
        isPlayerActive ? '' : 'cursor-pointer hover:-translate-y-1'
      } ${
        isActive
          ? 'border-purple-500/70 shadow-lg shadow-purple-500/20 bg-purple-900/30'
          : 'border-gray-700/50 bg-gray-800/30 hover:border-purple-500/50 hover:shadow-lg hover:shadow-purple-500/10'
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
      {isPlayerVisible && (
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

export default MusicCard;
