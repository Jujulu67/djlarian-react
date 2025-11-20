import { useState, useEffect, useCallback } from 'react';
import type { FrequencyBand } from '@/types/game';

interface FrequencyLane {
  name: FrequencyBand;
  yPosition: number;
  alpha: number;
}

/**
 * Hook to manage frequency lanes visualization
 */
export const useFrequencyLanes = (currentBpm?: number): {
  frequencyLanes: FrequencyLane[];
  drawLanes: (ctx: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number) => void;
} => {
  const [frequencyLanes, setFrequencyLanes] = useState<FrequencyLane[]>([
    { name: 'bass', yPosition: 0.75, alpha: 0.2 }, // Low frequencies
    { name: 'mid', yPosition: 0.5, alpha: 0.2 }, // Mid frequencies
    { name: 'high', yPosition: 0.25, alpha: 0.2 }, // High frequencies
  ]);

  // Pulse lanes animation based on BPM
  useEffect(() => {
    if (!currentBpm) return;

    const beatInterval = 60000 / currentBpm;
    const pulseLanes = (): void => {
      setFrequencyLanes((prev) =>
        prev.map((lane) => ({
          ...lane,
          alpha: Math.min(0.8, lane.alpha + 0.3),
        }))
      );

      // Gradually decrease alpha
      setTimeout(() => {
        setFrequencyLanes((prev) =>
          prev.map((lane) => ({
            ...lane,
            alpha: Math.max(0.2, lane.alpha - 0.2),
          }))
        );
      }, beatInterval / 4);
    };

    const interval = setInterval(pulseLanes, beatInterval);
    return (): void => {
      clearInterval(interval);
    };
  }, [currentBpm]);

  const drawLanes = useCallback(
    (ctx: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number): void => {
      frequencyLanes.forEach((lane) => {
        const yPos = lane.yPosition * canvasHeight;

        // Draw lane line
        ctx.beginPath();
        ctx.moveTo(0, yPos);
        ctx.lineTo(canvasWidth, yPos);
        ctx.strokeStyle =
          lane.name === 'bass'
            ? `rgba(255, 215, 0, ${lane.alpha})`
            : lane.name === 'high'
              ? `rgba(0, 170, 255, ${lane.alpha})`
              : `rgba(211, 69, 255, ${lane.alpha})`;
        ctx.lineWidth = 3;
        ctx.stroke();

        // Add glow effect
        ctx.beginPath();
        const gradient = ctx.createLinearGradient(0, yPos - 10, 0, yPos + 10);
        const rgb =
          lane.name === 'bass'
            ? '255, 215, 0'
            : lane.name === 'high'
              ? '0, 170, 255'
              : '211, 69, 255';

        gradient.addColorStop(0, `rgba(${rgb}, 0)`);
        gradient.addColorStop(0.5, `rgba(${rgb}, ${lane.alpha * 0.5})`);
        gradient.addColorStop(1, `rgba(${rgb}, 0)`);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, yPos - 10, canvasWidth, 20);
      });
    },
    [frequencyLanes]
  );

  return {
    frequencyLanes,
    drawLanes,
  };
};

