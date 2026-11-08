'use client';

import React, { useRef, useEffect, useState } from 'react';

import { GameState, Point, HitQuality, PowerUpType } from './gameEngine';
import styles from './styles.module.css';

interface GameCanvasProps {
  gameState: GameState;
  onCollision: (position: Point, time: number, actualPosition?: Point) => void;
  onCursorMove?: (position: Point) => void;
  // Use a callback to trigger effects from outside
  onHitRef?: React.MutableRefObject<
    | ((
        position: Point,
        quality: HitQuality,
        radius?: number,
        color?: string,
        type?: PowerUpType
      ) => void)
    | null
  >;
  isAudioActive: boolean;
  onStart?: () => void;
}

type RenderSize = { width: number; height: number };

type HitEffect = {
  id: number;
  position: Point;
  quality: HitQuality;
  startTime: number;
  radius: number;
  color: string;
};

// Grille de fond (déformée par le power-up SlowMo)
function drawGrid(ctx: CanvasRenderingContext2D, size: RenderSize, distortion: number) {
  ctx.strokeStyle = 'rgba(90, 90, 120, 0.2)';
  ctx.lineWidth = 1;
  const gridStep = 40;

  for (let y = 0; y < size.height; y += gridStep) {
    ctx.beginPath();
    ctx.moveTo(0, y + distortion);
    ctx.lineTo(size.width, y + distortion);
    ctx.stroke();
  }
  for (let x = 0; x < size.width; x += gridStep) {
    ctx.beginPath();
    ctx.moveTo(x + distortion, 0);
    ctx.lineTo(x + distortion, size.height);
    ctx.stroke();
  }
}

// Visualiseur audio : barres en bas du canvas
function drawAudioBars(ctx: CanvasRenderingContext2D, size: RenderSize, frequencyData: Uint8Array) {
  const barWidth = size.width / frequencyData.length;
  const frequencyStep = Math.ceil(frequencyData.length / 32);
  ctx.fillStyle = 'rgba(100, 100, 255, 0.15)';
  for (let i = 0; i < frequencyData.length; i += frequencyStep) {
    const barHeight = (frequencyData[i] / 255) * 150;
    if (barHeight > 5) {
      ctx.fillRect(
        i * barWidth * frequencyStep,
        size.height,
        barWidth * frequencyStep - 1,
        -barHeight
      );
    }
  }
}

// Lignes orbitales du power-up Magnet autour du curseur
function drawMagnetLines(ctx: CanvasRenderingContext2D, mousePosition: Point) {
  ctx.beginPath();
  for (let i = 0; i < 360; i += 45) {
    const angle = Date.now() / 1000 + (i * Math.PI) / 180;
    const r = 100 + Math.sin(Date.now() / 200) * 20;
    const x = mousePosition.x + Math.cos(angle) * r;
    const y = mousePosition.y + Math.sin(angle) * r;
    ctx.moveTo(x, y);
    ctx.lineTo(mousePosition.x, mousePosition.y);
  }
  ctx.strokeStyle = `rgba(148, 0, 211, 0.2)`;
  ctx.lineWidth = 2;
  ctx.stroke();
}

// Couleur et symbole d'un power-up
function getPowerUpStyle(type: PowerUpType): { color: string; symbol: string } {
  switch (type) {
    case PowerUpType.FIREBALL:
      return { color: '#FF4500', symbol: '🔥' };
    case PowerUpType.MAGNET:
      return { color: '#9400D3', symbol: '🧲' };
    case PowerUpType.SLOW_MO:
      return { color: '#32CD32', symbol: '⏰' };
    case PowerUpType.LIFE:
      return { color: '#FF0000', symbol: '♥' };
    case PowerUpType.SHIELD:
      return { color: '#00CED1', symbol: '🛡️' };
    default:
      return { color: '#fff', symbol: '?' };
  }
}

function drawPowerUps(ctx: CanvasRenderingContext2D, powerUps: GameState['powerUps']) {
  powerUps.forEach((pu) => {
    if (pu.active) {
      ctx.beginPath();
      ctx.arc(pu.position.x, pu.position.y, pu.radius, 0, Math.PI * 2);
      const { color, symbol } = getPowerUpStyle(pu.type);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.shadowColor = color;
      ctx.shadowBlur = 15;
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#fff';
      ctx.font = '24px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(symbol, pu.position.x, pu.position.y);
    }
  });
}

// Patterns (cibles) avec halo radial et pulsation quand ils sont actifs
function drawPatterns(ctx: CanvasRenderingContext2D, patterns: GameState['patterns']) {
  patterns.forEach((pattern) => {
    if (pattern.active || (!pattern.active && pattern.wasHit)) {
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

      ctx.strokeStyle = pattern.color;
      ctx.lineWidth = 2;
      ctx.stroke();

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

      // Active Pulse
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
      ctx.globalAlpha = 1;
    }
  });
}

// Effets de frappe : anneaux, particules (POWERUP / PERFECT) et texte de qualité
function drawHitEffects(ctx: CanvasRenderingContext2D, hitEffects: HitEffect[]) {
  hitEffects.forEach((effect) => {
    const timeSinceHit = Date.now() - effect.startTime;
    const duration = 800;
    const progress = Math.min(1, timeSinceHit / duration);

    if (progress < 1) {
      let color = effect.color.startsWith('#') ? effect.color : `#${effect.color}`;
      if (effect.quality === 'POWERUP') color = '#FFD700';

      const opacity = 1 - progress;
      const currentRadius = effect.radius * (1 + progress * 2);

      // Rings
      ctx.beginPath();
      ctx.arc(effect.position.x, effect.position.y, currentRadius, 0, Math.PI * 2);
      ctx.strokeStyle = color;
      ctx.globalAlpha = opacity;
      ctx.lineWidth = 4 * (1 - progress);
      ctx.stroke();

      // Blast Particles
      if (effect.quality === 'POWERUP' || effect.quality === 'PERFECT') {
        for (let i = 0; i < 8; i++) {
          const angle = (i / 8) * Math.PI * 2;
          const px = effect.position.x + Math.cos(angle) * (currentRadius * 0.8);
          const py = effect.position.y + Math.sin(angle) * (currentRadius * 0.8);
          ctx.beginPath();
          ctx.arc(px, py, 4 * (1 - progress), 0, Math.PI * 2);
          ctx.fillStyle = color;
          ctx.fill();
        }
      }

      // Text
      ctx.font = 'bold 24px Arial';
      ctx.fillStyle = effect.quality === 'MISS' ? '#ff0000' : color;
      ctx.textAlign = 'center';
      ctx.globalAlpha = opacity;
      ctx.fillText(effect.quality, effect.position.x, effect.position.y - 40 - progress * 30);
      ctx.globalAlpha = 1;
    }
  });
}

// Curseur : halo du bouclier (si actif) puis disque lumineux
function drawCursor(ctx: CanvasRenderingContext2D, mousePosition: Point, shieldActive: boolean) {
  const cursorRadius = 15;

  // Halo for Shield
  if (shieldActive) {
    ctx.beginPath();
    ctx.arc(mousePosition.x, mousePosition.y, cursorRadius + 15, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(0, 206, 209, ${0.5 + Math.sin(Date.now() / 200) * 0.3})`;
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.stroke();
    ctx.setLineDash([]);
  }

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

  ctx.beginPath();
  ctx.arc(mousePosition.x, mousePosition.y, cursorRadius, 0, Math.PI * 2);
  ctx.fillStyle = gradient;
  ctx.fill();

  ctx.beginPath();
  ctx.arc(mousePosition.x, mousePosition.y, cursorRadius + 2, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(200, 200, 255, 0.3)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

// Flash plein écran et onde de choc de l'explosion fireball. false si l'explosion est terminée.
function drawFireballExplosion(
  ctx: CanvasRenderingContext2D,
  size: RenderSize,
  startTime: number
): boolean {
  const timeSinceExplosion = Date.now() - startTime;
  const duration = 1000;
  if (timeSinceExplosion >= duration) return false;

  const progress = timeSinceExplosion / duration; // 0 to 1
  const flashOpacity = Math.max(0, 0.4 - progress); // Start at 0.4 opacity, fade to 0

  // Full Screen Heat Flash
  ctx.fillStyle = `rgba(255, 69, 0, ${flashOpacity})`;
  ctx.fillRect(0, 0, size.width, size.height);

  // Expanding Shockwave Ring
  const maxRadius = Math.max(size.width, size.height);
  const shockwaveRadius = progress * maxRadius;

  ctx.beginPath();
  ctx.arc(size.width / 2, size.height / 2, shockwaveRadius, 0, Math.PI * 2);
  ctx.strokeStyle = `rgba(255, 140, 0, ${1 - progress})`;
  ctx.lineWidth = 50 * (1 - progress);
  ctx.stroke();
  return true;
}

const GameCanvas: React.FC<GameCanvasProps> = ({
  gameState,
  onCollision,
  onCursorMove,
  onHitRef,
  isAudioActive,
  onStart,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });

  // Visual Effects State
  const [hitEffects, setHitEffects] = useState<
    Array<{
      id: number;
      position: Point;
      quality: HitQuality;
      startTime: number;
      radius: number;
      color: string;
    }>
  >([]);

  // Fireball Explosion State
  const [fireballExplosion, setFireballExplosion] = useState<{
    startTime: number;
    color: string;
  } | null>(null);

  // Expose setHitEffect via ref
  useEffect(() => {
    if (onHitRef) {
      onHitRef.current = (
        position: Point,
        quality: HitQuality,
        radius?: number,
        color?: string,
        type?: PowerUpType
      ) => {
        const id = Date.now() + Math.random();

        // Trigger Fireball Explosion
        if (type === PowerUpType.FIREBALL) {
          setFireballExplosion({
            startTime: Date.now(),
            color: '#FF4500',
          });

          // Shake effect logic could go here if we had access to container style, but canvas shake is harder.
        }

        setHitEffects((prev) => [
          ...prev,
          {
            id,
            position,
            quality,
            startTime: Date.now(),
            radius: radius || 30,
            color: color || '#fff',
          },
        ]);

        // Cleanup after 1s
        setTimeout(() => setHitEffects(withoutId(id)), 1000);
      };
    }
    return () => {
      if (onHitRef) onHitRef.current = null;
    };
  }, [onHitRef]);

  // Helper for click check
  const isClickOnButton = (target: EventTarget | null): boolean => {
    if (!target || !(target instanceof Element)) return false;
    const button = target.closest('button');
    return (
      button !== null &&
      (button.classList.contains('controlButton') ||
        button.classList.contains('volumeButton') ||
        button.closest('.controls') !== null)
    );
  };

  // Resize
  useEffect(() => {
    const updateCanvasSize = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        setCanvasSize({ width, height });
      }
    };
    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);
    return () => window.removeEventListener('resize', updateCanvasSize);
  }, []);

  // Mouse/Cursor Tracking
  const [mousePosition, setMousePosition] = useState<Point | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const pos = { x: e.clientX - rect.left, y: e.clientY - rect.top };

      // Check if hovering button
      if (isClickOnButton(e.target)) {
        // Maybe hide custom cursor if hovering button?
        // setMousePosition(null);
        // return;
        // No, user prefers cursor visible but button clickable.
      }

      setMousePosition(pos);
      if (onCursorMove) onCursorMove(pos);
    };
    const handleMouseLeave = () => setMousePosition(null);

    container.addEventListener('mousemove', handleMouseMove);
    container.addEventListener('mouseleave', handleMouseLeave);
    return () => {
      container.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [onCursorMove]);

  // Touch/Click Handling
  const touchHandledRef = useRef(false);
  const lastClickTimeRef = useRef(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleClick = (e: MouseEvent) => {
      // Very Important: If on button, let it pass through (don't handle game click)
      if (isClickOnButton(e.target)) return;

      const now = Date.now();
      if (now - lastClickTimeRef.current < 50) return;
      lastClickTimeRef.current = now;
      if (touchHandledRef.current) {
        touchHandledRef.current = false;
        return;
      }

      // Start game logic
      if (!gameState.isActive && onStart && !gameState.isGameOver) {
        // Optional
      }

      const rect = containerRef.current!.getBoundingClientRect();
      const clickPos = { x: e.clientX - rect.left, y: e.clientY - rect.top };

      const EDGE_TOLERANCE = 20;
      const clampedPos = {
        x: Math.max(-EDGE_TOLERANCE, Math.min(rect.width + EDGE_TOLERANCE, clickPos.x)),
        y: Math.max(-EDGE_TOLERANCE, Math.min(rect.height + EDGE_TOLERANCE, clickPos.y)),
      };

      onCollision(clampedPos, now, clickPos);
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (isClickOnButton(e.target)) return;

      const now = Date.now();
      if (now - lastClickTimeRef.current < 50) {
        e.preventDefault();
        return;
      }
      lastClickTimeRef.current = now;
      touchHandledRef.current = true;
      setTimeout(() => {
        touchHandledRef.current = false;
      }, 300);

      if (e.touches.length > 0) {
        const rect = containerRef.current!.getBoundingClientRect();
        const touchPos = {
          x: e.touches[0].clientX - rect.left,
          y: e.touches[0].clientY - rect.top,
        };

        setMousePosition(touchPos);
        if (onCursorMove) onCursorMove(touchPos);

        const EDGE_TOLERANCE = 20;
        const clampedPos = {
          x: Math.max(-EDGE_TOLERANCE, Math.min(rect.width + EDGE_TOLERANCE, touchPos.x)),
          y: Math.max(-EDGE_TOLERANCE, Math.min(rect.height + EDGE_TOLERANCE, touchPos.y)),
        };

        onCollision(clampedPos, now, touchPos);
        e.preventDefault();
      }
    };

    container.addEventListener('click', handleClick);
    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    return () => {
      container.removeEventListener('click', handleClick);
      container.removeEventListener('touchstart', handleTouchStart);
    };
  }, [gameState.isActive, gameState.isGameOver, onCollision, onStart, onCursorMove]);

  // --- RENDER LOOP ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvasSize.width, canvasSize.height);

    // Background
    ctx.fillStyle = 'rgba(10, 10, 15, 0.8)';
    ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);

    // Grid Distortion for SlowMo
    const distortion = gameState.activePowerUps.slowMo ? Math.sin(Date.now() / 500) * 10 : 0;
    drawGrid(ctx, canvasSize, distortion);

    if (isAudioActive && gameState.frequencyData) {
      drawAudioBars(ctx, canvasSize, gameState.frequencyData);
    }

    if (gameState.activePowerUps.magnet && mousePosition) {
      drawMagnetLines(ctx, mousePosition);
    }

    drawPowerUps(ctx, gameState.powerUps);

    drawPatterns(ctx, gameState.patterns);

    drawHitEffects(ctx, hitEffects);

    // FIREBALL BLAST FULL SCREEN FLASH
    if (fireballExplosion && !drawFireballExplosion(ctx, canvasSize, fireballExplosion.startTime)) {
      setFireballExplosion(null);
    }

    if (mousePosition) {
      drawCursor(ctx, mousePosition, gameState.activePowerUps.shield);
    }

    // Score overlay for desktop
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

    // Game Over Overlay
    if (gameState.isGameOver) {
      ctx.fillStyle = 'rgba(100, 0, 0, 0.3)';
      ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);
    }
  }, [canvasSize, gameState, hitEffects, isAudioActive, mousePosition, fireballExplosion]);

  return (
    <div ref={containerRef} className={styles.canvasContainer}>
      <canvas
        ref={canvasRef}
        width={canvasSize.width}
        height={canvasSize.height}
        className={styles.gameCanvas}
      />
    </div>
  );
};

/** Retire d'une liste l'élément d'identifiant `id`. */
const withoutId =
  (id: string | number) =>
  <T extends { id: string | number }>(list: T[]): T[] =>
    list.filter((e) => e.id !== id);

export default GameCanvas;
