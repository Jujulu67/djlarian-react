import { useCallback } from 'react';

import { logger } from '@/lib/logger';
import type { GameState, GamePattern } from '@/types/game';

import { SCORE_INCREMENT } from './constants';

interface UseScoreManagerProps {
  gameState: GameState;
  setGameState: React.Dispatch<React.SetStateAction<GameState>>;
  setPatterns: React.Dispatch<React.SetStateAction<GamePattern[]>>;
  isActive: React.MutableRefObject<boolean>;
  animationFrame: React.MutableRefObject<number | undefined>;
  endGame: () => void;
}

export function useScoreManager({
  gameState,
  setGameState,
  setPatterns,
  isActive,
  animationFrame,
  endGame,
}: UseScoreManagerProps) {
  const calculateHitAccuracy = useCallback(
    (
      pattern: GamePattern,
      now: number
    ): { type: 'perfect' | 'good' | 'ok' | 'miss'; points: number } => {
      if (!pattern.targetTime) return { type: 'ok', points: SCORE_INCREMENT };

      const timeDiff = Math.abs(now - pattern.targetTime);

      if (timeDiff < 100) {
        return { type: 'perfect', points: SCORE_INCREMENT * 2 };
      } else if (timeDiff < 250) {
        return { type: 'good', points: SCORE_INCREMENT * 1.5 };
      } else {
        return { type: 'ok', points: SCORE_INCREMENT };
      }
    },
    []
  );

  const playHitSound = useCallback(
    (type: GamePattern['type'], accuracyType: 'perfect' | 'good' | 'ok' | 'miss') => {
      try {
        if (typeof window !== 'undefined' && window.AudioContext) {
          const audioCtx = new AudioContext();
          const oscillator = audioCtx.createOscillator();
          const gainNode = audioCtx.createGain();

          switch (type) {
            case 'golden':
              oscillator.type = 'sine';
              oscillator.frequency.setValueAtTime(880, audioCtx.currentTime);
              oscillator.frequency.exponentialRampToValueAtTime(440, audioCtx.currentTime + 0.2);
              gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime);
              gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
              break;
            case 'blue':
              oscillator.type = 'sine';
              oscillator.frequency.setValueAtTime(784, audioCtx.currentTime);
              gainNode.gain.setValueAtTime(0.15, audioCtx.currentTime);
              gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
              break;
            case 'collect':
              oscillator.type = 'sine';
              oscillator.frequency.setValueAtTime(659.25, audioCtx.currentTime);
              gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
              gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
              break;
          }

          if (accuracyType === 'perfect') {
            const perfectOsc = audioCtx.createOscillator();
            perfectOsc.type = 'sine';
            perfectOsc.frequency.setValueAtTime(
              oscillator.frequency.value * 1.5,
              audioCtx.currentTime
            );
            perfectOsc.connect(gainNode);
            perfectOsc.start();
            perfectOsc.stop(audioCtx.currentTime + 0.15);
          }

          oscillator.connect(gainNode);
          gainNode.connect(audioCtx.destination);

          oscillator.start();
          oscillator.stop(audioCtx.currentTime + (type === 'golden' ? 0.3 : 0.2));

          setTimeout(() => audioCtx.close(), type === 'golden' ? 300 : 200);
        }
      } catch (error) {
        logger.warn('Erreur lors de la lecture du son:', error);
      }
    },
    []
  );

  const handleCollision = useCallback(
    (type: GamePattern['type'], pattern: GamePattern) => {
      if (!gameState.isActive) return;

      const now = Date.now();
      const { type: accuracyType, points } = calculateHitAccuracy(pattern, now);

      // Mettre à jour les statistiques de précision
      setGameState((prev) => {
        const newState = { ...prev };

        switch (accuracyType) {
          case 'perfect':
            newState.perfectHits++;
            break;
          case 'good':
            newState.goodHits++;
            break;
          case 'ok':
            newState.okHits++;
            break;
        }

        return newState;
      });

      // Jouer un son
      playHitSound(type, accuracyType);

      // Marquer le pattern pour décomposition
      setPatterns((prevPatterns) =>
        prevPatterns.map((p) => {
          if (p.timestamp === pattern.timestamp) {
            return {
              ...p,
              isDisintegrating: true,
              disintegrateStartTime: now,
              disintegrateDuration: type === 'golden' ? 800 : 500,
              accuracyType,
            };
          }
          return p;
        })
      );

      // Mettre à jour le score en fonction du type de note
      switch (type) {
        case 'collect':
          setGameState((prev) => {
            const newScore = prev.score + points;
            const newCombo = prev.combo + 1;
            const newHighScore = Math.max(newScore, prev.highScore);

            if (newHighScore > prev.highScore && typeof window !== 'undefined') {
              localStorage.setItem('highScore', newHighScore.toString());
            }

            return {
              ...prev,
              score: newScore,
              combo: newCombo,
              highScore: newHighScore,
              lastHitAccuracy: accuracyType,
              lastHitPoints: points,
            };
          });
          break;

        case 'golden':
          setGameState((prev) => {
            const newScore = prev.score + points * 1.5;
            const newCombo = prev.combo + 2;
            const newHighScore = Math.max(newScore, prev.highScore);

            if (newHighScore > prev.highScore && typeof window !== 'undefined') {
              localStorage.setItem('highScore', newHighScore.toString());
            }

            return {
              ...prev,
              score: newScore,
              combo: newCombo,
              highScore: newHighScore,
              lastHitAccuracy: accuracyType,
              lastHitPoints: points * 1.5,
            };
          });
          break;

        case 'blue':
          setGameState((prev) => {
            const newScore = prev.score + points;
            const newCombo = prev.combo + 3;
            const newHighScore = Math.max(newScore, prev.highScore);

            if (newHighScore > prev.highScore && typeof window !== 'undefined') {
              localStorage.setItem('highScore', newHighScore.toString());
            }

            return {
              ...prev,
              score: newScore,
              combo: newCombo,
              highScore: newHighScore,
              lastHitAccuracy: accuracyType,
              lastHitPoints: points,
            };
          });
          break;

        case 'avoid':
        case 'enemy':
          if (gameState.score > gameState.highScore && typeof window !== 'undefined') {
            localStorage.setItem('highScore', gameState.score.toString());
            setGameState((prev) => ({
              ...prev,
              highScore: gameState.score,
            }));
          }
          isActive.current = false;
          setGameState((prev) => ({
            ...prev,
            isActive: false,
          }));
          if (animationFrame.current) {
            cancelAnimationFrame(animationFrame.current);
            animationFrame.current = undefined;
          }
          break;
      }
    },
    [
      gameState.isActive,
      gameState.score,
      gameState.highScore,
      calculateHitAccuracy,
      playHitSound,
      setGameState,
      setPatterns,
      isActive,
      animationFrame,
    ]
  );

  return {
    calculateHitAccuracy,
    handleCollision,
  };
}
