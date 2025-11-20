import { useState, useCallback } from 'react';

interface PointAnimation {
  x: number;
  y: number;
  value: number;
  timestamp: number;
  type: string;
}

/**
 * Hook to manage point animations displayed when collecting patterns
 */
export const usePointAnimations = () => {
  const [pointAnimations, setPointAnimations] = useState<PointAnimation[]>([]);

  const addPointAnimation = useCallback((x: number, y: number, value: number, type: string) => {
    const now = Date.now();
    setPointAnimations((prev) => [
      ...prev,
      {
        x,
        y: y - 25, // Slightly above the position
        value,
        timestamp: now,
        type,
      },
    ]);
  }, []);

  const updateAnimations = useCallback((ctx: CanvasRenderingContext2D, now: number) => {
    setPointAnimations(
      (prev) =>
        prev
          .map((point) => {
            const age = now - point.timestamp;
            const opacity = Math.max(0, 1 - age / 1000); // Fade out after 1 second

            // Move animation upward
            const yOffset = Math.min(40, age / 20);

            // Color based on accuracy type
            let color: string;
            switch (point.type) {
              case 'perfect':
                color = `rgba(255, 255, 64, ${opacity})`;
                break;
              case 'good':
                color = `rgba(50, 255, 50, ${opacity})`;
                break;
              case 'ok':
                color = `rgba(255, 255, 255, ${opacity})`;
                break;
              default:
                color = `rgba(255, 255, 255, ${opacity})`;
            }

            // Draw point text
            ctx.font = point.type === 'perfect' ? 'bold 16px Arial' : '14px Arial';
            ctx.fillStyle = color;
            ctx.textAlign = 'center';

            // Display points and accuracy type
            ctx.fillText(`+${Math.round(point.value)}`, point.x, point.y - yOffset);
            ctx.font = '10px Arial';
            ctx.fillText(point.type.toUpperCase(), point.x, point.y - yOffset + 12);

            return {
              ...point,
              y: point.y - 0.5, // Move up slightly
            };
          })
          .filter((point) => now - point.timestamp < 1000) // Remove after 1 second
    );
  }, []);

  return {
    pointAnimations,
    addPointAnimation,
    updateAnimations,
  };
};
