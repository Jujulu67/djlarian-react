'use client';

import { useCallback, useEffect, useRef } from 'react';

export function useSlotMachineSounds() {
  const spinAudioRef = useRef<HTMLAudioElement | null>(null);
  const stopAudioRef = useRef<HTMLAudioElement | null>(null);
  const winAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Preload audio files
    spinAudioRef.current = new Audio('/audio/slot-machine/spin.mp3');
    spinAudioRef.current.loop = true;
    spinAudioRef.current.volume = 0.4;

    stopAudioRef.current = new Audio('/audio/slot-machine/stop.mp3');
    stopAudioRef.current.volume = 0.5;

    winAudioRef.current = new Audio('/audio/slot-machine/win.mp3');
    winAudioRef.current.volume = 0.6;
  }, []);

  const playSpinSound = useCallback(() => {
    if (spinAudioRef.current) {
      spinAudioRef.current.currentTime = 0;
      spinAudioRef.current.play().catch(() => {});
    }
  }, []);

  const stopSpinSound = useCallback(() => {
    if (spinAudioRef.current) {
      spinAudioRef.current.pause();
      spinAudioRef.current.currentTime = 0;
    }
  }, []);

  const playReelStopSound = useCallback(() => {
    if (stopAudioRef.current) {
      // Clone node to allow overlapping sounds
      const sound = stopAudioRef.current.cloneNode() as HTMLAudioElement;
      sound.volume = 0.5;
      sound.play().catch(() => {});
    }
  }, []);

  const playWinSound = useCallback(() => {
    if (winAudioRef.current) {
      winAudioRef.current.currentTime = 0;
      winAudioRef.current.play().catch(() => {});
    }
  }, []);

  const playJackpotSound = useCallback(() => {
    // For now, use the same win sound but maybe louder or repeated?
    // Or we could download a specific jackpot sound.
    // Let's just use the win sound for now as it's a "coin spin" sound which fits.
    if (winAudioRef.current) {
      winAudioRef.current.currentTime = 0;
      winAudioRef.current.play().catch(() => {});
    }
  }, []);

  return {
    playSpinSound,
    stopSpinSound,
    playReelStopSound,
    playWinSound,
    playJackpotSound,
  };
}
