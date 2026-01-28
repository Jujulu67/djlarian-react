import { useRef, useState, useCallback, useEffect } from 'react';

import { logger } from '@/lib/logger';
import { isNotEmpty } from '@/lib/utils/arrayHelpers';
import type { GameState, GamePattern } from '@/types/game';
import type { FrequencyBand } from '@/types/game';

import {
  PRE_MAPPED_PATTERNS,
  SCROLL_SPEED,
  PATTERN_LIFETIME,
  AUDIO_UPDATE_INTERVAL,
} from './game/constants';
import { useAudioAnalyser } from './game/useAudioAnalyser';
import { usePatternManager } from './game/usePatternManager';
import { useScoreManager } from './game/useScoreManager';
import { useGameStats } from './useGameStats';

export const useGameManager = (audioElement: HTMLAudioElement | null) => {
  // Hook pour synchroniser le highscore avec l'API
  const { fetchHighScore, saveHighScore, hasFetched } = useGameStats();

  const [gameState, setGameState] = useState<GameState>(() => {
    let savedHighScore = 0;
    if (typeof window !== 'undefined') {
      const savedScore = localStorage.getItem('highScore');
      if (savedScore) {
        savedHighScore = parseInt(savedScore, 10);
      }
    }

    return {
      isActive: false,
      score: 0,
      combo: 0,
      highScore: savedHighScore,
      perfectHits: 0,
      goodHits: 0,
      okHits: 0,
      totalNotes: 0,
    };
  });

  // Fetch highscore from API on mount
  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;

    fetchHighScore().then((apiHighScore) => {
      setGameState((prev) => ({
        ...prev,
        highScore: Math.max(prev.highScore, apiHighScore),
      }));
    });
  }, [fetchHighScore, hasFetched]);

  const [patterns, setPatterns] = useState<GamePattern[]>([]);
  const isActive = useRef(false);
  const animationFrame = useRef<number | null>(null);
  const gameProgress = useRef(0);
  const playerPosition = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const lastAudioUpdate = useRef(0);

  // Hooks spécialisés
  const audioAnalyser = useAudioAnalyser(audioElement);
  const patternManager = usePatternManager({
    patterns,
    setPatterns,
    setGameState,
    isActive,
    audioAnalyser,
  });
  const scoreManager = useScoreManager({
    gameState,
    setGameState,
    setPatterns,
    isActive,
    animationFrame,
    endGame: () => {
      logger.debug('Fin du jeu');
      setGameState((prev) => {
        let newHighScore = prev.highScore;
        if (prev.score > prev.highScore) {
          if (typeof window !== 'undefined') {
            localStorage.setItem('highScore', prev.score.toString());
          }
          // Save to API
          saveHighScore(prev.score);
          newHighScore = prev.score;
        }
        return {
          ...prev,
          isActive: false,
          highScore: newHighScore,
        };
      });
      isActive.current = false;
      if (animationFrame.current) {
        cancelAnimationFrame(animationFrame.current);
        animationFrame.current = null;
      }
    },
  });

  // Mettre à jour patternsRef
  useEffect(() => {
    patternManager.patternsRef.current = patterns;
    logger.debug(`Synchronisation de patternsRef avec patterns: ${patterns.length} patterns`);
  }, [patterns, patternManager.patternsRef]);

  // Boucle principale de mise à jour
  const updateGame = useCallback(() => {
    if (!audioAnalyser.audioAnalyser.current) {
      logger.warn('Analyseur audio non disponible');
      return;
    }

    if (!isActive.current) {
      logger.debug('Jeu non actif, arrêt de la boucle de jeu');
      if (animationFrame.current) {
        cancelAnimationFrame(animationFrame.current);
        animationFrame.current = null;
      }
      return;
    }

    try {
      const now = Date.now();
      const timeSinceLastAudioUpdate = now - lastAudioUpdate.current;

      if (timeSinceLastAudioUpdate >= AUDIO_UPDATE_INTERVAL) {
        audioAnalyser.updateAudioData();
        lastAudioUpdate.current = now;
      }

      const audioData = audioAnalyser.getAudioData();
      if (audioData) {
        patternManager.generateObstacles(now, audioData);
      }

      patternManager.updatePatterns(now);
      gameProgress.current += 1;

      animationFrame.current = requestAnimationFrame(updateGame);
    } catch (error) {
      logger.error('Erreur dans la boucle de jeu:', error);
      if (isActive.current) {
        animationFrame.current = requestAnimationFrame(updateGame);
      }
    }
  }, [audioAnalyser, patternManager]);

  // Mise à jour simple des patterns (pour l'animation de base)
  const simpleUpdateGame = useCallback((): void => {
    const now = Date.now();

    if (patterns.length === 0 && patternManager.patternsRef.current.length === 0) {
      logger.debug("Aucun pattern trouvé - Génération d'urgence");
      const emergencyPatterns = PRE_MAPPED_PATTERNS.slice(0, 15).map((pattern, index) => {
        const x = Math.min(pattern.x, 800);
        const timestamp = now + pattern.time;
        const targetTime = timestamp + (pattern.speed ? 5000 / pattern.speed : 5000);

        return {
          id: `emergency-pattern-${timestamp}-${index}`,
          timestamp,
          type: pattern.type as GamePattern['type'],
          position: { x, y: pattern.y },
          lane: pattern.lane as FrequencyBand,
          size: pattern.size || 30,
          speed: pattern.speed || 1.5,
          targetTime,
          createdOnBeat: true,
        };
      });

      setPatterns(emergencyPatterns);
      patternManager.patternsRef.current = emergencyPatterns;
      logger.debug(`${emergencyPatterns.length} patterns d'urgence générés`);

      setTimeout(() => {
        requestAnimationFrame(simpleUpdateGame);
      }, 0);
      return;
    }

    if (!isActive.current && isNotEmpty(patterns)) {
      const slowUpdatePatterns = patterns
        .map((pattern) => {
          const newX = pattern.position.x - (pattern.speed || SCROLL_SPEED) * 0.2;
          return {
            ...pattern,
            position: {
              ...pattern.position,
              x: newX,
            },
          };
        })
        .filter((pattern) => pattern.position.x > -50);

      setPatterns(slowUpdatePatterns);
      requestAnimationFrame(simpleUpdateGame);
      return;
    }

    if (!isActive.current) return;

    if (patterns.length === 0) {
      logger.debug('Tentative de régénération des patterns depuis simpleUpdateGame');
      const emergencyPatterns = patternManager.createPreMappedPatterns(now);
      setPatterns(emergencyPatterns);
      patternManager.patternsRef.current = emergencyPatterns;
      logger.debug(`${emergencyPatterns.length} patterns d'urgence générés`);
    }

    const updatedPatterns = patterns
      .map((pattern) => {
        const newX = pattern.position.x - (pattern.speed || SCROLL_SPEED);
        return {
          ...pattern,
          position: {
            ...pattern.position,
            x: newX,
          },
        };
      })
      .filter((pattern) => pattern.position.x > -50);

    setPatterns(updatedPatterns);

    if (updatedPatterns.length < 5 && isActive.current) {
      logger.debug('Peu de patterns restants, génération de patterns supplémentaires');
      const additionalPatterns = PRE_MAPPED_PATTERNS.slice(0, 5).map((pattern, index) => {
        const x = 1100;
        const timestamp = now + pattern.time + 3000;
        const targetTime = timestamp + (pattern.speed ? 5000 / pattern.speed : 5000);

        return {
          id: `additional-pattern-${timestamp}-${index}`,
          timestamp,
          type: pattern.type as GamePattern['type'],
          position: { x, y: pattern.y },
          lane: pattern.lane as FrequencyBand,
          size: pattern.size || 30,
          speed: pattern.speed || 1.5,
          targetTime,
          createdOnBeat: true,
        };
      });

      setPatterns((prev) => [...prev, ...additionalPatterns]);
    }

    if (isActive.current) {
      patternManager.animationFrame.current = requestAnimationFrame(simpleUpdateGame);
    } else if (isNotEmpty(updatedPatterns)) {
      requestAnimationFrame(simpleUpdateGame);
    }
  }, [patterns, setPatterns, patternManager, isActive]);

  // Initialiser les patterns au chargement
  useEffect(() => {
    if (patterns.length === 0 && !isActive.current) {
      logger.debug('Initialisation proactive des patterns au chargement');
      const now = Date.now();
      const initialPatterns = patternManager.createPreMappedPatterns(now);
      logger.debug(`${initialPatterns.length} patterns initiaux générés proactivement`);
      setPatterns(initialPatterns);
      patternManager.patternsRef.current = initialPatterns;

      requestAnimationFrame(() => {
        requestAnimationFrame(() => simpleUpdateGame());
      });
    }
  }, [patterns.length, simpleUpdateGame, patternManager]);

  // Démarrage du jeu
  const startGame = useCallback(() => {
    try {
      logger.debug('Démarrage du jeu avec patterns prémappés');

      if (animationFrame.current) {
        cancelAnimationFrame(animationFrame.current);
        animationFrame.current = null;
      }

      setGameState((prev) => ({
        ...prev,
        isActive: true,
        score: 0,
        combo: 0,
        perfectHits: 0,
        goodHits: 0,
        okHits: 0,
        totalNotes: 0,
        lastHitAccuracy: undefined,
        lastHitPoints: undefined,
      }));

      isActive.current = true;

      const now = Date.now();
      const preMappedPatterns = patternManager.createPreMappedPatterns(now);

      logger.debug(`${preMappedPatterns.length} patterns prémappés générés`);

      setPatterns(preMappedPatterns);
      patternManager.patternsRef.current = preMappedPatterns;

      logger.debug('Le jeu est actif - Vérification de la génération de patterns...');
      animationFrame.current = requestAnimationFrame(simpleUpdateGame);
    } catch (error) {
      logger.error('Erreur lors du démarrage du jeu:', error);
    }
  }, [patternManager, setGameState, setPatterns, simpleUpdateGame]);

  // Fin du jeu
  const endGame = useCallback(() => {
    logger.debug('Fin du jeu');
    setGameState((prev) => {
      let newHighScore = prev.highScore;
      if (prev.score > prev.highScore) {
        if (typeof window !== 'undefined') {
          localStorage.setItem('highScore', prev.score.toString());
        }
        // Save to API
        saveHighScore(prev.score);
        newHighScore = prev.score;
      }
      return {
        ...prev,
        isActive: false,
        highScore: newHighScore,
      };
    });

    isActive.current = false;

    if (animationFrame.current) {
      cancelAnimationFrame(animationFrame.current);
      animationFrame.current = null;
    }
  }, [setGameState, saveHighScore]);

  return {
    gameState,
    patterns,
    startGame,
    endGame,
    handleCollision: scoreManager.handleCollision,
    audioData: audioAnalyser.getAudioData(),
    setPlayerPosition: (x: number, y: number) => {
      playerPosition.current = { x, y };
    },
    currentBpm: audioAnalyser.bpm.current,
    beatConfidence: audioAnalyser.beatConfidence.current,
    simpleUpdateGame,
  };
};
