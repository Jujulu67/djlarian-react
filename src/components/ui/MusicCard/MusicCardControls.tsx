import { motion } from 'framer-motion';
import { Play, Pause } from 'lucide-react';
import React from 'react';

interface MusicCardControlsProps {
  isActive: boolean;
  isPlaying: boolean;
  isPlayerVisible: boolean;
  onPlayClick: () => void;
}

/**
 * Component to display play/pause button overlay
 */
export const MusicCardControls: React.FC<MusicCardControlsProps> = ({
  isActive,
  isPlaying,
  isPlayerVisible,
  onPlayClick,
}) => {
  if (isPlayerVisible) {
    return null;
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      e.stopPropagation();
      onPlayClick();
    }
  };

  return (
    <div
      className={`absolute inset-0 flex items-center justify-center bg-black/40 transition-opacity music-card-overlay ${
        isActive && isPlaying ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
      }`}
      onClick={(e) => {
        e.stopPropagation();
        onPlayClick();
      }}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-label={isPlaying && isActive ? 'Pause la lecture' : 'Démarrer la lecture'}
    >
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        className="p-4 rounded-full bg-purple-700/80 hover:bg-purple-600/90 flex items-center justify-center backdrop-blur-sm play-button focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
        onClick={(e) => {
          e.stopPropagation();
          onPlayClick();
        }}
        onKeyDown={handleKeyDown}
        aria-label={isPlaying && isActive ? 'Pause la lecture' : 'Démarrer la lecture'}
      >
        {isActive && isPlaying ? (
          <Pause className="h-12 w-12 text-white drop-shadow-lg" />
        ) : (
          <Play className="h-12 w-12 text-white drop-shadow-lg ml-1" />
        )}
      </motion.button>
    </div>
  );
};
