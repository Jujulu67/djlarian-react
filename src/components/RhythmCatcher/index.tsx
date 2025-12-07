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
  CollisionResult,
  HitQuality,
  detectBPM,
} from './gameEngine';
import ScorePanel from './ScorePanel';
import styles from './styles.module.css';

interface RhythmCatcherProps {
  audioSrc?: string;
  onClose?: () => void;
}

const RhythmCatcher: React.FC<RhythmCatcherProps> = ({ audioSrc, onClose }) => {
  // Hook pour sauvegarder le highscore
  const { saveHighScore, isAuthenticated } = useGameStats();

  // Détecter si on est sur mobile
  const [isMobile, setIsMobile] = useState(false);

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

  // Désactive le CustomCursor global quand le jeu est actif
  useEffect(() => {
    if (gameState.isActive) {
      // Masque le CustomCursor en ajoutant une classe qui le cache
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

  // Fonction pour contrôler seulement le volume (mute/unmute) - ne change pas l'état du jeu
  const toggleMute = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) {
      logger.error('toggleMute: audio is null');
      return;
    }

    // Inverse l'état mute sans changer l'état de pause/play
    // Ne touche PAS à isAudioActive ni à gameState.isActive
    logger.debug('toggleMute:', { wasMuted: audio.muted, isActive: gameState.isActive });
    audio.muted = !audio.muted;
    setIsMuted(audio.muted);
    // isAudioActive reste inchangé - il reflète si l'audio est en lecture, pas s'il est muet
  }, [gameState.isActive]);

  // Fonction d'activation/désactivation de l'audio et du jeu (pause/play)
  const togglePause = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) {
      logger.error('togglePause: audio is null');
      return;
    }

    // Vérifier que l'audio est chargé avant de démarrer
    if (!isAudioLoaded) {
      logger.debug('togglePause: audio not loaded yet');
      return;
    }

    // Utilise l'état React pour déterminer si on doit play ou pause
    // Plus fiable que audio.paused qui peut être désynchronisé
    setGameState((prev) => {
      const shouldPlay = !prev.isActive;

      if (shouldPlay) {
        // Activation de l'audio et du jeu
        logger.debug('togglePause: playing audio');
        audioContextRef.current
          ?.resume()
          .catch((err) => logger.error('Erreur lors de la reprise de AudioContext', err));
        audio.muted = false; // S'assurer que l'audio n'est pas muet quand on reprend
        setIsMuted(false);
        audio.play().catch((err) => logger.error('Erreur lors de la lecture audio', err));
        setIsAudioActive(true);

        // Attendre un court instant pour que l'audio commence avant d'activer le jeu
        setTimeout(() => {
          setGameState((prevState) => ({
            ...prevState,
            isActive: true,
            startTime: Date.now(),
          }));
        }, 200);

        return prev; // Retourne l'état actuel, sera mis à jour par le setTimeout
      } else {
        // Désactivation de l'audio et pause du jeu
        logger.debug('togglePause: pausing audio');
        audio.pause();
        setIsAudioActive(false);
        return {
          ...prev,
          isActive: false,
        };
      }
    });
  }, [isAudioLoaded]);

  // Ref pour éviter les appels dupliqués
  const lastCollisionTimeRef = useRef<number>(0);
  const lastCollisionPositionRef = useRef<Point | null>(null);
  const processingRef = useRef(false);
  const lastPatternIdRef = useRef<string | null>(null);
  const processingPatternsRef = useRef<Set<string>>(new Set()); // Patterns en cours de traitement
  const currentClickPatternIdRef = useRef<string | null>(null); // Pattern traité dans l'appel actuel
  const pendingHitEffectRef = useRef<{
    position: Point;
    quality: HitQuality;
    radius: number;
    color: string;
  } | null>(null);

  // Gestion des collisions - utilise une fonction ref pour éviter les blocages
  const handleCollision = useCallback(
    (position: Point, time: number, actualPosition?: Point) => {
      // Évite les appels dupliqués (même position et temps très proche)
      const timeDiff = time - lastCollisionTimeRef.current;
      const positionDiff = lastCollisionPositionRef.current
        ? Math.sqrt(
            Math.pow(lastCollisionPositionRef.current.x - position.x, 2) +
              Math.pow(lastCollisionPositionRef.current.y - position.y, 2)
          )
        : Infinity;

      // Ignore les appels dupliqués (même clic déclenché plusieurs fois)
      if (
        timeDiff < 50 && // Moins de 50ms d'écart (très strict pour éviter les doubles clics)
        positionDiff < 10 // Moins de 10px de différence (même position)
      ) {
        return; // Ignore les appels dupliqués du même clic
      }

      // Évite les appels simultanés - UN SEUL pattern par appel à handleCollision
      if (processingRef.current) {
        return;
      }

      processingRef.current = true;
      lastCollisionTimeRef.current = time;
      lastCollisionPositionRef.current = position;
      currentClickPatternIdRef.current = null; // Réinitialise pour ce clic

      // Réinitialise les données d'animation en attente
      pendingHitEffectRef.current = null;

      // Vérifie les collisions dans setGameState pour avoir l'état le plus récent
      setGameState((prev) => {
        // IMPORTANT: Si un pattern a déjà été traité dans cet appel, ne pas en traiter un autre
        // Cela garantit qu'un seul pattern est traité par appel à handleCollision
        if (currentClickPatternIdRef.current) {
          return prev;
        }

        const result = checkCollisions(prev, position, time, processingPatternsRef.current);

        // Si aucun pattern n'est détecté, c'est un miss (clic à côté)
        if (!result.collided || !result.quality || !result.patternId) {
          // IMPORTANT: Vérifie si un miss a déjà été compté dans cet appel pour éviter les doubles comptages
          if (currentClickPatternIdRef.current === 'MISS') {
            setTimeout(() => {
              processingRef.current = false;
              currentClickPatternIdRef.current = null;
            }, 0);
            return prev;
          }

          // Compte comme un miss si le jeu est actif
          if (prev.isActive) {
            // Marque qu'un miss a été traité dans cet appel
            currentClickPatternIdRef.current = 'MISS';

            const newState = { ...prev };
            newState.player.missHits++;
            newState.player.combo = 0; // Reset combo sur un miss
            setTimeout(() => {
              processingRef.current = false;
              currentClickPatternIdRef.current = null;
            }, 0);
            return newState;
          }
          setTimeout(() => {
            processingRef.current = false;
            currentClickPatternIdRef.current = null;
          }, 0);
          return prev;
        }

        // IMPORTANT: Vérifie si ce pattern est déjà en cours de traitement
        // Cela empêche les appels multiples de setGameState de traiter le même pattern
        if (processingPatternsRef.current.has(result.patternId)) {
          return prev;
        }

        // Vérifie que le pattern n'a pas déjà été frappé dans l'état actuel
        const patternAlreadyHit = prev.patterns.find(
          (p) => p.id === result.patternId && (p.wasHit || !p.active)
        );
        if (patternAlreadyHit) {
          return prev;
        }

        // IMPORTANT: Marque le pattern comme traité dans cet appel
        currentClickPatternIdRef.current = result.patternId;
        processingPatternsRef.current.add(result.patternId);
        lastPatternIdRef.current = result.patternId;

        // Trouve le pattern frappé pour obtenir sa position et sa taille réelles
        const hitPattern = prev.patterns.find((p) => p.id === result.patternId);

        // Stocke les données pour l'effet visuel
        pendingHitEffectRef.current = {
          position:
            result.patternPosition ||
            (hitPattern ? hitPattern.position : actualPosition || position),
          quality: result.quality,
          radius:
            result.patternRadius ||
            (hitPattern ? hitPattern.radius * hitPattern.scale : prev.player.radius),
          color: result.patternColor || (hitPattern ? hitPattern.color : '#ffffff'),
        };

        // Traite la collision
        const newState = processCollision(prev, result);

        // Retire le pattern du Set après traitement (dans un setTimeout pour éviter les appels multiples)
        setTimeout(() => {
          if (result.patternId) {
            processingPatternsRef.current.delete(result.patternId);
            if (lastPatternIdRef.current === result.patternId) {
              lastPatternIdRef.current = null;
            }
          }
          // Réinitialise processingRef seulement si aucun pattern n'est en cours de traitement
          if (processingPatternsRef.current.size === 0) {
            processingRef.current = false;
            currentClickPatternIdRef.current = null;
          }
        }, 100);

        return newState;
      });

      // Déclenche l'effet visuel APRÈS le setState pour éviter l'erreur React
      // Utilise le ref pour récupérer les données d'animation (persistantes même si setGameState est appelé plusieurs fois)
      // Utilise setTimeout pour s'assurer que le ref est bien mis à jour après setGameState
      setTimeout(() => {
        const hitEffectData = pendingHitEffectRef.current;

        logger.debug('[ANIMATION] Vérification après setGameState (avec setTimeout)', {
          hasHitEffectData: !!hitEffectData,
          hasRef: !!hitEffectRef.current,
          hitEffectData: hitEffectData
            ? { position: hitEffectData.position, quality: hitEffectData.quality }
            : null,
        });

        if (hitEffectData) {
          logger.debug("[ANIMATION] Déclenchement de l'animation", {
            position: hitEffectData.position,
            quality: hitEffectData.quality,
            hasRef: !!hitEffectRef.current,
          });

          // Utilise double requestAnimationFrame pour s'assurer que c'est après le rendu
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              if (hitEffectRef.current && hitEffectData) {
                hitEffectRef.current(
                  hitEffectData.position,
                  hitEffectData.quality,
                  hitEffectData.radius,
                  hitEffectData.color
                );
                logger.debug('[ANIMATION] Effet visuel appliqué sur le canvas', {
                  position: hitEffectData.position,
                  quality: hitEffectData.quality,
                  radius: hitEffectData.radius,
                });
                // Nettoie le ref après utilisation
                pendingHitEffectRef.current = null;
              } else {
                logger.debug('[ANIMATION] ÉCHEC: hitEffectRef.current est null', {
                  hasRef: !!hitEffectRef.current,
                  hasData: !!hitEffectData,
                });
              }
            });
          });
        } else {
          logger.debug("[ANIMATION] ÉCHEC: Aucune donnée d'animation disponible", {
            hasHitEffectData: !!hitEffectData,
          });
        }

        // Réinitialise le flag de traitement APRÈS que setGameState ait terminé
        // Utilise setTimeout pour s'assurer que le setState est complètement terminé
        // avant de permettre le prochain traitement
        // IMPORTANT: Ne réinitialise PAS processingRef ici, il sera réinitialisé après le traitement complet
      }, 0);

      // IMPORTANT: Ne réinitialise PAS processingRef ici
      // Il sera réinitialisé dans le setTimeout du traitement de collision
      // pour s'assurer qu'un seul pattern est traité par clic
    },
    [] // Pas de dépendances pour éviter les re-créations
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
        analyserRef.current.getByteFrequencyData(frequencyData as Uint8Array<ArrayBuffer>);

        // Obtient les données temporelles pour les calculs d'énergie
        audioData = new Float32Array(bufferLength);
        analyserRef.current.getFloatTimeDomainData(audioData as Float32Array<ArrayBuffer>);

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

  // Le jeu démarre en pause pour afficher les règles
  // L'utilisateur doit cliquer sur l'écran pour démarrer

  // Ref pour déclencher l'effet visuel dans GameCanvas
  const hitEffectRef = useRef<
    ((position: Point, quality: HitQuality, radius?: number, color?: string) => void) | null
  >(null);

  // Fonction pour fermer le jeu en sauvegardant le score
  const handleClose = useCallback(() => {
    // Sauvegarder le highscore avant de fermer
    const currentScore = gameState.player.score;
    if (currentScore > 0) {
      // Sauvegarde en localStorage (fallback)
      if (typeof window !== 'undefined') {
        const savedHighScore = parseInt(localStorage.getItem('highScore') || '0', 10);
        if (currentScore > savedHighScore) {
          localStorage.setItem('highScore', currentScore.toString());
        }
      }
      // Sauvegarde via API si authentifié
      saveHighScore(currentScore);
    }

    // Appeler la fonction de fermeture originale
    if (onClose) {
      onClose();
    }
  }, [gameState.player.score, saveHighScore, onClose]);

  // Contenu du jeu (réutilisable pour mobile)
  const gameContent = (
    <div className={styles.canvasWrapper}>
      <GameCanvas
        gameState={gameState}
        onCollision={handleCollision}
        onHitRef={hitEffectRef}
        isAudioActive={isAudioActive}
        onStart={togglePause}
      />
    </div>
  );

  // Contenu desktop avec overlays
  const desktopContent = (
    <>
      <div className={styles.canvasWrapper}>
        <GameCanvas
          gameState={gameState}
          onCollision={handleCollision}
          onHitRef={hitEffectRef}
          isAudioActive={isAudioActive}
          onStart={togglePause}
        />

        {/* Éléments overlay pour desktop uniquement */}
        <div className={styles.desktopOverlay}>
          <ScorePanel player={gameState.player} isActive={gameState.isActive} />

          {/* Boutons de contrôle - Desktop uniquement */}
          <div className={styles.controls}>
            {/* Bouton audio/volume */}
            <button
              className={styles.controlButton}
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                toggleMute();
              }}
              aria-label={!isMuted ? 'Couper le son' : 'Activer le son'}
            >
              {!isMuted ? (
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

            {/* Bouton de fermeture/retour */}
            {onClose && (
              <button
                className={styles.controlButton}
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  handleClose();
                }}
                aria-label="Fermer le jeu"
              >
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
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                togglePause();
              }}
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
      </div>
    </>
  );

  // Contenu des contrôles mobiles
  const mobileControlsContent = (
    <>
      <ScorePanel player={gameState.player} isActive={gameState.isActive} />

      {/* Boutons de contrôle - Mobile uniquement */}
      <div className={styles.controls}>
        {/* Bouton audio */}
        <button
          className={`${styles.volumeButton} ${styles.mobileAudioButton}`}
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            toggleMute();
          }}
          onTouchEnd={(e) => {
            e.stopPropagation();
            e.preventDefault();
            toggleMute();
          }}
          aria-label={!isMuted ? 'Couper le son' : 'Activer le son'}
        >
          {!isMuted ? (
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

        {/* Bouton de fermeture/retour */}
        {onClose && (
          <button
            className={styles.controlButton}
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              handleClose();
            }}
            onTouchEnd={(e) => {
              e.stopPropagation();
              e.preventDefault();
              handleClose();
            }}
            aria-label="Fermer le jeu"
          >
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
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            togglePause();
          }}
          onTouchEnd={(e) => {
            e.stopPropagation();
            e.preventDefault();
            togglePause();
          }}
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
    </>
  );

  // Sur mobile, afficher dans une modale plein écran
  if (isMobile && typeof window !== 'undefined') {
    const modalContent = (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className={styles.mobileModal}
        onClick={(e) => {
          // Ne pas fermer si on clique sur le contenu
          if (e.target === e.currentTarget && onClose) {
            handleClose();
          }
        }}
      >
        <div className={styles.mobileModalContent}>
          {/* Zone du jeu - 2/3 de la hauteur */}
          <div className={styles.mobileGameArea}>
            <div className={styles.gameContainer}>{gameContent}</div>
          </div>

          {/* Zone des contrôles et stats - 1/3 de la hauteur */}
          <div className={styles.mobileControlsArea}>{mobileControlsContent}</div>
        </div>
      </motion.div>
    );

    return ReactDOM.createPortal(modalContent, document.body);
  }

  // Sur desktop, afficher normalement
  return <div className={styles.gameContainer}>{desktopContent}</div>;
};

export default RhythmCatcher;
