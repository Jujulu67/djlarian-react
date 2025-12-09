'use client';

import { motion, AnimatePresence } from 'framer-motion';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom';

import { logger } from '@/lib/logger';
import { useGameStats } from '@/hooks/useGameStats';

import GameCanvas from './GameCanvas';
import {
  initializeGame,
  updateGame,
  handleCollision as processCollision,
  checkCollisions,
  Point,
  GameState,
  HitQuality,
  detectBPM,
  GameMode,
  PowerUpType,
} from './gameEngine';
import ScorePanel from './ScorePanel';
import styles from './styles.module.css';
import { Play, Pause, RefreshCw, Menu, Heart } from 'lucide-react';

interface RhythmCatcherProps {
  audioSrc?: string;
  onClose?: () => void;
}

const RhythmCatcher: React.FC<RhythmCatcherProps> = ({ audioSrc, onClose }) => {
  // Hook pour sauvegarder le highscore
  const { saveHighScore } = useGameStats();

  // Détecter si on est sur mobile
  const [isMobile, setIsMobile] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Bloquer le scroll du body quand la modale est ouverte sur mobile
  useEffect(() => {
    if (isMobile && typeof window !== 'undefined') {
      const { scrollY } = window;
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.style.paddingRight = `${scrollbarWidth}px`;

      return () => {
        document.body.style.overflow = '';
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        document.body.style.paddingRight = '';
        window.scrollTo(0, scrollY);
      };
    }
  }, [isMobile]);

  // État du jeu
  const [gameState, setGameState] = useState<GameState>(() => initializeGame(800, 600));

  // Charger le highscore sauvegardé au mount
  useEffect(() => {
    // Charge depuis localStorage immédiatement
    if (typeof window !== 'undefined') {
      const savedHighScore = parseInt(localStorage.getItem('highScore') || '0', 10);
      if (savedHighScore > 0) {
        setGameState((prev) => ({
          ...prev,
          player: { ...prev.player, highScore: savedHighScore },
        }));
      }
    }

    // Charge depuis API si authentifié (async)
    const loadFromAPI = async () => {
      try {
        const response = await fetch('/api/user/game-stats');
        if (response.ok) {
          const { data } = await response.json();
          if (data?.gameHighScore && data.gameHighScore > 0) {
            setGameState((prev) => ({
              ...prev,
              player: {
                ...prev.player,
                highScore: Math.max(prev.player.highScore, data.gameHighScore),
              },
            }));
          }
        }
      } catch (error) {
        // Silently ignore API errors, localStorage is the fallback
      }
    };
    loadFromAPI();
  }, []);

  // État de l'audio
  const [isAudioLoaded, setIsAudioLoaded] = useState(false);
  const [isAudioActive, setIsAudioActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioSourceRef = useRef<MediaElementAudioSourceNode | null>(null);

  // Référence de la frame d'animation
  const animationFrameRef = useRef<number | null>(null);
  const lastUpdateTimeRef = useRef<number>(Date.now());

  // Track cursor position efficiently
  const cursorPositionRef = useRef<Point | null>(null);

  // Désactive le CustomCursor global quand le jeu est actif
  useEffect(() => {
    if (gameState.isActive) {
      document.documentElement.classList.add('rhythm-catcher-active');
    } else {
      document.documentElement.classList.remove('rhythm-catcher-active');
    }

    return () => {
      document.documentElement.classList.remove('rhythm-catcher-active');
    };
  }, [gameState.isActive]);

  // Configuration initiale de l'audio
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let audio: HTMLAudioElement;
    if (audioSrc) {
      if (audioRef.current) {
        audio = audioRef.current;
      } else {
        audio = new Audio(audioSrc);
        audio.crossOrigin = 'anonymous';
        audio.preload = 'auto';
        audio.load();
      }
    } else {
      audio = new Audio('/audio/easter-egg.mp3');
      audio.crossOrigin = 'anonymous';
      audio.preload = 'auto';
      audio.load();
    }

    audioRef.current = audio;
    audio.loop = true; // Loop audio

    // Safety fallback for looping
    audio.onended = () => {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(console.error);
      }
    };

    const setupAudio = () => {
      setIsAudioLoaded(true);

      try {
        const AudioContextClass =
          window.AudioContext ||
          (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!AudioContextClass) {
          throw new Error('AudioContext not supported');
        }

        if (!audioContextRef.current) {
          const audioContext = new AudioContextClass();
          const analyser = audioContext.createAnalyser();

          analyser.fftSize = 2048;
          analyser.smoothingTimeConstant = 0.8;

          // Check if source already exists to avoid errors
          if (!audioSourceRef.current) {
            const source = audioContext.createMediaElementSource(audio);
            source.connect(analyser);
            analyser.connect(audioContext.destination);
            audioSourceRef.current = source;
          }

          audioContextRef.current = audioContext;
          analyserRef.current = analyser;

          const frequencyData = new Uint8Array(analyser.frequencyBinCount);

          setGameState((prev) => ({
            ...prev,
            audioContext,
            analyser,
            frequencyData,
          }));
        }
      } catch (error) {
        logger.error("Erreur lors de l'initialisation de l'audio:", error);
      }
    };

    if (audio.readyState >= 2) {
      setupAudio();
    } else {
      audio.addEventListener('canplaythrough', setupAudio, { once: true });
    }

    return () => {
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.suspend();
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, [audioSrc]);

  const toggleMute = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.muted = !audio.muted;
    setIsMuted(audio.muted);
  }, []);

  const startGameWithMode = (mode: GameMode) => {
    const canvas = document.querySelector('canvas');
    setGameState(initializeGame(canvas?.width || 800, canvas?.height || 600, mode));
    setHasStarted(true);
    togglePause(true); // Force play
  };

  const resetGame = () => {
    // Keep high score
    const oldHighScore = gameState.player.highScore;
    const mode = gameState.mode;
    const canvas = document.querySelector('canvas');
    const newState = initializeGame(canvas?.width || 800, canvas?.height || 600, mode);
    newState.player.highScore = oldHighScore;

    setGameState(newState);
    setHasStarted(true);
    togglePause(true);
  };

  const returnToMenu = () => {
    setHasStarted(false);
    togglePause(false); // Force pause
  };

  const togglePause = useCallback(
    (forceState?: boolean) => {
      const audio = audioRef.current;
      if (!audio || !isAudioLoaded) return;

      setGameState((prev) => {
        const shouldPlay = forceState !== undefined ? forceState : !prev.isActive;

        if (shouldPlay) {
          audioContextRef.current?.resume();
          audio.play().catch(console.error);
          setIsAudioActive(true);
          setTimeout(() => {
            setGameState((p) => ({ ...p, isActive: true }));
          }, 100);
          return prev;
        } else {
          audio.pause();
          setIsAudioActive(false);
          return { ...prev, isActive: false };
        }
      });
    },
    [isAudioLoaded]
  );

  // Refs for collision handling
  const processingRef = useRef(false);
  const pendingHitEffectRef = useRef<{
    position: Point;
    quality: HitQuality;
    radius: number;
    color: string;
    type?: PowerUpType;
  } | null>(null);

  const handleCollision = useCallback((position: Point, time: number, actualPosition?: Point) => {
    if (processingRef.current) return;
    processingRef.current = true; // Simple debounce per frame/call

    setGameState((prev) => {
      if (!prev.isActive || prev.isGameOver) {
        processingRef.current = false;
        return prev;
      }

      const result = checkCollisions(prev, position, time);
      const newState = processCollision(prev, result);

      // Visual effects setup
      if (result.collided && (result.patternPosition || result.powerUpType)) {
        pendingHitEffectRef.current = {
          position: result.patternPosition || position,
          quality: result.quality || 'OK',
          radius: result.patternRadius || 30,
          color: result.patternColor || '#fff',
          type: result.powerUpType, // Store type specifically
        };
      }

      setTimeout(() => {
        processingRef.current = false;
      }, 0);
      return newState;
    });

    // Trigger visual effect ref
    setTimeout(() => {
      if (pendingHitEffectRef.current && hitEffectRef.current) {
        const typeToPass = pendingHitEffectRef.current.type;
        // If type is not defined in collision result (e.g regular hit), it remains undefined, which is fine.
        // But for FIREBALL explicit check we want passing.

        hitEffectRef.current(
          pendingHitEffectRef.current.position,
          pendingHitEffectRef.current.quality,
          pendingHitEffectRef.current.radius,
          pendingHitEffectRef.current.color,
          typeToPass
        );
        pendingHitEffectRef.current = null;
      }
    }, 0);
  }, []);

  // Main Loop
  useEffect(() => {
    // if (!isAudioLoaded) return; // Allow running without audio loaded for debugging? No better wait.

    const update = () => {
      const now = Date.now();
      const deltaTime = now - lastUpdateTimeRef.current;
      const canvas = document.querySelector('canvas');
      const canvasWidth = canvas?.width || 800;
      const canvasHeight = canvas?.height || 600;

      let audioData: Float32Array | undefined;
      let frequencyData: Uint8Array | undefined;

      if (analyserRef.current) {
        const bufferLength = analyserRef.current.frequencyBinCount;
        if (!frequencyData) frequencyData = new Uint8Array(bufferLength);
        analyserRef.current.getByteFrequencyData(frequencyData as Uint8Array<ArrayBuffer>);
        audioData = new Float32Array(bufferLength);
        analyserRef.current.getFloatTimeDomainData(audioData as Float32Array<ArrayBuffer>);

        const detectedBPM = detectBPM(audioData);
        if (detectedBPM !== gameState.bpm) {
          setGameState((prev) => ({ ...prev, bpm: detectedBPM }));
        }
      }

      setGameState((prev) =>
        updateGame(
          prev,
          deltaTime,
          canvasWidth,
          canvasHeight,
          cursorPositionRef.current,
          audioData,
          frequencyData
        )
      );

      lastUpdateTimeRef.current = now;
      animationFrameRef.current = requestAnimationFrame(update);
    };

    animationFrameRef.current = requestAnimationFrame(update);
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [gameState.bpm, isAudioLoaded]); // Depend primarily on ref updates, react state updates inside loop

  const hitEffectRef = useRef<
    | ((
        position: Point,
        quality: HitQuality,
        radius?: number,
        color?: string,
        type?: PowerUpType
      ) => void)
    | null
  >(null);

  const handleClose = useCallback(() => {
    const currentScore = gameState.player.score;
    if (currentScore > 0) {
      if (typeof window !== 'undefined') {
        const saved = parseInt(localStorage.getItem('highScore') || '0', 10);
        if (currentScore > saved) localStorage.setItem('highScore', currentScore.toString());
      }
      saveHighScore(currentScore);
    }
    if (onClose) onClose();
  }, [gameState.player.score, saveHighScore, onClose]);

  // ---- SCREENS ----

  const renderMenu = () => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm text-white p-8 rounded-lg"
    >
      <h2 className="text-4xl font-bold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
        Rhythm Catcher
      </h2>
      <p className="mb-8 text-gray-300">Attrapez le rythme, évitez les fausses notes !</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-lg">
        <button
          onClick={() => startGameWithMode('FREE')}
          className="p-6 bg-blue-900/50 hover:bg-blue-800/80 border border-blue-500/50 rounded-xl transition-all hover:scale-105 flex flex-col items-center gap-2 group"
        >
          <span className="text-2xl group-hover:animate-bounce">🎵</span>
          <span className="text-xl font-bold text-blue-300">Free Mode</span>
          <span className="text-xs text-gray-400">Détente, score infini.</span>
        </button>

        <button
          onClick={() => startGameWithMode('DEATH')}
          className="p-6 bg-red-900/50 hover:bg-red-800/80 border border-red-500/50 rounded-xl transition-all hover:scale-105 flex flex-col items-center gap-2 group"
        >
          <div className="relative">
            <span className="text-2xl group-hover:animate-pulse">💀</span>
          </div>
          <span className="text-xl font-bold text-red-300">Death Mode</span>
          <span className="text-xs text-gray-400">10 Vies. Survie ultime.</span>
        </button>
      </div>

      <div className="mt-8 text-sm text-gray-500">
        <p>Astuce: Attrapez les PowerUps (🔥 🧲 ⏰) pour vous aider !</p>
      </div>
    </motion.div>
  );

  const renderGameOver = () => (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/90 text-white p-8"
    >
      <h2 className="text-5xl font-bold mb-4 text-red-500">GAME OVER</h2>
      <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700 mb-8 min-w-[300px]">
        <div className="flex justify-between mb-2">
          <span className="text-gray-400">Score</span>
          <span className="text-2xl font-bold text-yellow-400">{gameState.player.score}</span>
        </div>
        <div className="flex justify-between mb-2">
          <span className="text-gray-400">Max Combo</span>
          <span className="text-xl text-blue-400 max-w-[50px]">{gameState.player.combo}</span>
        </div>
        <div className="flex justify-between border-t border-gray-700 pt-2 mt-2">
          <span className="text-gray-400">Précision</span>
          <span className="text-purple-400">
            {Math.round(
              ((gameState.player.perfectHits +
                gameState.player.goodHits +
                gameState.player.okHits) /
                Math.max(1, gameState.player.totalNotes)) *
                100
            )}
            %
          </span>
        </div>
      </div>

      <div className="flex gap-4">
        <button
          onClick={resetGame}
          className="flex items-center gap-2 px-6 py-3 bg-white text-black font-bold rounded-full hover:bg-gray-200 transition-colors"
        >
          <RefreshCw size={20} /> Rejouer
        </button>
        <button
          onClick={returnToMenu}
          className="flex items-center gap-2 px-6 py-3 bg-gray-800 text-white font-bold rounded-full hover:bg-gray-700 transition-colors"
        >
          <Menu size={20} /> Menu
        </button>
      </div>
    </motion.div>
  );

  const renderPauseOverlay = () => (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-[2px]">
      <button
        onClick={() => togglePause(true)}
        className="bg-white/10 hover:bg-white/20 p-6 rounded-full backdrop-blur-md transition-all hover:scale-110"
      >
        <Play size={48} fill="white" className="ml-2" />
      </button>
    </div>
  );

  return (
    <div className={styles.canvasWrapper + ' relative h-full w-full bg-black overflow-hidden'}>
      <ScorePanel
        player={gameState.player}
        isActive={gameState.isActive}
        mode={gameState.mode}
        activePowerUps={gameState.activePowerUps}
      />

      <GameCanvas
        gameState={gameState}
        onCollision={handleCollision}
        onHitRef={hitEffectRef}
        isAudioActive={isAudioActive}
        onStart={!hasStarted ? undefined : () => togglePause(!gameState.isActive)} // Only toggle pause on click if game started
        onCursorMove={(pos) => {
          cursorPositionRef.current = pos;
        }}
      />

      {/* Overlays */}
      {!hasStarted && renderMenu()}
      {hasStarted && gameState.isGameOver && renderGameOver()}
      {hasStarted && !gameState.isActive && !gameState.isGameOver && renderPauseOverlay()}

      {/* Floating Controls (Top Right or Bottom Right) */}
      <div className={styles.controls}>
        <button className={styles.controlButton} onClick={toggleMute}>
          {isMuted ? '🔇' : '🔊'}
        </button>
        <button
          className={styles.controlButton}
          onClick={(e) => {
            e.stopPropagation();
            togglePause();
          }}
        >
          {gameState.isActive ? <Pause size={20} /> : <Play size={20} />}
        </button>
        {onClose && (
          <button className={styles.controlButton} onClick={handleClose}>
            <Menu size={20} />
          </button>
        )}
      </div>
    </div>
  );
};

export default RhythmCatcher;
