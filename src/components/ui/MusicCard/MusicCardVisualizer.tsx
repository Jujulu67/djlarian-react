import { motion } from 'framer-motion';
import React, { useState, useEffect, useRef, useMemo } from 'react';

import {
  calculateFrequencyMapping,
  calculateRealAudioBarValue,
  calculateSimulatedAudioBarValue,
  calculatePauseAnimationBarValue,
} from './utils/audioVisualizerUtils';

interface MusicCardVisualizerProps {
  isVisible: boolean;
  isPlaying?: boolean;
  frequencyData?: Uint8Array | null;
  isRealAudio?: boolean;
}

/**
 * Audio visualizer component that displays animated waveform bars
 * Positioned at the bottom of the music card when player is visible
 */
export const MusicCardVisualizer: React.FC<MusicCardVisualizerProps> = ({
  isVisible,
  isPlaying = false,
  frequencyData = null,
  isRealAudio = false,
}) => {
  const [audioData, setAudioData] = useState<number[]>(Array(20).fill(20));
  const [currentTime, setCurrentTime] = useState<number>(() => Date.now() / 1000);
  const animationFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const previousAudioDataRef = useRef<number[]>(Array(20).fill(20));

  // Mémoriser le mapping des fréquences (ne change que si la longueur des données change)
  const frequencyMapping = useMemo(() => {
    if (frequencyData && frequencyData.length > 0) {
      return calculateFrequencyMapping(frequencyData.length);
    }
    return calculateFrequencyMapping(1024); // Valeur par défaut
  }, [frequencyData]);

  useEffect(() => {
    if (isVisible) {
      startTimeRef.current = Date.now();

      // Réinitialiser les valeurs précédentes quand on passe de pause à play
      if (isPlaying && isRealAudio && frequencyData && frequencyData.length > 0) {
        previousAudioDataRef.current = Array(20).fill(20);
      }

      let lastUpdateTime: number | null = null;
      const targetFPS = 30; // Réduire à 30 FPS au lieu de 60 pour améliorer les performances
      const frameInterval = 1000 / targetFPS;

      const animateBars = (timestamp: number) => {
        // Throttle updates to target FPS to reduce CPU usage
        if (lastUpdateTime !== null && timestamp - lastUpdateTime < frameInterval) {
          animationFrameRef.current = requestAnimationFrame(animateBars);
          return;
        }
        lastUpdateTime = timestamp;

        const elapsed = (Date.now() - startTimeRef.current) / 1000;
        const time = elapsed;
        setCurrentTime(time);

        let newData: number[];

        if (isPlaying && isRealAudio && frequencyData && frequencyData.length > 0) {
          // Utiliser les vraies données de fréquence
          newData = Array(20)
            .fill(0)
            .map((_, index) =>
              calculateRealAudioBarValue(
                index,
                frequencyData,
                previousAudioDataRef.current,
                frequencyMapping
              )
            );
        } else if (isPlaying) {
          // Simulation réaliste
          newData = Array(20)
            .fill(0)
            .map((_, index) =>
              calculateSimulatedAudioBarValue(index, time, previousAudioDataRef.current)
            );
        } else {
          // Animation en pause
          newData = Array(20)
            .fill(0)
            .map((_, index) =>
              calculatePauseAnimationBarValue(index, time, previousAudioDataRef.current)
            );
        }

        previousAudioDataRef.current = newData;
        setAudioData(newData);
        animationFrameRef.current = requestAnimationFrame(animateBars);
      };

      animationFrameRef.current = requestAnimationFrame(animateBars);

      return () => {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = null;
        }
      };
    } else {
      const resetData = Array(20).fill(20);
      previousAudioDataRef.current = resetData;
      setAudioData(resetData);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    }
  }, [isVisible, isPlaying, frequencyData, isRealAudio, frequencyMapping]);

  if (!isVisible) {
    return null;
  }

  return (
    <div className="w-full h-full flex items-end justify-center pt-3 pb-0">
      <div className="w-full h-full flex items-end justify-center px-2">
        <div className="flex items-end justify-between w-full h-full gap-[2px]">
          {audioData.map((value, index) => {
            const time = currentTime;
            const hue = (index * 12 + time * 50) % 360;
            const saturation = 85 + Math.sin(time * 2 + index) * 10;
            const lightness = 60 + Math.sin(time * 1.5 + index) * 15;

            return (
              <motion.div
                key={`waveform-bar-${index}`}
                className="rounded-t-md flex-1"
                style={{
                  height: `${value}%`,
                  minWidth: '4px',
                  maxHeight: '100%',
                  background: `linear-gradient(to top, 
                    hsla(${hue}, ${saturation}%, ${lightness - 20}%, 0.9) 0%, 
                    hsla(${hue + 25}, ${saturation}%, ${lightness}%, 1) 50%, 
                    hsla(${hue + 50}, ${saturation}%, ${lightness + 15}%, 0.95) 100%)`,
                  boxShadow: `0 0 10px hsla(${hue}, 95%, 65%, 0.8)`,
                  filter: 'blur(0.3px)',
                }}
                initial={{ height: '30%', opacity: 0 }}
                animate={{
                  height: `${value}%`,
                  opacity: 1,
                }}
                transition={{
                  duration: 0.1,
                  ease: 'easeOut',
                }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
};
