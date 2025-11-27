'use client';

import { motion } from 'framer-motion';
import React, { useRef, useEffect, useState } from 'react';

import { logger } from '@/lib/logger';

import { GameState, Pattern, Point, HitQuality } from './gameEngine';
import styles from './styles.module.css';

interface GameCanvasProps {
  gameState: GameState;
  onCollision: (position: Point, time: number, actualPosition?: Point) => void;
  onHit?: (position: Point, quality: HitQuality) => void;
  onHitRef?: React.MutableRefObject<
    ((position: Point, quality: HitQuality, radius?: number, color?: string) => void) | null
  >;
  isAudioActive: boolean;
  onStart?: () => void;
}

const GameCanvas: React.FC<GameCanvasProps> = ({
  gameState,
  onCollision,
  onHit,
  onHitRef,
  isAudioActive,
  onStart,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
  const [hitEffect, setHitEffect] = useState<{
    position: Point;
    quality: HitQuality;
    time: number;
    radius: number; // Rayon du pattern pour l'animation
    color: string; // Couleur du pattern pour l'animation
  } | null>(null);

  // Expose setHitEffect via ref pour permettre l'appel depuis l'extérieur
  useEffect(() => {
    if (onHitRef) {
      onHitRef.current = (
        position: Point,
        quality: HitQuality,
        radius?: number,
        color?: string
      ) => {
        // Force la mise à jour de l'effet même si la position est similaire
        const effectTime = Date.now();
        setHitEffect({
          position,
          quality,
          time: effectTime,
          radius: radius || gameState.player.radius, // Utilise le rayon du pattern ou celui du joueur par défaut
          color: color || '#ffffff', // Utilise la couleur du pattern ou blanc par défaut
        });

        // Nettoie l'effet après 500ms
        setTimeout(() => {
          setHitEffect((prev) => {
            // Ne nettoie que si c'est le même effet (même time)
            if (prev && prev.time === effectTime) {
              return null;
            }
            return prev;
          });
        }, 500);
      };
    }

    // Cleanup: réinitialise le ref quand le composant se démonte
    return () => {
      if (onHitRef) {
        onHitRef.current = null;
      }
    };
  }, [onHitRef]);

  // Détermine la couleur de l'effet en fonction de la qualité du hit
  const getHitColor = (quality: HitQuality): string => {
    switch (quality) {
      case 'PERFECT':
        return '#ffde17'; // Jaune pour PERFECT
      case 'GOOD':
        return '#17ff8b'; // Vert pour GOOD
      case 'OK':
        return '#17c9ff'; // Bleu pour OK
      case 'MISS':
        return '#ff4949';
      default:
        return '#ffffff';
    }
  };

  // Fonction helper pour vérifier si un clic est sur un bouton
  const isClickOnButton = (target: EventTarget | null): boolean => {
    if (!target || !(target instanceof Element)) return false;
    // Vérifie si le clic est sur un bouton de contrôle ou ses enfants
    const button = target.closest('button');
    return (
      button !== null &&
      (button.classList.contains('controlButton') ||
        button.classList.contains('volumeButton') ||
        button.closest('.controls') !== null ||
        button.closest('.audioControls') !== null)
    );
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

  // Gère le mouvement de la souris pour le curseur personnalisé
  const [mousePosition, setMousePosition] = useState<Point | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      setMousePosition({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    };

    const handleMouseLeave = () => {
      setMousePosition(null);
    };

    container.addEventListener('mousemove', handleMouseMove);
    container.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      container.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  // Ref pour éviter les événements dupliqués (touchstart déclenche aussi click)
  const touchHandledRef = useRef(false);
  const lastClickTimeRef = useRef(0);
  const listenersAddedRef = useRef(false);

  // Gère les clics pour les collisions
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Évite d'ajouter les listeners plusieurs fois
    if (listenersAddedRef.current) {
      console.warn("[GameCanvas] Tentative d'ajout de listeners dupliqués, ignorée");
      return;
    }
    listenersAddedRef.current = true;
    logger.debug('[GameCanvas] Listeners ajoutés');

    const handleClick = (e: MouseEvent) => {
      // Ignore les clics sur les boutons
      if (isClickOnButton(e.target)) return;

      const now = Date.now();

      // Évite les doubles clics très rapides (moins de 50ms d'écart)
      if (now - lastClickTimeRef.current < 50) {
        return;
      }
      lastClickTimeRef.current = now;

      // Si un touchstart a déjà été géré récemment, ignorer ce click
      if (touchHandledRef.current) {
        touchHandledRef.current = false;
        return;
      }

      // Si le jeu n'est pas actif, démarrer le jeu
      if (!gameState.isActive && onStart) {
        onStart();
        return;
      }

      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();

      // Calcule la position du clic par rapport au conteneur
      const clickPos = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };

      // Tolérance pour les clics proches des bords (permet les clics légèrement en dehors)
      const EDGE_TOLERANCE = 20;
      const clampedPos = {
        x: Math.max(-EDGE_TOLERANCE, Math.min(rect.width + EDGE_TOLERANCE, clickPos.x)),
        y: Math.max(-EDGE_TOLERANCE, Math.min(rect.height + EDGE_TOLERANCE, clickPos.y)),
      };

      // Appelle onCollision qui gère la détection de collision et les logs
      // Utilise la position clampée pour la détection (plus permissive)
      // Mais passe aussi la position réelle pour l'animation
      (onCollision as (position: Point, time: number, actualPosition?: Point) => void)(
        clampedPos,
        now,
        clickPos
      );
    };

    const handleTouchStart = (e: TouchEvent) => {
      // Ignore les touches sur les boutons
      if (isClickOnButton(e.target)) {
        return; // Ne pas appeler preventDefault pour permettre le clic sur le bouton
      }

      const now = Date.now();

      // Évite les doubles touches très rapides (moins de 50ms d'écart)
      if (now - lastClickTimeRef.current < 50) {
        e.preventDefault();
        return;
      }
      lastClickTimeRef.current = now;

      // Marque qu'un touch a été géré pour éviter le click qui suivra
      touchHandledRef.current = true;
      setTimeout(() => {
        touchHandledRef.current = false;
      }, 300);

      // Si le jeu n'est pas actif, démarrer le jeu
      if (!gameState.isActive && onStart) {
        onStart();
        e.preventDefault();
        return;
      }

      if (e.touches.length > 0 && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const touchPos = {
          x: e.touches[0].clientX - rect.left,
          y: e.touches[0].clientY - rect.top,
        };

        // Tolérance pour les touches proches des bords (permet les touches légèrement en dehors)
        const EDGE_TOLERANCE = 20;
        const clampedPos = {
          x: Math.max(-EDGE_TOLERANCE, Math.min(rect.width + EDGE_TOLERANCE, touchPos.x)),
          y: Math.max(-EDGE_TOLERANCE, Math.min(rect.height + EDGE_TOLERANCE, touchPos.y)),
        };

        // Appelle onCollision qui gère la détection de collision et les logs
        // Utilise la position clampée pour la détection (plus permissive)
        // Mais passe aussi la position réelle pour l'animation
        (onCollision as (position: Point, time: number, actualPosition?: Point) => void)(
          clampedPos,
          now,
          touchPos
        );

        // Prévenir le scroll et le click qui suivra
        e.preventDefault();
      }
    };

    container.addEventListener('click', handleClick);
    container.addEventListener('touchstart', handleTouchStart, { passive: false });

    return () => {
      listenersAddedRef.current = false;
      container.removeEventListener('click', handleClick);
      container.removeEventListener('touchstart', handleTouchStart);
    };
  }, [gameState.isActive, onCollision, onStart]); // Réduire les dépendances

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

    // Dessine l'effet de hit
    if (hitEffect) {
      const timeSinceHit = Date.now() - hitEffect.time;
      const effectSize = Math.min(1, timeSinceHit / 500);

      if (effectSize < 1) {
        // Utilise la couleur du pattern pour l'animation circulaire (couleur stockée dans hitEffect)
        // S'assure que la couleur est bien formatée (avec # si nécessaire)
        let patternColor = hitEffect.color || '#ffffff';
        if (!patternColor.startsWith('#')) {
          patternColor = `#${patternColor}`;
        }
        // Utilise les couleurs de qualité pour le texte
        const textColor = getHitColor(hitEffect.quality);

        // Animation circulaire qui s'agrandit et disparaît
        // Commence à la taille du pattern et s'agrandit jusqu'à 2x
        const baseRadius = hitEffect.radius;
        const maxRadius = baseRadius * 2;
        const currentRadius = baseRadius + (maxRadius - baseRadius) * effectSize;

        // Opacité qui diminue avec le temps
        const opacity = 1 - effectSize;

        // Dessine plusieurs cercles concentriques pour un effet plus visible
        // Utilise la couleur du pattern
        for (let i = 0; i < 3; i++) {
          const circleRadius = currentRadius * (1 - i * 0.3);
          const circleOpacity = opacity * (1 - i * 0.2);

          ctx.beginPath();
          ctx.arc(hitEffect.position.x, hitEffect.position.y, circleRadius, 0, Math.PI * 2);

          ctx.strokeStyle = `${patternColor}${Math.floor(circleOpacity * 255)
            .toString(16)
            .padStart(2, '0')}`;
          ctx.lineWidth = (4 - i) * (1 - effectSize);
          ctx.stroke();
        }

        // Texte pour la qualité du hit avec les couleurs de qualité
        ctx.font = 'bold 20px Arial';
        ctx.fillStyle = `${textColor}${Math.floor(opacity * 255)
          .toString(16)
          .padStart(2, '0')}`;
        ctx.textAlign = 'center';
        ctx.fillText(
          hitEffect.quality,
          hitEffect.position.x,
          hitEffect.position.y - 30 - effectSize * 20
        );
      }
    }

    // Dessine le curseur personnalisé (boule blanche qui suit la souris)
    if (mousePosition && gameState.isActive) {
      const cursorRadius = gameState.player.radius; // Utilise le radius du player (réduit de moitié)

      // Dégradé radial pour la boule blanche (comme l'ancien curseur)
      const gradient = ctx.createRadialGradient(
        mousePosition.x,
        mousePosition.y,
        0,
        mousePosition.x,
        mousePosition.y,
        cursorRadius
      );
      gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
      gradient.addColorStop(0.7, 'rgba(230, 230, 255, 0.9)');
      gradient.addColorStop(1, 'rgba(200, 200, 255, 0.7)');

      // Dessine la boule principale
      ctx.beginPath();
      ctx.arc(mousePosition.x, mousePosition.y, cursorRadius, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();

      // Ajoute un halo autour du curseur
      ctx.beginPath();
      ctx.arc(mousePosition.x, mousePosition.y, cursorRadius + 2, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(200, 200, 255, 0.3)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // Dessine le texte de score et combo (uniquement sur desktop, pas sur mobile)
    // Sur mobile, le score et combo sont affichés dans la zone de contrôle en bas
    const isMobile = canvasSize.width < 768;

    if (gameState.isActive && !isMobile) {
      ctx.font = 'bold 24px Arial';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.textAlign = 'left';
      ctx.fillText(`Score: ${gameState.player.score}`, 20, 35);

      if (gameState.player.combo > 1) {
        ctx.font = 'bold 20px Arial';
        ctx.fillStyle = 'rgba(255, 220, 0, 0.9)';
        ctx.fillText(`${gameState.player.combo}x Combo`, 20, 65);
      }
    }
  }, [canvasSize, gameState, hitEffect, isAudioActive, mousePosition]);

  return (
    <div ref={containerRef} className={styles.canvasContainer}>
      <canvas
        ref={canvasRef}
        width={canvasSize.width}
        height={canvasSize.height}
        className={styles.gameCanvas}
      />

      {!gameState.isActive && (
        <div
          className={styles.startOverlay}
          onClick={(e) => {
            // Démarrer le jeu si on clique sur l'overlay
            if (onStart && !gameState.isActive) {
              e.stopPropagation();
              onStart();
            }
          }}
          onTouchStart={(e) => {
            // Démarrer le jeu si on touche l'overlay
            if (onStart && !gameState.isActive) {
              e.stopPropagation();
              onStart();
            }
          }}
        >
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
            <p style={{ marginTop: '1rem', fontSize: '0.9rem', opacity: 0.8 }}>
              Cliquez n'importe où pour commencer
            </p>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default GameCanvas;
