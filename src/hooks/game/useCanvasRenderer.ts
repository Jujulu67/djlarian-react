import { useRef, useCallback } from 'react';
import type { GamePattern } from '@/types/game';
import { logger } from '@/lib/logger';
import { isNotEmpty } from '@/lib/utils/arrayHelpers';

const PLAYER_SIZE = 12;

interface UseCanvasRendererProps {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  ctx: React.MutableRefObject<CanvasRenderingContext2D | null>;
  playerRef: React.MutableRefObject<{ x: number; y: number }>;
  patterns: GamePattern[];
  screenShake: { active: boolean; intensity: number };
  updateScreenShake: (reduceFactor?: number) => void;
  drawLanes: (ctx: CanvasRenderingContext2D, width: number, height: number) => void;
  checkAndAddBeat: (audioData: Uint8Array | null, canvasWidth: number) => void;
  updateAndDrawBeats: (
    ctx: CanvasRenderingContext2D,
    canvasWidth: number,
    canvasHeight: number,
    now: number
  ) => void;
  updatePointAnimations: (ctx: CanvasRenderingContext2D, now: number) => void;
  checkCollisions: (playerX: number, playerY: number, patterns: GamePattern[], now: number) => void;
  audioData: Uint8Array | null;
}

/**
 * Hook to manage canvas rendering logic
 * Handles drawing background, grid, patterns, player, and all visual effects
 */
export const useCanvasRenderer = ({
  canvasRef,
  ctx,
  playerRef,
  screenShake,
  updateScreenShake,
  drawLanes,
  checkAndAddBeat,
  updateAndDrawBeats,
  updatePointAnimations,
  checkCollisions,
  audioData,
}: UseCanvasRendererProps): void => {
  const lastPatternWarningTimeRef = useRef<number>(0);
  const lastPatternLogTimeRef = useRef<number>(0);
  const hasLoggedInactiveWithPatternsRef = useRef<boolean>(false);
  const patternRegenerationAttempted = useRef<boolean>(false);

  // Draw player on canvas
  const drawPlayer = useCallback(() => {
    if (!ctx.current || !canvasRef.current) return;

    ctx.current.beginPath();
    ctx.current.arc(playerRef.current.x, playerRef.current.y, PLAYER_SIZE, 0, Math.PI * 2);

    // Radial gradient for player
    const gradient = ctx.current.createRadialGradient(
      playerRef.current.x,
      playerRef.current.y,
      0,
      playerRef.current.x,
      playerRef.current.y,
      PLAYER_SIZE
    );
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.7, 'rgba(230, 230, 255, 0.9)');
    gradient.addColorStop(1, 'rgba(200, 200, 255, 0.7)');

    ctx.current.fillStyle = gradient;
    ctx.current.fill();

    // Add halo around player
    ctx.current.beginPath();
    ctx.current.arc(playerRef.current.x, playerRef.current.y, PLAYER_SIZE + 5, 0, Math.PI * 2);
    ctx.current.strokeStyle = 'rgba(200, 200, 255, 0.3)';
    ctx.current.lineWidth = 2;
    ctx.current.stroke();
  }, [ctx, canvasRef, playerRef]);

  // Draw a single pattern
  const drawPattern = useCallback(
    (pattern: GamePattern, canvasWidth: number): void => {
      if (!ctx.current) return;

      // Validate pattern position
      if (
        !pattern.position ||
        typeof pattern.position.x !== 'number' ||
        typeof pattern.position.y !== 'number'
      ) {
        logger.error('Pattern with invalid position:', pattern);
        return;
      }

      // Check if pattern is within canvas bounds
      if (pattern.position.x < -50 || pattern.position.x > canvasWidth + 50) {
        logger.debug(`Pattern out of horizontal bounds: ${pattern.id} at x=${pattern.position.x}`);
        return;
      }

      if (pattern.isDisintegrating) {
        // Draw disintegrating pattern
        const age = Date.now() - (pattern.disintegrateStartTime || Date.now());
        const duration = pattern.disintegrateDuration || 500;
        const progress = Math.min(1, age / duration);

        const originalSize = pattern.size || 20;
        const size = originalSize * (1 + progress);

        // Apply style based on pattern type and accuracy
        let color: string;
        let ringColor: string;

        if (pattern.type === 'golden') {
          color = `rgba(255, 215, 0, ${1 - progress})`;
          ringColor =
            pattern.accuracyType === 'perfect'
              ? 'rgba(255, 255, 255, 0.8)'
              : pattern.accuracyType === 'good'
                ? 'rgba(255, 255, 0, 0.6)'
                : 'rgba(255, 215, 0, 0.4)';
        } else if (pattern.type === 'blue') {
          color = `rgba(0, 170, 255, ${1 - progress})`;
          ringColor =
            pattern.accuracyType === 'perfect'
              ? 'rgba(255, 255, 255, 0.8)'
              : pattern.accuracyType === 'good'
                ? 'rgba(0, 255, 255, 0.6)'
                : 'rgba(0, 170, 255, 0.4)';
        } else {
          color = `rgba(211, 69, 255, ${1 - progress})`;
          ringColor =
            pattern.accuracyType === 'perfect'
              ? 'rgba(255, 255, 255, 0.8)'
              : pattern.accuracyType === 'good'
                ? 'rgba(255, 100, 255, 0.6)'
                : 'rgba(211, 69, 255, 0.4)';
        }

        // Draw main circle fading out
        ctx.current.beginPath();
        ctx.current.arc(pattern.position.x, pattern.position.y, size / 2, 0, Math.PI * 2);
        ctx.current.fillStyle = color;
        ctx.current.fill();

        // Add glowing ring that expands
        if (pattern.accuracyType) {
          ctx.current.beginPath();
          ctx.current.arc(pattern.position.x, pattern.position.y, size, 0, Math.PI * 2);
          ctx.current.strokeStyle = ringColor;
          ctx.current.lineWidth = 3;
          ctx.current.stroke();
        }
      } else {
        // Draw normal pattern
        let color: string;
        let shadowColor: string;
        let glowSize = 0;

        switch (pattern.type) {
          case 'golden':
            color = '#FFD700'; // Gold
            shadowColor = 'rgba(255, 215, 0, 0.5)';
            glowSize = 10;
            break;
          case 'blue':
            color = '#00AAFF'; // Blue
            shadowColor = 'rgba(0, 170, 255, 0.5)';
            glowSize = 8;
            break;
          case 'collect':
            color = '#D345FF'; // Purple
            shadowColor = 'rgba(211, 69, 255, 0.5)';
            glowSize = 5;
            break;
          case 'avoid':
            color = '#FF4444'; // Red
            shadowColor = 'rgba(255, 68, 68, 0.5)';
            break;
          case 'enemy':
            color = '#FF2222'; // Brighter red
            shadowColor = 'rgba(255, 34, 34, 0.5)';
            break;
          default:
            color = '#FFFFFF';
            shadowColor = 'rgba(255, 255, 255, 0.5)';
        }

        // Add pulse effect to the beat
        let sizeModifier = 0;
        if (pattern.createdOnBeat) {
          const pulseDuration = 500; // ms
          const age = Date.now() - pattern.timestamp;
          if (age < pulseDuration) {
            const pulseProgress = age / pulseDuration;
            sizeModifier = Math.sin(pulseProgress * Math.PI) * 5;
          }
        }

        // Add glow effect for special patterns
        if (glowSize > 0) {
          ctx.current.shadowColor = shadowColor;
          ctx.current.shadowBlur = glowSize;
        }

        // Draw main circle
        ctx.current.beginPath();
        ctx.current.arc(
          pattern.position.x,
          pattern.position.y,
          (pattern.size || 20) / 2 + sizeModifier,
          0,
          Math.PI * 2
        );
        ctx.current.fillStyle = color;
        ctx.current.fill();

        // Reset glow effects
        ctx.current.shadowColor = 'transparent';
        ctx.current.shadowBlur = 0;

        // Add inner circle for special patterns
        if (pattern.type === 'golden' || pattern.type === 'blue') {
          ctx.current.beginPath();
          ctx.current.arc(
            pattern.position.x,
            pattern.position.y,
            (pattern.size || 20) / 4,
            0,
            Math.PI * 2
          );
          ctx.current.fillStyle = pattern.type === 'golden' ? '#FFFFFF' : '#DDFAFF';
          ctx.current.fill();
        }

        // Add dashed border to show ideal timing
        if (pattern.targetTime) {
          const timeUntilTarget = pattern.targetTime - Date.now();
          const perfectWindowSize = 100; // ms

          if (Math.abs(timeUntilTarget) < perfectWindowSize) {
            // In perfect window, show bright border
            ctx.current.beginPath();
            ctx.current.arc(
              pattern.position.x,
              pattern.position.y,
              (pattern.size || 20) / 2 + 3,
              0,
              Math.PI * 2
            );
            ctx.current.strokeStyle =
              pattern.type === 'golden'
                ? 'rgba(255, 255, 255, 0.8)'
                : pattern.type === 'blue'
                  ? 'rgba(200, 255, 255, 0.8)'
                  : 'rgba(255, 200, 255, 0.8)';
            ctx.current.lineWidth = 2;
            ctx.current.stroke();
          }
        }

        // Add text to identify pattern (for debugging)
        ctx.current.font = '10px Arial';
        ctx.current.fillStyle = 'white';
        ctx.current.textAlign = 'center';
        ctx.current.fillText(`${pattern.lane}`, pattern.position.x, pattern.position.y - 15);
        ctx.current.fillText(
          `${Math.round(pattern.position.x)},${Math.round(pattern.position.y)}`,
          pattern.position.x,
          pattern.position.y + 20
        );
      }
    },
    [ctx]
  );

  // Main animation function
  const animate = useCallback(
    (
      isActive: boolean,
      gameData: {
        patterns: GamePattern[];
        audioData: Uint8Array | null;
        handleCollision: (type: GamePattern['type'], pattern: GamePattern) => void;
        gameState: {
          isActive: boolean;
        };
        startGame?: () => void;
        simpleUpdateGame?: () => void;
      }
    ) => {
      if (!canvasRef.current || !ctx.current) return;

      const now = Date.now();
      const canvasWidth = canvasRef.current.width;
      const canvasHeight = canvasRef.current.height;

      // Clear canvas
      ctx.current.clearRect(0, 0, canvasWidth, canvasHeight);

      // Draw background
      ctx.current.fillStyle = 'rgba(0, 0, 0, 0.2)';
      ctx.current.fillRect(0, 0, canvasWidth, canvasHeight);

      // Draw reference grid
      ctx.current.strokeStyle = 'rgba(50, 50, 50, 0.3)';
      ctx.current.lineWidth = 1;

      // Horizontal lines
      for (let y = 0; y < canvasHeight; y += 100) {
        ctx.current.beginPath();
        ctx.current.moveTo(0, y);
        ctx.current.lineTo(canvasWidth, y);
        ctx.current.stroke();

        // Add coordinates
        ctx.current.fillStyle = 'rgba(150, 150, 150, 0.5)';
        ctx.current.font = '10px Arial';
        ctx.current.fillText(`y: ${y}`, 5, y + 12);
      }

      // Vertical lines
      for (let x = 0; x < canvasWidth; x += 100) {
        ctx.current.beginPath();
        ctx.current.moveTo(x, 0);
        ctx.current.lineTo(x, canvasHeight);
        ctx.current.stroke();

        // Add coordinates
        ctx.current.fillStyle = 'rgba(150, 150, 150, 0.5)';
        ctx.current.font = '10px Arial';
        ctx.current.fillText(`x: ${x}`, x + 2, 10);
      }

      // Apply screen shake if active
      if (screenShake.active) {
        const shakeX = (Math.random() - 0.5) * screenShake.intensity;
        const shakeY = (Math.random() - 0.5) * screenShake.intensity;
        ctx.current.save();
        ctx.current.translate(shakeX, shakeY);

        // Reduce screen shake intensity over time
        updateScreenShake();
      }

      // Draw frequency lanes
      drawLanes(ctx.current, canvasWidth, canvasHeight);

      // Check and add beats
      checkAndAddBeat(audioData, canvasWidth);

      // Update and draw beats
      updateAndDrawBeats(ctx.current, canvasWidth, canvasHeight, now);

      // Check if we have patterns to draw
      const hasPatterns = isNotEmpty(gameData.patterns);

      // If we don't have patterns but game should be active
      if (!hasPatterns) {
        const warningTimeElapsed =
          typeof lastPatternWarningTimeRef.current === 'number'
            ? now - lastPatternWarningTimeRef.current
            : 2000;

        if (warningTimeElapsed > 1000) {
          logger.warn('Aucun pattern à afficher');
          lastPatternWarningTimeRef.current = now;
        }

        // Display error message
        if (ctx.current) {
          ctx.current.fillStyle = '#ff0000';
          ctx.current.font = '20px Arial';
          ctx.current.fillText(
            'Aucun pattern à afficher',
            canvasWidth / 2 - 100,
            canvasHeight / 2
          );
        }

        // Try to regenerate patterns
        if (!patternRegenerationAttempted.current) {
          logger.debug('Tentative de régénération des patterns...');
          patternRegenerationAttempted.current = true;

          // Dispatch custom event to regenerate patterns
          const event = new CustomEvent('game-regenerate-patterns');
          window.dispatchEvent(event);

          // Call startGame directly if available
          if (gameData.startGame) {
            logger.debug('Appel direct de startGame pour générer des patterns');
            gameData.startGame();
          }

          // Last resort: call simpleUpdateGame if available
          if (typeof gameData.simpleUpdateGame === 'function') {
            logger.debug('Appel de secours de simpleUpdateGame');
            gameData.simpleUpdateGame();

            // Second attempt after short delay
            setTimeout(() => {
              if (!gameData.patterns || gameData.patterns.length === 0) {
                logger.debug('Deuxième tentative via simpleUpdateGame');
                if (typeof gameData.simpleUpdateGame === 'function') {
                  gameData.simpleUpdateGame();
                }
              }
            }, 300);
          }

          // Reset flag after delay
          setTimeout(() => {
            patternRegenerationAttempted.current = false;
          }, 2000);
        }

        // Draw player even if no patterns
        drawPlayer();

        requestAnimationFrame(() => animate(isActive, gameData));
        return;
      }

      // If we have patterns but game is marked as inactive in UI
      if (!gameData.gameState.isActive && hasPatterns) {
        // Log only on state changes to avoid repetitive logs
        if (!hasLoggedInactiveWithPatternsRef.current) {
          logger.debug(
            "Jeu marqué comme inactif mais des patterns sont disponibles - Forcer l'affichage"
          );
          hasLoggedInactiveWithPatternsRef.current = true;
        }

        // Display info message
        if (ctx.current) {
          ctx.current.fillStyle = '#ffffff';
          ctx.current.font = '16px Arial';
          ctx.current.fillText(
            'Cliquez pour interagir avec les patterns',
            canvasWidth / 2 - 150,
            50
          );
        }
      } else {
        // Reset flag if state changes
        hasLoggedInactiveWithPatternsRef.current = false;
      }

      // Log number of patterns to draw (only once per second to avoid console pollution)
      if (now - lastPatternLogTimeRef.current > 1000) {
        logger.debug(`Dessin de ${gameData.patterns?.length || 0} patterns`, gameData.patterns);
        lastPatternLogTimeRef.current = now;

        // Reset warning counters
        lastPatternWarningTimeRef.current = 0;
      }

      // Check if patterns exist before trying to draw them
      if (!gameData.patterns || gameData.patterns.length === 0) {
        // Limit warning frequency
        if (now - lastPatternWarningTimeRef.current > 1000) {
          logger.warn('Aucun pattern à dessiner, vérification supplémentaire requise');
          lastPatternWarningTimeRef.current = now;
        }

        // Add visual indicator for debugging
        ctx.current!.fillStyle = 'rgba(255, 0, 0, 0.5)';
        ctx.current!.fillRect(10, 10, 100, 30);
        ctx.current!.fillStyle = 'white';
        ctx.current!.font = '12px Arial';
        ctx.current!.fillText('Pas de patterns!', 20, 30);

        // Continue animation even without patterns
        drawPlayer();
        requestAnimationFrame(() => animate(isActive, gameData));
        return;
      }

      // Draw each pattern
      gameData.patterns.forEach((pattern) => {
        drawPattern(pattern, canvasWidth, canvasHeight);
      });

      // Draw player
      drawPlayer();

      // Update and draw point animations
      updatePointAnimations(ctx.current, now);

      // Check collisions
      checkCollisions(playerRef.current.x, playerRef.current.y, gameData.patterns, now);

      // Restore context if screen shake was active
      if (screenShake.active) {
        ctx.current!.restore();
      }

      // Continue animation
      requestAnimationFrame(() => animate(isActive, gameData));
    },
    [
      canvasRef,
      ctx,
      playerRef,
      screenShake,
      updateScreenShake,
      drawLanes,
      checkAndAddBeat,
      updateAndDrawBeats,
      updatePointAnimations,
      checkCollisions,
      audioData,
      drawPlayer,
      drawPattern,
    ]
  );

  return {
    animate,
    drawPlayer,
    drawPattern,
  };
};

