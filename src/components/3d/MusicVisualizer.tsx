'use client';

import React from 'react';

import RhythmCatcher from '@/components/RhythmCatcher';
import { logger } from '@/lib/logger';

const MusicVisualizer: React.FC = () => {
  logger.debug('Redirecting to RhythmCatcher game');

  return (
    <div className="music-visualizer w-full h-full">
      <RhythmCatcher audioSrc="/audio/easter-egg.mp3" />
    </div>
  );
};

export default MusicVisualizer;
