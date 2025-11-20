import { useState, useRef, useCallback } from 'react';

interface BeatVisual {
  timestamp: number;
  strength: number;
  position: number;
}

/**
 * Hook to manage beat visual effects (waves moving across screen)
 */
export const useBeatVisuals = () => {
  const [beatVisuals, setBeatVisuals] = useState<BeatVisual[]>([]);
  const lastBeatTimeRef = useRef<number>(0);

  const checkAndAddBeat = useCallback(
    (audioData: Uint8Array | null, canvasWidth: number) => {
      if (!audioData || audioData.length === 0) return;

      // Check if there's a new beat to add (based on bass intensity)
      const bassValue = audioData.slice(0, 5).reduce((sum, value) => sum + value, 0) / 5;
      const now = Date.now();

      if (bassValue > 150 && now - lastBeatTimeRef.current > 250) {
        const strength = Math.min(1, bassValue / 200);
        setBeatVisuals((prev) => [
          ...prev,
          { timestamp: now, strength, position: canvasWidth },
        ]);
        lastBeatTimeRef.current = now;
      }
    },
    []
  );

  const updateAndDrawBeats = useCallback(
    (ctx: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number, now: number) => {
      setBeatVisuals((prev) =>
        prev
          .map((beat) => {
            // Move beat from right to left
            const ageRatio = (now - beat.timestamp) / 2000; // 2 seconds to cross screen
            const newPosition = canvasWidth * (1 - ageRatio);

            // Calculate opacity (decreases over time)
            const opacity = Math.max(0, 1 - ageRatio);

            // Draw beat wave
            ctx.beginPath();
            ctx.arc(newPosition, canvasHeight / 2, beat.strength * 50, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(255, 255, 255, ${opacity * 0.7})`;
            ctx.lineWidth = 3;
            ctx.stroke();

            return {
              ...beat,
              position: newPosition,
            };
          })
          .filter((beat) => beat.position > -50) // Remove beats off screen
      );
    },
    []
  );

  return {
    beatVisuals,
    checkAndAddBeat,
    updateAndDrawBeats,
  };
};

