'use client';

import React, { useRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { GameState, Pattern, Point, checkCollisions, HitQuality } from './gameEngine';
import styles from './styles.module.css';

interface GameCanvasProps {
  gameState: GameState;
  onCollision: (position: Point, time: number) => void;
  isAudioActive: boolean;
}

const GameCanvas: React.FC<GameCanvasProps> = ({ gameState, onCollision, isAudioActive }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
  const [mousePosition, setMousePosition] = useState<Point>({ x: 0, y: 0 });
  const [hitEffect, setHitEffect] = useState<{
    position: Point;
    quality: HitQuality;
    time: number;
  } | null>(null);

  // Détermine la couleur de l'effet en fonction de la qualité du hit
  const getHitColor = (quality: HitQuality): string => {
    switch (quality) {
      case 'PERFECT':
        return '#ffde17';
      case 'GOOD':
        return '#17c9ff';
      case 'OK':
        return '#17ff8b';
      case 'MISS':
        return '#ff4949';
      default:
        return '#ffffff';
    }
  };

  // Ajuste la taille du canvas en fonction de son conteneur
  useEffect(() => {
    const updateCanvasSize = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        setCanvasSize({ width, height });
      }
    };

    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);

    return () => {
      window.removeEventListener('resize', updateCanvasSize);
    };
  }, []);

  // Gère le mouvement de la souris
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setMousePosition({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        });
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0 && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setMousePosition({
          x: e.touches[0].clientX - rect.left,
          y: e.touches[0].clientY - rect.top,
        });
        e.preventDefault();
      }
    };

    // Mise à jour initiale du curseur au centre du bas
    if (containerRef.current) {
      setMousePosition({
        x: canvasSize.width / 2,
        y: canvasSize.height - 50,
      });
    }

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('touchmove', handleTouchMove, { passive: false });

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchmove', handleTouchMove);
    };
  }, [canvasSize]);

  // Gère les clics pour les collisions
  useEffect(() => {
    const handleClick = () => {
      const now = Date.now();
      onCollision(mousePosition, now);

      // Vérifie si un pattern a été frappé
      const result = checkCollisions(gameState, mousePosition, now);
      if (result.collided && result.quality) {
        setHitEffect({ position: mousePosition, quality: result.quality, time: now });

        // Efface l'effet après un délai
        setTimeout(() => {
          setHitEffect(null);
        }, 500);
      }
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length > 0 && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const touchPos = {
          x: e.touches[0].clientX - rect.left,
          y: e.touches[0].clientY - rect.top,
        };

        setMousePosition(touchPos);
        const now = Date.now();
        onCollision(touchPos, now);

        // Vérifie si un pattern a été frappé
        const result = checkCollisions(gameState, touchPos, now);
        if (result.collided && result.quality) {
          setHitEffect({ position: touchPos, quality: result.quality, time: now });

          // Efface l'effet après un délai
          setTimeout(() => {
            setHitEffect(null);
          }, 500);
        }
      }
      e.preventDefault();
    };

    window.addEventListener('click', handleClick);
    window.addEventListener('touchstart', handleTouchStart, { passive: false });

    return () => {
      window.removeEventListener('click', handleClick);
      window.removeEventListener('touchstart', handleTouchStart);
    };
  }, [gameState, mousePosition, onCollision]);

  // Animation et rendu du canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Nettoie le canvas
    ctx.clearRect(0, 0, canvasSize.width, canvasSize.height);

    // Dessine le fond
    ctx.fillStyle = 'rgba(10, 10, 15, 0.8)';
    ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);

    // Dessine la grille de fond
    ctx.strokeStyle = 'rgba(90, 90, 120, 0.2)';
    ctx.lineWidth = 1;

    // Lignes horizontales
    const gridStep = 30;
    for (let y = 0; y < canvasSize.height; y += gridStep) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvasSize.width, y);
      ctx.stroke();
    }

    // Lignes verticales
    for (let x = 0; x < canvasSize.width; x += gridStep) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvasSize.height);
      ctx.stroke();
    }

    // Dessine les rails de fréquence si l'audio est actif
    if (isAudioActive && gameState.frequencyData) {
      const barWidth = canvasSize.width / gameState.frequencyData.length;
      const frequencyStep = Math.ceil(gameState.frequencyData.length / 32); // Limite à 32 barres

      ctx.fillStyle = 'rgba(100, 100, 255, 0.15)';

      for (let i = 0; i < gameState.frequencyData.length; i += frequencyStep) {
        const barHeight = (gameState.frequencyData[i] / 255) * 100;

        if (barHeight > 5) {
          // Ne dessine que les barres significatives
          ctx.fillRect(
            i * barWidth * frequencyStep,
            canvasSize.height,
            barWidth * frequencyStep - 1,
            -barHeight
          );
        }
      }
    }

    // Dessine les patterns
    gameState.patterns.forEach((pattern) => {
      if (pattern.active || (!pattern.active && pattern.wasHit)) {
        // Crée un dégradé pour le pattern
        const gradient = ctx.createRadialGradient(
          pattern.position.x,
          pattern.position.y,
          0,
          pattern.position.x,
          pattern.position.y,
          pattern.radius * pattern.scale
        );

        const baseColor = pattern.color;
        gradient.addColorStop(0, `${baseColor}dd`);
        gradient.addColorStop(0.7, `${baseColor}aa`);
        gradient.addColorStop(1, `${baseColor}00`);

        // Dessine le cercle principal
        ctx.globalAlpha = pattern.opacity;
        ctx.beginPath();
        ctx.arc(
          pattern.position.x,
          pattern.position.y,
          pattern.radius * pattern.scale,
          0,
          Math.PI * 2
        );
        ctx.fillStyle = gradient;
        ctx.fill();

        // Dessine un anneau pour mieux voir le pattern
        ctx.strokeStyle = pattern.color;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Dessine un cercle central
        ctx.beginPath();
        ctx.arc(
          pattern.position.x,
          pattern.position.y,
          pattern.radius * 0.3 * pattern.scale,
          0,
          Math.PI * 2
        );
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.fill();

        // Ajoute un effet pulsant pour les patterns actifs
        if (pattern.active) {
          const pulseSize = Math.sin(Date.now() / 200) * 0.1 + 1;

          ctx.beginPath();
          ctx.arc(
            pattern.position.x,
            pattern.position.y,
            pattern.radius * pattern.scale * pulseSize,
            0,
            Math.PI * 2
          );
          ctx.strokeStyle = `${pattern.color}44`;
          ctx.lineWidth = 3;
          ctx.stroke();
        }

        // Ajoute un effet d'explosion pour les patterns frappés
        if (!pattern.active && pattern.wasHit) {
          const timeSinceHit = Date.now() - pattern.creation;
          const explosionSize = Math.min(1, timeSinceHit / 500);

          if (explosionSize < 1) {
            ctx.beginPath();
            ctx.arc(
              pattern.position.x,
              pattern.position.y,
              pattern.radius * (1 + explosionSize),
              0,
              Math.PI * 2
            );
            ctx.strokeStyle = `${pattern.color}${Math.floor((1 - explosionSize) * 255)
              .toString(16)
              .padStart(2, '0')}`;
            ctx.lineWidth = 5 * (1 - explosionSize);
            ctx.stroke();
          }
        }

        // Réinitialise l'opacité
        ctx.globalAlpha = 1;
      }
    });

    // Dessine la position du joueur (curseur)
    const { position, radius } = gameState.player;

    // Dessine une trace suivant le mouvement du joueur
    ctx.globalAlpha = 0.3;
    ctx.beginPath();
    ctx.moveTo(position.x, position.y);
    ctx.lineTo(mousePosition.x, mousePosition.y);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.globalAlpha = 1;

    // Dessine le cercle du joueur
    const playerGradient = ctx.createRadialGradient(
      mousePosition.x,
      mousePosition.y,
      0,
      mousePosition.x,
      mousePosition.y,
      radius
    );

    playerGradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
    playerGradient.addColorStop(0.7, 'rgba(190, 190, 255, 0.6)');
    playerGradient.addColorStop(1, 'rgba(160, 160, 255, 0)');

    ctx.beginPath();
    ctx.arc(mousePosition.x, mousePosition.y, radius, 0, Math.PI * 2);
    ctx.fillStyle = playerGradient;
    ctx.fill();

    // Ajoute un anneau au joueur
    ctx.beginPath();
    ctx.arc(mousePosition.x, mousePosition.y, radius, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Dessine l'effet de hit
    if (hitEffect) {
      const timeSinceHit = Date.now() - hitEffect.time;
      const effectSize = Math.min(1, timeSinceHit / 500);

      if (effectSize < 1) {
        const color = getHitColor(hitEffect.quality);
        ctx.beginPath();
        ctx.arc(
          hitEffect.position.x,
          hitEffect.position.y,
          radius * (1 + effectSize),
          0,
          Math.PI * 2
        );

        ctx.strokeStyle = `${color}${Math.floor((1 - effectSize) * 255)
          .toString(16)
          .padStart(2, '0')}`;
        ctx.lineWidth = 4 * (1 - effectSize);
        ctx.stroke();

        // Texte pour la qualité du hit
        ctx.font = 'bold 20px Arial';
        ctx.fillStyle = color;
        ctx.textAlign = 'center';
        ctx.fillText(
          hitEffect.quality,
          hitEffect.position.x,
          hitEffect.position.y - 30 - effectSize * 20
        );
      }
    }

    // Dessine le texte de score et combo
    if (gameState.isActive) {
      ctx.font = 'bold 24px Arial';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.textAlign = 'left';
      ctx.fillText(`Score: ${gameState.player.score}`, 20, 30);

      if (gameState.player.combo > 1) {
        ctx.font = 'bold 20px Arial';
        ctx.fillStyle = 'rgba(255, 220, 0, 0.9)';
        ctx.fillText(`${gameState.player.combo}x Combo`, 20, 60);
      }
    }
  }, [canvasSize, gameState, mousePosition, hitEffect, isAudioActive]);

  return (
    <div ref={containerRef} className={styles.canvasContainer}>
      <canvas
        ref={canvasRef}
        width={canvasSize.width}
        height={canvasSize.height}
        className={styles.gameCanvas}
      />

      {!gameState.isActive && (
        <div className={styles.startOverlay}>
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className={styles.startMessage}
          >
            <h2>RhythmCatcher</h2>
            <p>Cliquez ou appuyez sur les cercles au rythme de la musique</p>
            <div className={styles.instruction}>
              <div className={styles.instructionIcon} />
              <span>
                Soyez précis pour obtenir des &quot;PERFECT&quot; et augmenter votre combo!
              </span>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default GameCanvas;
