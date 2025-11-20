import { useCallback } from 'react';

import { GamePattern } from '@/types/game';

const PLAYER_SIZE = 12;

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  life: number;
  timestamp: number;
}

interface UseCollisionDetectionProps {
  handleCollision: (type: GamePattern['type'], pattern: GamePattern) => void;
  gameState: {
    lastHitAccuracy?: 'perfect' | 'good' | 'ok' | 'miss';
    lastHitPoints?: number;
  };
  setScreenShake: (shake: { active: boolean; intensity: number }) => void;
  setParticles: React.Dispatch<React.SetStateAction<Particle[]>>;
  setPointAnimations: React.Dispatch<
    React.SetStateAction<{ x: number; y: number; value: number; timestamp: number; type: string }[]>
  >;
}

/**
 * Hook to manage collision detection between player and patterns
 */
export const useCollisionDetection = ({
  handleCollision,
  gameState,
  setScreenShake,
  setParticles,
  setPointAnimations,
}: UseCollisionDetectionProps) => {
  const checkCollisions = useCallback(
    (playerX: number, playerY: number, patterns: GamePattern[], now: number) => {
      patterns.forEach((pattern) => {
        // Ignore patterns that are disintegrating
        if (pattern.isDisintegrating) return;

        const dx = pattern.position.x - playerX;
        const dy = pattern.position.y - playerY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < (pattern.size || 20) / 2 + PLAYER_SIZE / 2) {
          // Activate screen shake for hits
          let intensity = 3;
          if (pattern.type === 'golden') intensity = 5;
          setScreenShake({ active: true, intensity });

          // Generate particles at collision location
          const particleCount = pattern.type === 'golden' ? 12 : pattern.type === 'blue' ? 10 : 8;
          const particleColor =
            pattern.type === 'golden'
              ? '#FFD700'
              : pattern.type === 'blue'
                ? '#00AAFF'
                : pattern.type === 'collect'
                  ? '#D345FF'
                  : '#FF4444';

          const newParticles = Array.from({ length: particleCount }, () => ({
            x: pattern.position.x,
            y: pattern.position.y,
            vx: (Math.random() - 0.5) * 3,
            vy: (Math.random() - 0.5) * 3,
            size: Math.random() * 3 + 2,
            color: particleColor,
            life: 1,
            timestamp: now,
          }));

          setParticles((prev) => [...prev, ...newParticles]);

          // Add point animation if it's a collectible pattern
          if (pattern.type === 'collect' || pattern.type === 'golden' || pattern.type === 'blue') {
            const hitType = gameState.lastHitAccuracy || 'ok';
            const pointsValue = gameState.lastHitPoints || 0;

            setPointAnimations((prev) => [
              ...prev,
              {
                x: pattern.position.x,
                y: pattern.position.y - 25, // Slightly above the pattern
                value: pointsValue,
                timestamp: now,
                type: hitType,
              },
            ]);
          }

          // Call collision handler
          handleCollision(pattern.type, pattern);
        }
      });
    },
    [handleCollision, gameState, setScreenShake, setParticles, setPointAnimations]
  );

  return { checkCollisions };
};
