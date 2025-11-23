'use client';

import React, { createContext, useContext, ReactNode } from 'react';

import { Track, TrackAction } from '@/lib/utils/types';

interface MusicPlayerContextValue {
  currentTrack: Track | null;
  isPlaying: boolean;
  playTrack: (track: TrackAction) => void;
  closePlayer: () => void;
  playNextTrack: () => void;
  playPrevTrack: () => void;
  togglePlay: () => void;
}

const MusicPlayerContext = createContext<MusicPlayerContextValue | undefined>(undefined);

interface MusicPlayerProviderProps {
  children: ReactNode;
  value: MusicPlayerContextValue;
}

/**
 * Provider for music player context
 * Reduces props drilling by providing player state and controls to all children
 */
export function MusicPlayerProvider({ children, value }: MusicPlayerProviderProps) {
  return <MusicPlayerContext.Provider value={value}>{children}</MusicPlayerContext.Provider>;
}

/**
 * Hook to access music player context
 * @throws Error if used outside MusicPlayerProvider
 */
export function useMusicPlayerContext(): MusicPlayerContextValue {
  const context = useContext(MusicPlayerContext);
  if (context === undefined) {
    throw new Error('useMusicPlayerContext must be used within a MusicPlayerProvider');
  }
  return context;
}
