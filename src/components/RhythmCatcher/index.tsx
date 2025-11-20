'use client';

import { motion, AnimatePresence } from 'framer-motion';
import React, { useState, useEffect, useRef, useCallback } from 'react';

import { logger } from '@/lib/logger';

import GameCanvas from './GameCanvas';
import {
  initializeGame,
  updateGame,
  handleCollision as processCollision,
  checkCollisions,
  Point,
  GameState,
  CollisionResult,
  detectBPM,
} from './gameEngine';
import ScorePanel from './ScorePanel';
import styles from './styles.module.css';

interface RhythmCatcherProps {
  audioSrc?: string;
  onClose?: () => void;
}

const RhythmCatcher: React.FC<RhythmCatcherProps> = ({ audioSrc, onClose }) => {
  // État du jeu
  const [gameState, setGameState] = useState<GameState>(() => initializeGame(800, 600));

  // État de l'audio
  const [isAudioLoaded, setIsAudioLoaded] = useState(false);
  const [isAudioActive, setIsAudioActive] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioSourceRef = useRef<MediaElementAudioSourceNode | null>(null);

  // Référence de la frame d'animation
  const animationFrameRef = useRef<number | null>(null);
  const lastUpdateTimeRef = useRef<number>(Date.now());

  // Configuration initiale de l'audio
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Utiliser l'audio existant s'il est fourni en prop, sinon en créer un nouveau
    let audio: HTMLAudioElement;
    if (audioSrc) {
      // Utilise l'audio existant
      if (audioRef.current) {
        audio = audioRef.current;
      } else {
        // Crée un nouvel élément audio avec la source fournie
        audio = new Audio(audioSrc);
        audio.crossOrigin = 'anonymous';
        audio.preload = 'auto';
        audio.load();
      }
    } else {
      // Crée un nouvel élément audio avec le fichier Easter egg par défaut
      audio = new Audio('/audio/easter-egg.mp3');
      audio.crossOrigin = 'anonymous';
      audio.preload = 'auto';
      audio.load();
    }

    audioRef.current = audio;

    // Charge l'audio et configure l'analyseur
    const setupAudio = () => {
      setIsAudioLoaded(true);

      try {
        const AudioContextClass =
          window.AudioContext ||
          (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!AudioContextClass) {
          throw new Error('AudioContext not supported');
        }
        const audioContext = new AudioContextClass();
        const analyser = audioContext.createAnalyser();

        analyser.fftSize = 2048;
        analyser.smoothingTimeConstant = 0.8;

        const source = audioContext.createMediaElementSource(audio);
        source.connect(analyser);
        analyser.connect(audioContext.destination);

        audioContextRef.current = audioContext;
        analyserRef.current = analyser;
        audioSourceRef.current = source;

        // Configure la taille des données de fréquence
        const frequencyData = new Uint8Array(analyser.frequencyBinCount);

        // Mise à jour de l'état du jeu avec les données audio
        setGameState((prev) => ({
          ...prev,
          audioContext,
          analyser,
          frequencyData,
        }));
      } catch (error) {
        logger.error("Erreur lors de l'initialisation de l'audio:", error);
      }
    };

    if (audio.readyState >= 2) {
      // L'audio est déjà chargé et prêt
      setupAudio();
    } else {
      // Attendre le chargement de l'audio
      audio.addEventListener('canplaythrough', setupAudio, { once: true });
    }

    // Nettoyage
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current
          .close()
          .catch((err) => logger.error('Erreur lors de la fermeture de AudioContext', err));
      }

      if (audioRef.current) {
        audioRef.current.pause();
        // Ne pas réinitialiser la source si l'audio est géré par le parent
        if (!audioSrc) {
          audioRef.current.src = '';
        }
      }

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [audioSrc]);

  // Fonction d'activation/désactivation de l'audio
  const toggleAudio = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (audio.paused) {
      // Activation de l'audio et du jeu
      audioContextRef.current
        ?.resume()
        .catch((err) => logger.error('Erreur lors de la reprise de AudioContext', err));
      audio.play().catch((err) => logger.error('Erreur lors de la lecture audio', err));
      setIsAudioActive(true);

      // Attendre un court instant pour que l'audio commence avant d'activer le jeu
      setTimeout(() => {
        setGameState((prev) => ({
          ...prev,
          isActive: true,
          startTime: Date.now(),
        }));
      }, 200);
    } else {
      // Désactivation de l'audio et pause du jeu
      audio.pause();
      setIsAudioActive(false);
      setGameState((prev) => ({ ...prev, isActive: false }));
    }
  }, []);

  // Gestion des collisions
  const handleCollision = useCallback(
    (position: Point, time: number) => {
      const result = checkCollisions(gameState, position, time);

      if (result.collided) {
        // Met à jour l'état du jeu avec le résultat de la collision
        setGameState((prev) => processCollision(prev, result));
      }
    },
    [gameState]
  );

  // Boucle principale du jeu
  useEffect(() => {
    if (!isAudioLoaded) return;

    const update = () => {
      const now = Date.now();
      const deltaTime = now - lastUpdateTimeRef.current;
      const canvas = document.querySelector('canvas');
      const canvasWidth = canvas?.width || 800;
      const canvasHeight = canvas?.height || 600;

      // Mise à jour des données audio
      let audioData: Float32Array | undefined;
      let frequencyData: Uint8Array | undefined;

      if (analyserRef.current) {
        const bufferLength = analyserRef.current.frequencyBinCount;

        // Obtient les données de fréquence
        if (!frequencyData) {
          frequencyData = new Uint8Array(bufferLength);
        }
        analyserRef.current.getByteFrequencyData(frequencyData);

        // Obtient les données temporelles pour les calculs d'énergie
        audioData = new Float32Array(bufferLength);
        analyserRef.current.getFloatTimeDomainData(audioData);

        // Tente de détecter le BPM
        const detectedBPM = detectBPM(audioData);
        if (detectedBPM !== gameState.bpm) {
          setGameState((prev) => ({ ...prev, bpm: detectedBPM }));
        }
      }

      // Mise à jour de l'état du jeu
      setGameState((prev) =>
        updateGame(prev, deltaTime, canvasWidth, canvasHeight, audioData, frequencyData)
      );

      lastUpdateTimeRef.current = now;
      animationFrameRef.current = requestAnimationFrame(update);
    };

    // Démarre la boucle d'animation
    animationFrameRef.current = requestAnimationFrame(update);

    // Nettoyage
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [gameState.bpm, isAudioLoaded]);

  // Ajouter un useEffect pour démarrer automatiquement l'audio et le jeu
  useEffect(() => {
    // Démarrer automatiquement le jeu après chargement
    if (isAudioLoaded && !isAudioActive) {
      logger.debug('RhythmCatcher: démarrage automatique du jeu');
      toggleAudio();
    }
  }, [isAudioLoaded, isAudioActive, toggleAudio]);

  // Ajouter un message de débogage pour le suivi
  useEffect(() => {
    logger.debug('RhythmCatcher: état de chargement:', {
      isAudioLoaded,
      isAudioActive,
      audioRef: !!audioRef.current,
      audioContext: !!audioContextRef.current,
      hasPatterns: gameState.patterns.length,
    });
  }, [isAudioLoaded, isAudioActive, gameState.patterns.length]);

  return (
    <div className={styles.gameContainer}>
      <GameCanvas
        gameState={gameState}
        onCollision={handleCollision}
        isAudioActive={isAudioActive}
      />

      <ScorePanel player={gameState.player} isActive={gameState.isActive} />

      {/* Contrôle du volume */}
      <div className={styles.audioControls}>
        <button
          className={styles.volumeButton}
          onClick={toggleAudio}
          aria-label={isAudioActive ? 'Couper le son' : 'Activer le son'}
        >
          {isAudioActive ? (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15.536 8.464a5 5 0 010 7.072M18.364 5.636a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
              />
            </svg>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"
              />
            </svg>
          )}
        </button>
      </div>

      {/* Boutons de contrôle */}
      <div className={styles.controls}>
        {/* Bouton de fermeture/retour */}
        {onClose && (
          <button className={styles.controlButton} onClick={onClose} aria-label="Fermer le jeu">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}

        {/* Bouton de démarrage/pause du jeu */}
        <button
          className={styles.controlButton}
          onClick={toggleAudio}
          aria-label={gameState.isActive ? 'Pause' : 'Démarrer'}
        >
          {gameState.isActive ? (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
};

export default RhythmCatcher;
