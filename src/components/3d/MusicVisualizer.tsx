'use client';

import React from 'react';
import RhythmCatcher from '@/components/RhythmCatcher';

const MusicVisualizer: React.FC = () => {
  console.log('Redirecting to RhythmCatcher game');

  return (
    <div className="music-visualizer w-full h-full">
      <RhythmCatcher audioSrc="/audio/easter-egg.mp3" />
    </div>
  );
};

export default MusicVisualizer;
