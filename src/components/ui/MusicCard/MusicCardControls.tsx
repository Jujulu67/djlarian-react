import { motion } from 'framer-motion';
import { Play, Pause } from 'lucide-react';
import React from 'react';

import { useUiVersion } from '@/hooks/useUiVersion';
import { cn } from '@/lib/utils/cn';

interface MusicCardControlsProps {
  isActive: boolean;
  isPlaying: boolean;
  isPlayerVisible: boolean;
  onPlayClick: () => void;
  /** Titre du morceau, pour un libellé de bouton explicite (UI v2) */
  trackTitle?: string;
}

/**
 * Component to display play/pause button overlay
 */
export const MusicCardControls: React.FC<MusicCardControlsProps> = ({
  isActive,
  isPlaying,
  isPlayerVisible,
  onPlayClick,
  trackTitle,
}) => {
  const isV2 = useUiVersion() === 'v2';

  if (isPlayerVisible) {
    return null;
  }

  if (isV2) {
    const isCurrentlyPlaying = isActive && isPlaying;
    const label = isCurrentlyPlaying
      ? `Mettre en pause${trackTitle ? ` « ${trackTitle} »` : ''}`
      : `Écouter${trackTitle ? ` « ${trackTitle} »` : ''}`;

    // Vrai <button> : focusable, Entrée et Espace lancent la lecture nativement.
    // Visible en permanence au tactile, au survol / focus clavier sur desktop.
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onPlayClick();
        }}
        aria-label={label}
        aria-pressed={isCurrentlyPlaying}
        className={cn(
          'absolute bottom-3 right-3 z-10 flex h-12 w-12 items-center justify-center rounded-full',
          'bg-white text-zinc-950 shadow-[0_8px_24px_-8px_rgb(0_0_0/0.6)]',
          'transition-[opacity,translate,scale] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]',
          'hover:scale-105 active:scale-[0.95]',
          isCurrentlyPlaying
            ? 'opacity-100'
            : 'pointer-fine:translate-y-1 pointer-fine:opacity-0 pointer-fine:group-hover:translate-y-0 pointer-fine:group-hover:opacity-100 pointer-fine:focus-visible:translate-y-0 pointer-fine:focus-visible:opacity-100'
        )}
      >
        {isCurrentlyPlaying ? (
          <Pause className="h-5 w-5" fill="currentColor" strokeWidth={0} />
        ) : (
          <Play className="ml-0.5 h-5 w-5" fill="currentColor" strokeWidth={0} />
        )}
      </button>
    );
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
      } focus-visible:opacity-100 has-[:focus-visible]:opacity-100`}
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
        className="p-4 rounded-full focus:rounded-full active:rounded-full bg-purple-700/80 hover:bg-purple-600/90 flex items-center justify-center backdrop-blur-sm play-button focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
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
