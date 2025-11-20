import { motion } from 'framer-motion';
import React, { useState, useEffect, useRef } from 'react';

interface UseAudioVisualizerProps {
  isYoutubeVisible: boolean;
  isSoundcloudVisible: boolean;
}

interface UseAudioVisualizerReturn {
  audioData: number[];
  renderVisualizer: () => React.ReactNode;
}

/**
 * Hook to manage audio visualizer animation
 * Creates animated bars with chromatic colors based on audio data
 */
export const useAudioVisualizer = ({
  isYoutubeVisible,
  isSoundcloudVisible,
}: UseAudioVisualizerProps): UseAudioVisualizerReturn => {
  const [audioData, setAudioData] = useState<number[]>(Array(20).fill(0));
  const animationFrameRef = useRef<number | null>(null);

  // Animate bars when player is visible - More aggressive animation
  useEffect(() => {
    const shouldAnimate = isYoutubeVisible || isSoundcloudVisible;

    if (shouldAnimate) {
      const startTime = Date.now();

      const animateBars = () => {
        const elapsed = (Date.now() - startTime) / 1000;
        const newData = Array(20)
          .fill(0)
          .map((_, index) => {
            const position = index / 20;
            const time = elapsed;

            // More dynamic animation with multiple frequencies
            const value =
              40 +
              35 * Math.sin(time * 2 + position * 12) +
              20 * Math.sin(time * 3.5 + position * 7) +
              15 * Math.sin(time * 5.2 + position * 18) +
              10 * Math.sin(time * 7.1 + position * 25);

            return Math.max(20, Math.min(95, value));
          });

        setAudioData(newData);
        animationFrameRef.current = requestAnimationFrame(animateBars);
      };

      // Start immediately
      animateBars();

      return () => {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = null;
        }
      };
    } else {
      // Reset to zero when not visible
      setAudioData(Array(20).fill(0));
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    }
  }, [isYoutubeVisible, isSoundcloudVisible]);

  // Render visualizer bars - Always render if either player is visible
  const renderVisualizer = React.useCallback(() => {
    const shouldShow = isYoutubeVisible || isSoundcloudVisible;

    if (!shouldShow || audioData.every((val) => val === 0)) {
      return null;
    }

    return (
      <div
        className="h-[64px] w-full bg-gradient-to-r from-purple-900/20 via-purple-900/40 to-purple-900/20 flex items-end justify-center overflow-hidden"
        style={{
          position: 'relative',
          zIndex: 50,
        }}
      >
        <div className="w-full h-full flex items-end justify-center px-2">
          <div className="flex items-end justify-between w-full h-full gap-[2px] pt-0">
            {audioData.map((value, index) => {
              const time = Date.now() / 1000;
              const hue = (index * 12 + time * 50) % 360;
              const saturation = 85 + Math.sin(time * 2 + index) * 10;
              const lightness = 60 + Math.sin(time * 1.5 + index) * 15;

              return (
                <motion.div
                  key={`bar-${index}`}
                  className="backdrop-blur-sm rounded-t-md flex-shrink-0"
                  style={{
                    height: `${value}%`,
                    width: 'calc(5% - 2px)',
                    minWidth: '8px',
                    background: `linear-gradient(to top, 
                      hsla(${hue}, ${saturation}%, ${lightness - 30}%, 0.6) 0%, 
                      hsla(${hue + 40}, ${saturation}%, ${lightness}%, 0.9) 50%, 
                      hsla(${hue + 70}, ${saturation}%, ${lightness + 15}%, 0.7) 100%)`,
                    boxShadow: `0 0 20px hsla(${hue}, 95%, 65%, 0.8)`,
                    filter: 'blur(0.5px)',
                  }}
                  initial={{ height: '15%' }}
                  animate={{ height: `${value}%` }}
                  transition={{
                    duration: 0.3,
                    ease: 'easeOut',
                    repeat: Infinity,
                    repeatType: 'reverse' as const,
                  }}
                />
              );
            })}
          </div>
        </div>
      </div>
    );
  }, [isYoutubeVisible, isSoundcloudVisible, audioData]);

  return {
    audioData,
    renderVisualizer,
  };
};
