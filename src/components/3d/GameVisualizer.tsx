'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';

// Hooks
import { useBeatVisuals } from '@/hooks/game/useBeatVisuals';
import { useCanvasRenderer } from '@/hooks/game/useCanvasRenderer';
import { useCollisionDetection } from '@/hooks/game/useCollisionDetection';
import { useFrequencyLanes } from '@/hooks/game/useFrequencyLanes';
import { usePlayerPosition } from '@/hooks/game/usePlayerPosition';
import { usePointAnimations } from '@/hooks/game/usePointAnimations';
import { useScreenShake } from '@/hooks/game/useScreenShake';
import { logger } from '@/lib/logger';
import { isNotEmpty } from '@/lib/utils/arrayHelpers';
import type { GamePattern } from '@/types/game';

import ParticleSystem, { Particle } from './ParticleSystem';
import ScoreDisplay from './ScoreDisplay';

interface GameVisualizerProps {
  gameData: {
    patterns: GamePattern[];
    audioData: Uint8Array | null;
    handleCollision: (type: GamePattern['type'], pattern: GamePattern) => void;
    gameState: {
      isActive: boolean;
      score: number;
      combo: number;
      highScore: number;
      perfectHits: number;
      goodHits: number;
      okHits: number;
      totalNotes: number;
      lastHitAccuracy?: 'perfect' | 'good' | 'ok' | 'miss';
      lastHitPoints?: number;
    };
    setPlayerPosition: (x: number, y: number) => void;
    currentBpm?: number;
    beatConfidence?: number;
    startGame?: () => void;
    endGame?: () => void;
    simpleUpdateGame?: () => void;
  };
  audioElement: HTMLAudioElement | null;
}

const GameVisualizer: React.FC<GameVisualizerProps> = ({ gameData, audioElement }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctx = useRef<CanvasRenderingContext2D | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const [particles, setParticles] = useState<Particle[]>([]);

  // Use specialized hooks
  const screenShake = useScreenShake();
  const pointAnimations = usePointAnimations();
  const frequencyLanes = useFrequencyLanes(gameData.currentBpm);
  const beatVisuals = useBeatVisuals();
  const playerPosition = usePlayerPosition({
    setPlayerPosition: gameData.setPlayerPosition,
  });

  // Wrapper for screen shake to match useCollisionDetection interface
  const setScreenShakeWrapper = useCallback(
    (shake: { active: boolean; intensity: number }) => {
      screenShake.triggerShake(shake.intensity);
    },
    [screenShake]
  );

  // Wrapper for point animations to match useCollisionDetection interface
  const setPointAnimationsWrapper = useCallback(
    (
      updater:
        | { x: number; y: number; value: number; timestamp: number; type: string }[]
        | ((
            prev: { x: number; y: number; value: number; timestamp: number; type: string }[]
          ) => { x: number; y: number; value: number; timestamp: number; type: string }[])
    ) => {
      if (typeof updater === 'function') {
        // This shouldn't happen with current useCollisionDetection, but handle it
        const current = pointAnimations.pointAnimations;
        const newValue = updater(current);
        newValue.forEach((point) => {
          pointAnimations.addPointAnimation(point.x, point.y, point.value, point.type);
        });
      } else {
        // Direct array - clear and add all
        updater.forEach((point) => {
          pointAnimations.addPointAnimation(point.x, point.y, point.value, point.type);
        });
      }
    },
    [pointAnimations]
  );

  // Collision detection hook
  const collisionDetection = useCollisionDetection({
    handleCollision: gameData.handleCollision,
    gameState: gameData.gameState,
    setScreenShake: setScreenShakeWrapper,
    setParticles,
    setPointAnimations: setPointAnimationsWrapper,
  });

  // Canvas renderer hook
  const canvasRenderer = useCanvasRenderer({
    canvasRef,
    ctx,
    playerRef: playerPosition.playerRef,
    patterns: gameData.patterns,
    screenShake: screenShake.screenShake,
    updateScreenShake: screenShake.updateShake,
    drawLanes: frequencyLanes.drawLanes,
    checkAndAddBeat: beatVisuals.checkAndAddBeat,
    updateAndDrawBeats: beatVisuals.updateAndDrawBeats,
    updatePointAnimations: (ctx, now) => pointAnimations.updateAnimations(ctx, now),
    checkCollisions: collisionDetection.checkCollisions,
    audioData: gameData.audioData,
  });

  // Handle pointer movement (mouse/touch)
  const handlePointerMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
      if (!canvasRef.current) return;

      const rect = canvasRef.current.getBoundingClientRect();
      let clientX: number, clientY: number;

      if ('touches' in e) {
        // TouchEvent
        if (e.touches.length === 0) return;
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else {
        // MouseEvent
        clientX = e.clientX;
        clientY = e.clientY;
      }

      const x = clientX - rect.left;
      const y = clientY - rect.top;

      playerPosition.updatePosition(x, y);
    },
    [playerPosition]
  );

  // Setup canvas and animation
  useEffect(() => {
    if (!canvasRef.current) return;
    ctx.current = canvasRef.current.getContext('2d');
    if (!ctx.current) {
      logger.error("Impossible d'obtenir le contexte 2D");
      return;
    }

    const resizeCanvas = (): void => {
      if (!canvasRef.current) return;
      const container = canvasRef.current.parentElement;
      if (!container) return;

      const minWidth = 1200;
      const minHeight = 600;

      canvasRef.current.width = Math.max(container.clientWidth, minWidth);
      canvasRef.current.height = Math.max(container.clientHeight, minHeight);

      logger.debug(`Canvas redimensionné: ${canvasRef.current.width}x${canvasRef.current.height}`);
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    if (canvasRef.current) {
      const initialX = canvasRef.current.width / 2;
      const initialY = canvasRef.current.height / 2;
      playerPosition.setInitialPosition(initialX, initialY);
    }

    logger.debug("Démarrage de la boucle d'animation du canvas");
    animationFrameRef.current = requestAnimationFrame(() => {
      canvasRenderer.animate(gameData.gameState.isActive, gameData);
    });

    return (): void => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [canvasRenderer, gameData, playerPosition]);

  // Monitor pattern changes
  useEffect(() => {
    if (isNotEmpty(gameData.patterns)) {
      logger.debug(
        `GameVisualizer: patterns mis à jour, ${gameData.patterns.length} patterns disponibles`
      );
      logger.debug('Premier pattern:', gameData.patterns[0]);
    } else {
      logger.debug('GameVisualizer: aucun pattern disponible dans gameData.patterns');
    }
  }, [gameData.patterns]);

  // Monitor game state changes
  useEffect(() => {
    logger.debug(`GameVisualizer: état du jeu mis à jour, isActive=${gameData.gameState.isActive}`);
  }, [gameData.gameState.isActive]);

  // Render instructions overlay
  const renderInstructions = (): JSX.Element | null => {
    // Don't show instructions if game is active
    if (gameData.gameState.isActive) {
      return null;
    }

    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center text-white bg-black bg-opacity-50 p-4 z-10">
        <h2 className="text-2xl mb-4 font-bold">Rhythm Wave Catcher</h2>
        <p className="mb-2">Attrapez les notes au rythme de la musique !</p>
        <ul className="mb-4 text-center">
          <li className="mb-1">
            🟣 Notes <span className="text-purple-400">violettes</span> : Points standard
          </li>
          <li className="mb-1">
            🟡 Notes <span className="text-yellow-400">dorées</span> : Points bonus
          </li>
          <li className="mb-1">
            🔵 Notes <span className="text-blue-400">bleues</span> : Boost de combo
          </li>
        </ul>
        <p className="mb-4 font-medium">Visez le timing parfait pour maximiser vos points !</p>
        <button
          onClick={handlePlayClick}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-6 rounded-full transition-colors"
        >
          Appuyez pour jouer
        </button>
      </div>
    );
  };

  // Handle play button click
  // eslint-disable-next-line react-hooks/preserve-manual-memoization
  const handlePlayClick = useCallback(() => {
    logger.debug('Bouton "Appuyez pour jouer" cliqué - Approche directe');

    // Ensure audio element is properly initialized
    if (audioElement) {
      logger.debug("État initial de l'audio avant le clic:", {
        paused: audioElement.paused,
        readyState: audioElement.readyState,
        currentTime: audioElement.currentTime,
        src: audioElement.src,
      });

      // Force preload if necessary
      if (audioElement.readyState < 2) {
        logger.debug('Audio pas encore prêt, forçage du chargement');
        audioElement.load();
      }

      // Start audio with logs to track state
      audioElement
        .play()
        .then(() => {
          logger.debug('Audio démarré avec succès depuis le clic du bouton');

          // Use startGame function directly if available
          if (gameData.startGame && typeof gameData.startGame === 'function') {
            logger.debug('Fonction startGame disponible, appel direct');
            try {
              gameData.startGame();
              logger.debug('Jeu démarré via gameData.startGame');
            } catch (e) {
              logger.error('Erreur lors du démarrage direct du jeu:', e);
              // Fallback to custom event
              window.dispatchEvent(new CustomEvent('game-force-start'));
            }
          } else {
            // If startGame is not available, use event approach
            logger.debug("Fonction startGame non disponible, utilisation de l'événement");
            window.dispatchEvent(new CustomEvent('game-start'));
          }
        })
        .catch((error) => {
          logger.error('Erreur lors du démarrage audio depuis le clic du bouton:', error);
          // Try to start game anyway
          if (gameData.startGame && typeof gameData.startGame === 'function') {
            try {
              gameData.startGame();
              logger.debug('Tentative de démarrage du jeu malgré échec audio');
            } catch (e) {
              window.dispatchEvent(new CustomEvent('game-force-start'));
            }
          } else {
            window.dispatchEvent(new CustomEvent('game-force-start'));
          }
        });
    } else {
      logger.error('Élément audio non disponible pour démarrer le jeu');
      // Even without audio, try to start game
      if (gameData.startGame && typeof gameData.startGame === 'function') {
        try {
          gameData.startGame();
          logger.debug('Démarrage du jeu sans audio via gameData.startGame');
        } catch (e) {
          window.dispatchEvent(new CustomEvent('game-force-start'));
        }
      } else {
        window.dispatchEvent(new CustomEvent('game-force-start'));
      }
    }
  }, [audioElement, gameData]);

  // Component render
  return (
    <div className="relative w-full h-full game-visualizer" style={{ minHeight: '600px' }}>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{
          background: 'rgba(0, 0, 0, 0.8)',
          border: '1px solid rgba(100, 100, 100, 0.3)',
          minWidth: '1200px',
          minHeight: '600px',
        }}
        onMouseMove={handlePointerMove}
        onTouchMove={handlePointerMove}
      />

      {renderInstructions()}

      {gameData.gameState.isActive && (
        <ScoreDisplay
          score={gameData.gameState.score}
          combo={gameData.gameState.combo}
          highScore={gameData.gameState.highScore}
          perfectHits={gameData.gameState.perfectHits}
          goodHits={gameData.gameState.goodHits}
          okHits={gameData.gameState.okHits}
          totalNotes={gameData.gameState.totalNotes}
        />
      )}

      <ParticleSystem particles={particles} setParticles={setParticles} />
    </div>
  );
};

export default GameVisualizer;
