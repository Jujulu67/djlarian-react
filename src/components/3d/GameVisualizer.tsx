'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GamePattern, FrequencyBand } from '@/types/game';
import ScoreDisplay from './ScoreDisplay';
import ParticleSystem, { Particle } from './ParticleSystem';

const PATTERN_LIFETIME = 3000; // Durée de vie des patterns en ms
const PLAYER_SIZE = 12;
const SCORE_INCREMENT = 10;
const GOLDEN_SCORE = 50;
const COMBO_MULTIPLIER = 1.2;

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

interface BeatVisual {
  timestamp: number;
  strength: number;
  position: number;
}

const GameVisualizer: React.FC<GameVisualizerProps> = ({ gameData, audioElement }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctx = useRef<CanvasRenderingContext2D | null>(null);
  const playerRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const animationFrameRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number>(0);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [screenShake, setScreenShake] = useState<{ active: boolean; intensity: number }>({
    active: false,
    intensity: 0,
  });

  // État pour les animations de points
  const [pointAnimations, setPointAnimations] = useState<
    { x: number; y: number; value: number; timestamp: number; type: string }[]
  >([]);

  // État pour les beats visuels
  const [beatVisuals, setBeatVisuals] = useState<BeatVisual[]>([]);
  const lastBeatTimeRef = useRef<number>(0);

  // État pour les rails de fréquence
  const [frequencyLanes, setFrequencyLanes] = useState<
    { name: FrequencyBand; yPosition: number; alpha: number }[]
  >([
    { name: 'bass', yPosition: 0.75, alpha: 0.2 }, // Graves
    { name: 'mid', yPosition: 0.5, alpha: 0.2 }, // Médiums
    { name: 'high', yPosition: 0.25, alpha: 0.2 }, // Aigus
  ]);

  // État pour la régénération des patterns
  const patternRegenerationAttempted = useRef<boolean>(false);

  // Références pour les logs (useRef au lieu de useState pour éviter les rerenders)
  const lastPatternWarningTimeRef = useRef<number>(0);
  const lastPatternLogTimeRef = useRef<number>(0);
  const hasLoggedInactiveWithPatternsRef = useRef<boolean>(false);

  // === Fonctions définies avec useCallback ===

  const handlePointerMove = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    if (!canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    let clientX: number, clientY: number;

    if ('touches' in e) {
      // C'est un TouchEvent
      if (e.touches.length === 0) return;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      // C'est un MouseEvent
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    playerRef.current = { x, y };

    if (gameData.setPlayerPosition) {
      gameData.setPlayerPosition(x, y);
    }
  };

  // Fonction pour dessiner le joueur
  const drawPlayer = useCallback(() => {
    if (!ctx.current || !canvasRef.current) return;

    ctx.current.beginPath();
    ctx.current.arc(playerRef.current.x, playerRef.current.y, PLAYER_SIZE, 0, Math.PI * 2);

    // Gradient radial pour le joueur
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

    // Ajouter un halo autour du joueur
    ctx.current.beginPath();
    ctx.current.arc(playerRef.current.x, playerRef.current.y, PLAYER_SIZE + 5, 0, Math.PI * 2);
    ctx.current.strokeStyle = 'rgba(200, 200, 255, 0.3)';
    ctx.current.lineWidth = 2;
    ctx.current.stroke();
  }, []);

  // Fonction pour vérifier les collisions
  const checkCollisions = useCallback(
    (playerX: number, playerY: number, patterns: GamePattern[], now: number) => {
      // Pour chaque pattern, vérifier s'il y a collision avec le joueur
      patterns.forEach((pattern) => {
        // Ignorer les patterns en cours de décomposition
        if (pattern.isDisintegrating) return;

        const dx = pattern.position.x - playerX;
        const dy = pattern.position.y - playerY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < (pattern.size || 20) / 2 + PLAYER_SIZE / 2) {
          // Activer un léger screenshake pour les hits
          let intensity = 3;
          if (pattern.type === 'golden') intensity = 5;
          setScreenShake({ active: true, intensity });

          // Générer des particules à l'emplacement de la collision
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

          // Ajouter l'animation de points si c'est un pattern à collecter
          if (pattern.type === 'collect' || pattern.type === 'golden' || pattern.type === 'blue') {
            const hitType = gameData.gameState.lastHitAccuracy || 'ok';
            const pointsValue = gameData.gameState.lastHitPoints || 0;

            setPointAnimations((prev) => [
              ...prev,
              {
                x: pattern.position.x,
                y: pattern.position.y - 25, // Un peu au-dessus du pattern
                value: pointsValue,
                timestamp: now,
                type: hitType,
              },
            ]);
          }

          // Appeler la fonction de collision du gestionnaire de jeu
          gameData.handleCollision(pattern.type, pattern);
        }
      });
    },
    [gameData, setScreenShake, setParticles, setPointAnimations]
  );

  // Fonction principale d'animation
  const animate = useCallback(() => {
    if (!canvasRef.current || !ctx.current) return;

    // Effacer le canvas
    ctx.current.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

    // Dessiner un fond pour mieux voir les éléments
    ctx.current.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.current.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);

    // Dessiner une grille de référence
    ctx.current.strokeStyle = 'rgba(50, 50, 50, 0.3)';
    ctx.current.lineWidth = 1;

    // Lignes horizontales
    for (let y = 0; y < canvasRef.current.height; y += 100) {
      ctx.current.beginPath();
      ctx.current.moveTo(0, y);
      ctx.current.lineTo(canvasRef.current.width, y);
      ctx.current.stroke();

      // Ajouter les coordonnées
      ctx.current.fillStyle = 'rgba(150, 150, 150, 0.5)';
      ctx.current.font = '10px Arial';
      ctx.current.fillText(`y: ${y}`, 5, y + 12);
    }

    // Lignes verticales
    for (let x = 0; x < canvasRef.current.width; x += 100) {
      ctx.current.beginPath();
      ctx.current.moveTo(x, 0);
      ctx.current.lineTo(x, canvasRef.current.height);
      ctx.current.stroke();

      // Ajouter les coordonnées
      ctx.current.fillStyle = 'rgba(150, 150, 150, 0.5)';
      ctx.current.font = '10px Arial';
      ctx.current.fillText(`x: ${x}`, x + 2, 10);
    }

    // Appliquer le screenshake si actif
    if (screenShake.active) {
      const shakeX = (Math.random() - 0.5) * screenShake.intensity;
      const shakeY = (Math.random() - 0.5) * screenShake.intensity;
      ctx.current.save();
      ctx.current.translate(shakeX, shakeY);

      // Réduire l'intensité du screenshake avec le temps
      setScreenShake((prev) => ({
        active: prev.intensity > 0.5,
        intensity: prev.intensity * 0.9,
      }));
    }

    // Dessiner les rails de fréquence
    frequencyLanes.forEach((lane) => {
      const yPos = lane.yPosition * canvasRef.current!.height;

      // Dessiner la ligne de rail
      ctx.current!.beginPath();
      ctx.current!.moveTo(0, yPos);
      ctx.current!.lineTo(canvasRef.current!.width, yPos);
      ctx.current!.strokeStyle =
        lane.name === 'bass'
          ? `rgba(255, 215, 0, ${lane.alpha})`
          : lane.name === 'high'
            ? `rgba(0, 170, 255, ${lane.alpha})`
            : `rgba(211, 69, 255, ${lane.alpha})`;
      ctx.current!.lineWidth = 3;
      ctx.current!.stroke();

      // Ajouter un effet de lueur
      ctx.current!.beginPath();
      const gradient = ctx.current!.createLinearGradient(0, yPos - 10, 0, yPos + 10);
      gradient.addColorStop(
        0,
        `rgba(${
          lane.name === 'bass'
            ? '255, 215, 0'
            : lane.name === 'high'
              ? '0, 170, 255'
              : '211, 69, 255'
        }, 0)`
      );
      gradient.addColorStop(
        0.5,
        `rgba(${
          lane.name === 'bass'
            ? '255, 215, 0'
            : lane.name === 'high'
              ? '0, 170, 255'
              : '211, 69, 255'
        }, ${lane.alpha * 0.5})`
      );
      gradient.addColorStop(
        1,
        `rgba(${
          lane.name === 'bass'
            ? '255, 215, 0'
            : lane.name === 'high'
              ? '0, 170, 255'
              : '211, 69, 255'
        }, 0)`
      );
      ctx.current!.fillStyle = gradient;
      ctx.current!.fillRect(0, yPos - 10, canvasRef.current!.width, 20);
    });

    // Dessiner des beats visuels (ondes qui se déplacent de droite à gauche)
    if (gameData.audioData && gameData.audioData.length > 0) {
      // Vérifier s'il y a un nouveau beat à ajouter (basé sur l'intensité des basses)
      const bassValue = gameData.audioData.slice(0, 5).reduce((sum, value) => sum + value, 0) / 5;
      const now = Date.now();
      if (bassValue > 150 && now - lastBeatTimeRef.current > 250) {
        const strength = Math.min(1, bassValue / 200);
        setBeatVisuals((prev) => [
          ...prev,
          { timestamp: now, strength, position: canvasRef.current!.width },
        ]);
        lastBeatTimeRef.current = now;
      }

      // Mettre à jour et dessiner les beats visuels existants
      setBeatVisuals(
        (prev) =>
          prev
            .map((beat) => {
              // Déplacer le beat de droite à gauche
              const ageRatio = (now - beat.timestamp) / 2000; // 2 secondes pour traverser l'écran
              const newPosition = canvasRef.current!.width * (1 - ageRatio);

              // Calculer l'opacité (diminue avec le temps)
              const opacity = Math.max(0, 1 - ageRatio);

              // Dessiner l'onde du beat
              ctx.current!.beginPath();
              ctx.current!.arc(
                newPosition,
                canvasRef.current!.height / 2,
                beat.strength * 50,
                0,
                Math.PI * 2
              );
              ctx.current!.strokeStyle = `rgba(255, 255, 255, ${opacity * 0.7})`;
              ctx.current!.lineWidth = 3;
              ctx.current!.stroke();

              return {
                ...beat,
                position: newPosition,
              };
            })
            .filter((beat) => beat.position > -50) // Supprimer les beats sortis de l'écran
      );
    }

    // Vérifier si nous avons des patterns à dessiner, indépendamment de l'état du jeu
    const hasPatterns = gameData.patterns && gameData.patterns.length > 0;

    // Définir 'now' une seule fois pour toutes les vérifications liées au temps
    const now = Date.now();

    // Si nous n'avons pas de patterns mais que le jeu devrait être actif
    if (!hasPatterns) {
      // Éviter les erreurs de linting avec une vérification explicite
      const warningTimeElapsed =
        typeof lastPatternWarningTimeRef.current === 'number'
          ? now - lastPatternWarningTimeRef.current
          : 2000; // Valeur par défaut élevée pour forcer le log la première fois

      if (warningTimeElapsed > 1000) {
        console.warn('Aucun pattern à afficher');
        lastPatternWarningTimeRef.current = now;
      }

      // Afficher un message d'erreur
      if (ctx.current) {
        ctx.current.fillStyle = '#ff0000';
        ctx.current.font = '20px Arial';
        ctx.current.fillText(
          'Aucun pattern à afficher',
          canvasRef.current.width / 2 - 100,
          canvasRef.current.height / 2
        );
      }

      // Tenter de régénérer les patterns
      if (!patternRegenerationAttempted.current) {
        console.log('Tentative de régénération des patterns...');
        patternRegenerationAttempted.current = true;

        // Déclencher un événement personnalisé pour régénérer les patterns
        const event = new CustomEvent('game-regenerate-patterns');
        window.dispatchEvent(event);

        // Appeler directement startGame si disponible
        if (gameData.startGame) {
          console.log('Appel direct de startGame pour générer des patterns');
          gameData.startGame();
        }

        // En dernier recours, appeler simpleUpdateGame si disponible dans gameData
        if (typeof gameData.simpleUpdateGame === 'function') {
          console.log('Appel de secours de simpleUpdateGame');
          gameData.simpleUpdateGame();

          // Faire une deuxième tentative après un court délai
          setTimeout(() => {
            if (!gameData.patterns || gameData.patterns.length === 0) {
              console.log('Deuxième tentative via simpleUpdateGame');
              if (typeof gameData.simpleUpdateGame === 'function') {
                gameData.simpleUpdateGame();
              }
            }
          }, 300);
        }

        // Réinitialiser le flag après un délai
        setTimeout(() => {
          patternRegenerationAttempted.current = false;
        }, 2000);
      }

      // Dessiner le joueur même s'il n'y a pas de patterns
      drawPlayer();

      requestAnimationFrame(animate);
      return;
    }

    // Si nous avons des patterns mais que le jeu est marqué comme inactif dans l'interface
    if (!gameData.gameState.isActive && hasPatterns) {
      // Log uniquement lors des changements d'état pour éviter les logs répétitifs
      if (!hasLoggedInactiveWithPatternsRef.current) {
        console.log(
          "Jeu marqué comme inactif mais des patterns sont disponibles - Forcer l'affichage"
        );
        hasLoggedInactiveWithPatternsRef.current = true;
      }

      // Afficher un message d'information
      if (ctx.current) {
        ctx.current.fillStyle = '#ffffff';
        ctx.current.font = '16px Arial';
        ctx.current.fillText(
          'Cliquez pour interagir avec les patterns',
          canvasRef.current.width / 2 - 150,
          50
        );
      }
    } else {
      // Réinitialiser le flag si l'état change
      hasLoggedInactiveWithPatternsRef.current = false;
    }

    // Log du nombre de patterns à dessiner (uniquement une fois par seconde pour éviter la pollution de console)
    if (now - lastPatternLogTimeRef.current > 1000) {
      console.log(`Dessin de ${gameData.patterns?.length || 0} patterns`, gameData.patterns);
      lastPatternLogTimeRef.current = now;

      // Réinitialiser les compteurs de warning
      lastPatternWarningTimeRef.current = 0;
    }

    // Vérifier si les patterns existent avant d'essayer de les dessiner
    if (!gameData.patterns || gameData.patterns.length === 0) {
      // Limiter la fréquence des warnings
      if (now - lastPatternWarningTimeRef.current > 1000) {
        console.warn('Aucun pattern à dessiner, vérification supplémentaire requise');
        lastPatternWarningTimeRef.current = now;
      }

      // Ajouter un indicateur visuel pour le débogage
      ctx.current!.fillStyle = 'rgba(255, 0, 0, 0.5)';
      ctx.current!.fillRect(10, 10, 100, 30);
      ctx.current!.fillStyle = 'white';
      ctx.current!.font = '12px Arial';
      ctx.current!.fillText('Pas de patterns!', 20, 30);

      // Continuer l'animation même sans patterns
      drawPlayer();
      requestAnimationFrame(animate);
      return;
    }

    // Dessiner chaque pattern
    gameData.patterns.forEach((pattern) => {
      // Vérifier que le pattern a une position valide
      if (
        !pattern.position ||
        typeof pattern.position.x !== 'number' ||
        typeof pattern.position.y !== 'number'
      ) {
        console.error('Pattern avec position invalide:', pattern);
        return;
      }

      // Vérifier que le pattern est dans les limites du canvas
      if (pattern.position.x < -50 || pattern.position.x > canvasRef.current!.width + 50) {
        console.log(`Pattern hors limites horizontales: ${pattern.id} à x=${pattern.position.x}`);
        return;
      }

      // Dessiner le pattern en fonction de son type
      if (pattern.isDisintegrating) {
        // Pour les patterns en décomposition, dessiner un effet d'éclatement
        const age = Date.now() - (pattern.disintegrateStartTime || Date.now());
        const duration = pattern.disintegrateDuration || 500;
        const progress = Math.min(1, age / duration);

        const originalSize = pattern.size || 20;
        const size = originalSize * (1 + progress);

        // Appliquer un style différent en fonction du type de pattern et de la précision
        let color;
        let ringColor;

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

        // Dessiner le cercle principal en train de disparaître
        ctx.current!.beginPath();
        ctx.current!.arc(pattern.position.x, pattern.position.y, size / 2, 0, Math.PI * 2);
        ctx.current!.fillStyle = color;
        ctx.current!.fill();

        // Ajouter un anneau lumineux qui s'agrandit
        if (pattern.accuracyType) {
          ctx.current!.beginPath();
          ctx.current!.arc(pattern.position.x, pattern.position.y, size, 0, Math.PI * 2);
          ctx.current!.strokeStyle = ringColor;
          ctx.current!.lineWidth = 3;
          ctx.current!.stroke();
        }
      } else {
        // Pour les patterns normaux, dessiner selon leur type
        let color: string;
        let shadowColor: string;
        let glowSize: number = 0;

        switch (pattern.type) {
          case 'golden':
            color = '#FFD700'; // Or
            shadowColor = 'rgba(255, 215, 0, 0.5)';
            glowSize = 10;
            break;
          case 'blue':
            color = '#00AAFF'; // Bleu
            shadowColor = 'rgba(0, 170, 255, 0.5)';
            glowSize = 8;
            break;
          case 'collect':
            color = '#D345FF'; // Violet
            shadowColor = 'rgba(211, 69, 255, 0.5)';
            glowSize = 5;
            break;
          case 'avoid':
            color = '#FF4444'; // Rouge
            shadowColor = 'rgba(255, 68, 68, 0.5)';
            break;
          case 'enemy':
            color = '#FF2222'; // Rouge plus vif
            shadowColor = 'rgba(255, 34, 34, 0.5)';
            break;
          default:
            color = '#FFFFFF';
            shadowColor = 'rgba(255, 255, 255, 0.5)';
        }

        // Ajouter un effet de pulsation au rythme de la musique
        let sizeModifier = 0;
        if (pattern.createdOnBeat) {
          const pulseDuration = 500; // ms
          const age = Date.now() - pattern.timestamp;
          if (age < pulseDuration) {
            const pulseProgress = age / pulseDuration;
            sizeModifier = Math.sin(pulseProgress * Math.PI) * 5;
          }
        }

        // Ajouter un effet de lueur pour les patterns spéciaux
        if (glowSize > 0) {
          ctx.current!.shadowColor = shadowColor;
          ctx.current!.shadowBlur = glowSize;
        }

        // Dessiner le cercle principal
        ctx.current!.beginPath();
        ctx.current!.arc(
          pattern.position.x,
          pattern.position.y,
          (pattern.size || 20) / 2 + sizeModifier,
          0,
          Math.PI * 2
        );
        ctx.current!.fillStyle = color;
        ctx.current!.fill();

        // Réinitialiser les effets de lueur
        ctx.current!.shadowColor = 'transparent';
        ctx.current!.shadowBlur = 0;

        // Ajouter un cercle intérieur pour les patterns spéciaux
        if (pattern.type === 'golden' || pattern.type === 'blue') {
          ctx.current!.beginPath();
          ctx.current!.arc(
            pattern.position.x,
            pattern.position.y,
            (pattern.size || 20) / 4,
            0,
            Math.PI * 2
          );
          ctx.current!.fillStyle = pattern.type === 'golden' ? '#FFFFFF' : '#DDFAFF';
          ctx.current!.fill();
        }

        // Ajouter une bordure en pointillés pour montrer le timing idéal
        if (pattern.targetTime) {
          const timeUntilTarget = pattern.targetTime - Date.now();
          const perfectWindowSize = 100; // ms

          if (Math.abs(timeUntilTarget) < perfectWindowSize) {
            // Dans la fenêtre parfaite, afficher une bordure brillante
            ctx.current!.beginPath();
            ctx.current!.arc(
              pattern.position.x,
              pattern.position.y,
              (pattern.size || 20) / 2 + 3,
              0,
              Math.PI * 2
            );
            ctx.current!.strokeStyle =
              pattern.type === 'golden'
                ? 'rgba(255, 255, 255, 0.8)'
                : pattern.type === 'blue'
                  ? 'rgba(200, 255, 255, 0.8)'
                  : 'rgba(255, 200, 255, 0.8)';
            ctx.current!.lineWidth = 2;
            ctx.current!.stroke();
          }
        }

        // Ajouter un texte pour identifier le pattern (pour le débogage)
        ctx.current!.font = '10px Arial';
        ctx.current!.fillStyle = 'white';
        ctx.current!.textAlign = 'center';
        ctx.current!.fillText(`${pattern.lane}`, pattern.position.x, pattern.position.y - 15);
        ctx.current!.fillText(
          `${Math.round(pattern.position.x)},${Math.round(pattern.position.y)}`,
          pattern.position.x,
          pattern.position.y + 20
        );
      }
    });

    // Dessiner le joueur
    drawPlayer();

    // Mettre à jour et dessiner les animations de points
    setPointAnimations(
      (prev) =>
        prev
          .map((point) => {
            const age = Date.now() - point.timestamp;
            const opacity = Math.max(0, 1 - age / 1000); // Disparaît après 1 seconde

            // Faire monter l'animation de points
            const yOffset = Math.min(40, age / 20);

            // Couleur basée sur le type de précision
            let color;
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

            // Dessiner le texte des points
            ctx.current!.font = point.type === 'perfect' ? 'bold 16px Arial' : '14px Arial';
            ctx.current!.fillStyle = color;
            ctx.current!.textAlign = 'center';

            // Afficher le nombre de points et le type de précision
            ctx.current!.fillText(`+${Math.round(point.value)}`, point.x, point.y - yOffset);
            ctx.current!.font = '10px Arial';
            ctx.current!.fillText(point.type.toUpperCase(), point.x, point.y - yOffset + 12);

            return {
              ...point,
              y: point.y - 0.5, // Faire monter légèrement
            };
          })
          .filter((point) => Date.now() - point.timestamp < 1000) // Supprimer après 1 seconde
    );

    // Vérifier les collisions
    checkCollisions(playerRef.current.x, playerRef.current.y, gameData.patterns, now);

    // Restaurer le contexte si screenshake était actif
    if (screenShake.active) {
      ctx.current!.restore();
    }

    // Continuer l'animation
    requestAnimationFrame(animate);
  }, [
    gameData,
    checkCollisions,
    drawPlayer,
    frequencyLanes,
    screenShake.active,
    screenShake.intensity,
    setPointAnimations,
  ]);

  // === Hooks useEffect ===

  // Animation de respiration pour les rails de fréquence en fonction du rythme
  useEffect(() => {
    if (!gameData.currentBpm) return;

    const beatInterval = 60000 / gameData.currentBpm;
    const pulseLanes = () => {
      setFrequencyLanes((prev) =>
        prev.map((lane) => ({
          ...lane,
          alpha: Math.min(0.8, lane.alpha + 0.3),
        }))
      );

      // Diminuer progressivement l'alpha
      setTimeout(() => {
        setFrequencyLanes((prev) =>
          prev.map((lane) => ({
            ...lane,
            alpha: Math.max(0.2, lane.alpha - 0.2),
          }))
        );
      }, beatInterval / 4);
    };

    const interval = setInterval(pulseLanes, beatInterval);
    return () => clearInterval(interval);
  }, [gameData.currentBpm]);

  // Mettre en place l'animation et le canvas (maintenant APRÈS la définition de animate)
  useEffect(() => {
    if (!canvasRef.current) return;
    ctx.current = canvasRef.current.getContext('2d');
    if (!ctx.current) {
      console.error("Impossible d'obtenir le contexte 2D");
      return;
    }

    const resizeCanvas = () => {
      if (!canvasRef.current) return;
      const container = canvasRef.current.parentElement;
      if (!container) return;

      const minWidth = 1200;
      const minHeight = 600;

      canvasRef.current.width = Math.max(container.clientWidth, minWidth);
      canvasRef.current.height = Math.max(container.clientHeight, minHeight);

      console.log(`Canvas redimensionné: ${canvasRef.current.width}x${canvasRef.current.height}`);
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    if (canvasRef.current) {
      playerRef.current = { x: canvasRef.current.width / 2, y: canvasRef.current.height / 2 };
      if (gameData.setPlayerPosition) {
        gameData.setPlayerPosition(playerRef.current.x, playerRef.current.y);
      }
    }

    console.log("Démarrage de la boucle d'animation du canvas");
    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [animate, gameData.setPlayerPosition]); // Dépendances: animate est défini plus haut, setPlayerPosition

  // Effet pour surveiller les changements dans gameData.patterns
  useEffect(() => {
    if (gameData.patterns && gameData.patterns.length > 0) {
      console.log(
        `GameVisualizer: patterns mis à jour, ${gameData.patterns.length} patterns disponibles`
      );
      console.log('Premier pattern:', gameData.patterns[0]);
    } else {
      console.log('GameVisualizer: aucun pattern disponible dans gameData.patterns');
      console.log('État complet de gameData:', gameData);
    }
  }, [gameData.patterns]);

  // Effet pour surveiller l'état du jeu
  useEffect(() => {
    console.log(`GameVisualizer: état du jeu mis à jour, isActive=${gameData.gameState.isActive}`);
  }, [gameData.gameState.isActive]);

  // === Fonctions de rendu et gestionnaires d'événements ===

  const renderInstructions = () => {
    // Ne pas afficher les instructions si le jeu est actif
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

  const handlePlayClick = () => {
    console.log('Bouton "Appuyez pour jouer" cliqué - Approche directe');

    // S'assurer que l'élément audio est correctement initialisé
    if (audioElement) {
      console.log("État initial de l'audio avant le clic:", {
        paused: audioElement.paused,
        readyState: audioElement.readyState,
        currentTime: audioElement.currentTime,
        src: audioElement.src,
      });

      // Forcer le préchargement si nécessaire
      if (audioElement.readyState < 2) {
        console.log('Audio pas encore prêt, forçage du chargement');
        audioElement.load();
      }

      // Démarrer l'audio avec des logs pour suivre son état
      audioElement
        .play()
        .then(() => {
          console.log('Audio démarré avec succès depuis le clic du bouton');

          // Utiliser directement la fonction startGame si disponible
          if (gameData.startGame && typeof gameData.startGame === 'function') {
            console.log('Fonction startGame disponible, appel direct');
            try {
              gameData.startGame();
              console.log('Jeu démarré via gameData.startGame');
            } catch (e) {
              console.error('Erreur lors du démarrage direct du jeu:', e);
              // Fallback sur événement personnalisé
              window.dispatchEvent(new CustomEvent('game-force-start'));
            }
          } else {
            // Si startGame n'est pas disponible, utiliser l'approche par événement
            console.log("Fonction startGame non disponible, utilisation de l'événement");
            window.dispatchEvent(new CustomEvent('game-start'));
          }
        })
        .catch((error) => {
          console.error('Erreur lors du démarrage audio depuis le clic du bouton:', error);
          // Tenter de démarrer le jeu quand même
          if (gameData.startGame && typeof gameData.startGame === 'function') {
            try {
              gameData.startGame();
              console.log('Tentative de démarrage du jeu malgré échec audio');
            } catch (e) {
              window.dispatchEvent(new CustomEvent('game-force-start'));
            }
          } else {
            window.dispatchEvent(new CustomEvent('game-force-start'));
          }
        });
    } else {
      console.error('Élément audio non disponible pour démarrer le jeu');
      // Même sans audio, tenter de démarrer le jeu
      if (gameData.startGame && typeof gameData.startGame === 'function') {
        try {
          gameData.startGame();
          console.log('Démarrage du jeu sans audio via gameData.startGame');
        } catch (e) {
          window.dispatchEvent(new CustomEvent('game-force-start'));
        }
      } else {
        window.dispatchEvent(new CustomEvent('game-force-start'));
      }
    }
  };

  // Fonction pour obtenir la couleur en fonction de la lane
  const getLaneColor = (lane: FrequencyBand): string => {
    switch (lane) {
      case 'bass':
        return '#FFD700'; // Or
      case 'mid':
        return '#D345FF'; // Violet
      case 'high':
        return '#00AAFF'; // Bleu
      default:
        return '#FFFFFF'; // Blanc
    }
  };

  // === Rendu du composant ===
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
