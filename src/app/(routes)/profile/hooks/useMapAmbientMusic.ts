'use client';

import { useRef, useEffect, useState, useCallback } from 'react';

const AUDIO_PATH = '/audio/casino-map-ambient.mp3';
const STORAGE_KEY_MUTED = 'casino-map-muted';
const STORAGE_KEY_VOLUME = 'casino-map-volume';
const FADE_DURATION = 500; // ms - shorter for better responsiveness

export function useMapAmbientMusic(isOpen: boolean) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fadeIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(0.5);
  const [isReady, setIsReady] = useState(false);

  // Initialize audio and load preferences from localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Load muted preference
    const savedMuted = localStorage.getItem(STORAGE_KEY_MUTED);
    if (savedMuted !== null) {
      setIsMuted(savedMuted === 'true');
    }

    // Load volume preference
    const savedVolume = localStorage.getItem(STORAGE_KEY_VOLUME);
    if (savedVolume !== null) {
      setVolume(parseFloat(savedVolume));
    }

    // Create audio element
    const audio = new Audio(AUDIO_PATH);
    audio.loop = true;
    audio.volume = 0;
    audio.preload = 'auto';

    audio.addEventListener('canplaythrough', () => {
      setIsReady(true);
    });

    audio.addEventListener('error', (e) => {
      console.warn('Failed to load casino map ambient music:', e);
    });

    audioRef.current = audio;

    return () => {
      if (fadeIntervalRef.current) {
        clearInterval(fadeIntervalRef.current);
      }
      audio.pause();
      audio.src = '';
    };
  }, []);

  // Fade in/out function
  const fadeVolume = useCallback((targetVolume: number, onComplete?: () => void) => {
    if (!audioRef.current) return;

    if (fadeIntervalRef.current) {
      clearInterval(fadeIntervalRef.current);
    }

    const audio = audioRef.current;
    const startVolume = audio.volume;
    const volumeDiff = targetVolume - startVolume;
    const steps = 15;
    const stepDuration = FADE_DURATION / steps;
    let currentStep = 0;

    fadeIntervalRef.current = setInterval(() => {
      currentStep++;
      const progress = currentStep / steps;
      // Ease out cubic
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      audio.volume = Math.max(0, Math.min(1, startVolume + volumeDiff * easeProgress));

      if (currentStep >= steps) {
        if (fadeIntervalRef.current) {
          clearInterval(fadeIntervalRef.current);
          fadeIntervalRef.current = null;
        }
        audio.volume = targetVolume;
        onComplete?.();
      }
    }, stepDuration);
  }, []);

  // Handle play/pause based on isOpen
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !isReady) return;

    if (isOpen) {
      // Start playing with fade in
      audio
        .play()
        .then(() => {
          if (!isMuted) {
            fadeVolume(volume);
          }
        })
        .catch((e) => {
          // Autoplay might be blocked by browser
          console.warn('Autoplay blocked:', e);
        });
    } else {
      // Fade out and pause
      fadeVolume(0, () => {
        audio.pause();
        audio.currentTime = 0;
      });
    }
  }, [isOpen, isReady, isMuted, volume, fadeVolume]);

  // Handle mute toggle - instant
  const toggleMute = useCallback(() => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    localStorage.setItem(STORAGE_KEY_MUTED, String(newMuted));

    if (audioRef.current && isOpen) {
      // Instant mute/unmute
      audioRef.current.volume = newMuted ? 0 : volume;
    }
  }, [isMuted, isOpen, volume]);

  // Handle volume change - instant and save to localStorage
  const changeVolume = useCallback(
    (newVolume: number) => {
      const clampedVolume = Math.max(0, Math.min(1, newVolume));
      setVolume(clampedVolume);
      localStorage.setItem(STORAGE_KEY_VOLUME, String(clampedVolume));

      if (audioRef.current && !isMuted && isOpen) {
        audioRef.current.volume = clampedVolume;
      }
    },
    [isMuted, isOpen]
  );

  return {
    isMuted,
    volume,
    isReady,
    toggleMute,
    changeVolume,
  };
}
