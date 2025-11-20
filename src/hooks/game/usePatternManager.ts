import { useRef, useCallback } from 'react';
import type { GamePattern, FrequencyBand } from '@/types/game';
import { logger } from '@/lib/logger';
import {
  FREQUENCY_LANES,
  PRE_MAPPED_PATTERNS,
  SCROLL_SPEED,
  PATTERN_LIFETIME,
} from './constants';
import type { UseAudioAnalyserReturn } from './useAudioAnalyser';

import type { GameState } from '@/types/game';

interface UsePatternManagerProps {
  patterns: GamePattern[];
  setPatterns: React.Dispatch<React.SetStateAction<GamePattern[]>>;
  setGameState: React.Dispatch<React.SetStateAction<GameState>>;
  isActive: React.MutableRefObject<boolean>;
  audioAnalyser: UseAudioAnalyserReturn;
}

export function usePatternManager({
  patterns,
  setPatterns,
  setGameState,
  isActive,
  audioAnalyser,
}: UsePatternManagerProps) {
  const patternsRef = useRef<GamePattern[]>([]);
  const lastPatternTime = useRef<number>(0);
  const animationFrame = useRef<number>();

  const generatePattern = useCallback(
    (
      timestamp: number,
      audioData: Uint8Array,
      canvas: HTMLCanvasElement | { width: number; height: number },
      lane: (typeof FREQUENCY_LANES)[number]
    ): GamePattern | null => {
      let width = 0;
      let height = 0;

      if ('getBoundingClientRect' in canvas) {
        const rect = canvas.getBoundingClientRect();
        width = rect.width;
        height = rect.height;
      } else {
        width = canvas.width;
        height = canvas.height;
      }

      const freqBands = audioAnalyser.analyzeFrequencyBands(audioData);
      const bandValue = freqBands[lane.name as FrequencyBand];

      if (bandValue < 50) return null;

      let type: GamePattern['type'] = 'collect';
      let size = 20;

      switch (lane.name) {
        case 'bass':
          type = 'golden';
          size = 25;
          break;
        case 'high':
          type = 'blue';
          size = 18;
          break;
        case 'mid':
          type = 'collect';
          size = 22;
          break;
      }

      const yVariation = Math.random() * height * 0.2;
      const yPosition = height * lane.yPosition + yVariation;

      return {
        timestamp,
        type,
        position: {
          x: width,
          y: yPosition,
        },
        lane: lane.name as FrequencyBand,
        size,
        speed: SCROLL_SPEED,
        targetTime: timestamp + 2000,
        createdOnBeat: true,
      };
    },
    [audioAnalyser]
  );

  const generateObstacles = useCallback(
    (timestamp: number, audioData: Uint8Array) => {
      let canvas = document.querySelector('.game-visualizer canvas') as HTMLCanvasElement;

      if (!canvas) {
        logger.debug('Premier sélecteur de canvas échoué, essai de sélecteurs alternatifs');
        canvas = document.querySelector('.music-visualizer canvas, canvas') as HTMLCanvasElement;
      }

      if (!canvas) {
        logger.warn(
          'Canvas non trouvé pour la génération des patterns, utilisant des dimensions par défaut'
        );
        const rect = { width: 800, height: 400 };

        setPatterns((prev) => {
          const newPattern: GamePattern = {
            timestamp,
            type: 'collect',
            position: {
              x: rect.width,
              y: rect.height * 0.5,
            },
            lane: 'mid',
            size: 20,
            speed: SCROLL_SPEED,
            targetTime: timestamp + 2000,
          };

          return [...prev, newPattern];
        });

        lastPatternTime.current = timestamp;
        return;
      }

      const isBeat = audioAnalyser.detectBeat(timestamp, audioData);

      if (isBeat) {
        logger.debug(
          `Beat détecté! BPM estimé: ${audioAnalyser.bpm.current.toFixed(1)}, Confiance: ${(audioAnalyser.beatConfidence.current * 100).toFixed(1)}%`
        );

        const newPatterns: GamePattern[] = [];

        FREQUENCY_LANES.forEach((lane) => {
          const pattern = generatePattern(timestamp, audioData, canvas, lane);
          if (pattern) newPatterns.push(pattern);
        });

        if (newPatterns.length > 0) {
          setPatterns((prev) => [...prev, ...newPatterns]);

          setGameState((prev) => ({
            ...prev,
            totalNotes: (prev.totalNotes || 0) + newPatterns.length,
          }));

          lastPatternTime.current = timestamp;
        }
      } else if (timestamp - lastPatternTime.current > 1000) {
        const freqBands = audioAnalyser.analyzeFrequencyBands(audioData);
        const maxBand = Object.entries(freqBands).reduce(
          (max, [band, value]) => (value > max.value ? { band, value } : max),
          { band: '', value: 0 }
        );

        if (maxBand.value > 100) {
          const lane = FREQUENCY_LANES.find((l) => l.name === maxBand.band);
          if (lane) {
            const pattern = generatePattern(timestamp, audioData, canvas, lane);
            if (pattern) {
              setPatterns((prev) => [...prev, pattern]);
              lastPatternTime.current = timestamp;
            }
          }
        }
      }
    },
    [audioAnalyser, generatePattern, setPatterns, setGameState]
  );

  const updatePatterns = useCallback(
    (now: number) => {
      setPatterns((prev) => {
        if (!isActive.current) return prev;

        return prev
          .map((pattern) => {
            if (pattern.isDisintegrating) {
              return pattern;
            }

            if (now - pattern.timestamp > PATTERN_LIFETIME) {
              return null as unknown as GamePattern;
            }

            return {
              ...pattern,
              position: {
                x: pattern.position.x - (pattern.speed || SCROLL_SPEED),
                y: pattern.position.y,
              },
            };
          })
          .filter((pattern): pattern is GamePattern => pattern !== null);
      });

      setPatterns((prev) => {
        return prev.filter((pattern) => {
          if (pattern.isDisintegrating) {
            const disintegrateAge = now - (pattern.disintegrateStartTime || now);
            return disintegrateAge < (pattern.disintegrateDuration || 500);
          }

          return pattern.position.x > -50;
        });
      });
    },
    [isActive, setPatterns]
  );

  const createPreMappedPatterns = useCallback((now: number) => {
    return PRE_MAPPED_PATTERNS.map((pattern, index) => {
      const x = Math.min(pattern.x, 800);
      const timestamp = now + pattern.time;
      const targetTime = timestamp + (pattern.speed ? 5000 / pattern.speed : 5000);

      return {
        id: `pattern-${timestamp}-${index}`,
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
  }, []);

  return {
    patternsRef,
    generateObstacles,
    updatePatterns,
    createPreMappedPatterns,
    animationFrame,
  };
}

