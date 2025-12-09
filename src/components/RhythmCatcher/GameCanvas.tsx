'use client';

import { motion } from 'framer-motion';
import React, { useRef, useEffect, useState } from 'react';

import { logger } from '@/lib/logger';

import { GameState, Point, HitQuality, PowerUpType } from './gameEngine';
import styles from './styles.module.css';

interface GameCanvasProps {
  gameState: GameState;
  onCollision: (position: Point, time: number, actualPosition?: Point) => void;
  onCursorMove?: (position: Point) => void;
  onHit?: (position: Point, quality: HitQuality) => void;
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

const GameCanvas: React.FC<GameCanvasProps> = ({
  gameState,
  onCollision,
  onCursorMove,
  onHit,
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
        setTimeout(() => {
          setHitEffects((prev) => prev.filter((e) => e.id !== id));
        }, 1000);
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

    // Grid
    ctx.strokeStyle = 'rgba(90, 90, 120, 0.2)';
    ctx.lineWidth = 1;
    const gridStep = 40;

    // Grid Distortion for SlowMo
    const distortion = gameState.activePowerUps.slowMo ? Math.sin(Date.now() / 500) * 10 : 0;

    for (let y = 0; y < canvasSize.height; y += gridStep) {
      ctx.beginPath();
      ctx.moveTo(0, y + distortion);
      ctx.lineTo(canvasSize.width, y + distortion);
      ctx.stroke();
    }
    for (let x = 0; x < canvasSize.width; x += gridStep) {
      ctx.beginPath();
      ctx.moveTo(x + distortion, 0);
      ctx.lineTo(x + distortion, canvasSize.height);
      ctx.stroke();
    }

    // Audio Visualizer lines
    if (isAudioActive && gameState.frequencyData) {
      const barWidth = canvasSize.width / gameState.frequencyData.length;
      const frequencyStep = Math.ceil(gameState.frequencyData.length / 32);
      ctx.fillStyle = 'rgba(100, 100, 255, 0.15)';
      for (let i = 0; i < gameState.frequencyData.length; i += frequencyStep) {
        const barHeight = (gameState.frequencyData[i] / 255) * 150;
        if (barHeight > 5) {
          ctx.fillRect(
            i * barWidth * frequencyStep,
            canvasSize.height,
            barWidth * frequencyStep - 1,
            -barHeight
          );
        }
      }
    }

    // MAGNET EFFECT PARTICLES directly drawn
    if (gameState.activePowerUps.magnet && mousePosition) {
      // Draw Lines to Cursor
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

    // RENDER POWERUPS
    gameState.powerUps.forEach((pu) => {
      if (pu.active) {
        ctx.beginPath();
        ctx.arc(pu.position.x, pu.position.y, pu.radius, 0, Math.PI * 2);
        let color = '#fff';
        let symbol = '?';
        switch (pu.type) {
          case PowerUpType.FIREBALL:
            color = '#FF4500';
            symbol = '🔥';
            break;
          case PowerUpType.MAGNET:
            color = '#9400D3';
            symbol = '🧲';
            break;
          case PowerUpType.SLOW_MO:
            color = '#32CD32';
            symbol = '⏰';
            break;
          case PowerUpType.LIFE:
            color = '#FF0000';
            symbol = '♥';
            break;
          case PowerUpType.SHIELD:
            color = '#00CED1';
            symbol = '🛡️';
            break;
        }
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

    // RENDER PATTERNS
    gameState.patterns.forEach((pattern) => {
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

    // RENDER HIT EFFECTS
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

    // FIREBALL BLAST FULL SCREEN FLASH
    if (fireballExplosion) {
      const timeSinceExplosion = Date.now() - fireballExplosion.startTime;
      const duration = 1000;

      if (timeSinceExplosion < duration) {
        const progress = timeSinceExplosion / duration; // 0 to 1
        const flashOpacity = Math.max(0, 0.4 - progress); // Start at 0.4 opacity, fade to 0

        // Full Screen Heat Flash
        ctx.fillStyle = `rgba(255, 69, 0, ${flashOpacity})`;
        ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);

        // Expanding Shockwave Ring
        const maxRadius = Math.max(canvasSize.width, canvasSize.height);
        const shockwaveRadius = progress * maxRadius;

        ctx.beginPath();
        ctx.arc(canvasSize.width / 2, canvasSize.height / 2, shockwaveRadius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255, 140, 0, ${1 - progress})`;
        ctx.lineWidth = 50 * (1 - progress);
        ctx.stroke();
      } else {
        setFireballExplosion(null);
      }
    }

    // CURSOR
    if (mousePosition) {
      const cursorRadius = 15;

      // Halo for Shield
      if (gameState.activePowerUps.shield) {
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

export default GameCanvas;
