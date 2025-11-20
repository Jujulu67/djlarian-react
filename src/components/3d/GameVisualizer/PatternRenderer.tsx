import React from 'react';
import type { GamePattern } from '@/types/game';

interface PatternRendererProps {
  pattern: GamePattern;
  ctx: CanvasRenderingContext2D;
  canvasWidth: number;
  canvasHeight: number;
}

/**
 * Component to render a single pattern on the canvas
 */
export const PatternRenderer: React.FC<PatternRendererProps> = ({
  pattern,
  ctx,
  canvasWidth,
}) => {
  // Validate pattern position
  if (
    !pattern.position ||
    typeof pattern.position.x !== 'number' ||
    typeof pattern.position.y !== 'number'
  ) {
    return null;
  }

  // Check if pattern is within canvas bounds
  if (pattern.position.x < -50 || pattern.position.x > canvasWidth + 50) {
    return null;
  }

  // Render disintegrating pattern
  if (pattern.isDisintegrating) {
    const age = Date.now() - (pattern.disintegrateStartTime || Date.now());
    const duration = pattern.disintegrateDuration || 500;
    const progress = Math.min(1, age / duration);

    const originalSize = pattern.size || 20;
    const size = originalSize * (1 + progress);

    // Apply style based on pattern type and accuracy
    let color: string;
    let ringColor: string;

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

    // Draw main circle fading out
    ctx.beginPath();
    ctx.arc(pattern.position.x, pattern.position.y, size / 2, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();

    // Add expanding ring
    if (pattern.accuracyType) {
      ctx.beginPath();
      ctx.arc(pattern.position.x, pattern.position.y, size, 0, Math.PI * 2);
      ctx.strokeStyle = ringColor;
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    return null;
  }

  // Render normal pattern
  let color: string;
  let shadowColor: string;
  let glowSize: number = 0;

  switch (pattern.type) {
    case 'golden':
      color = '#FFD700';
      shadowColor = 'rgba(255, 215, 0, 0.5)';
      glowSize = 10;
      break;
    case 'blue':
      color = '#00AAFF';
      shadowColor = 'rgba(0, 170, 255, 0.5)';
      glowSize = 8;
      break;
    case 'collect':
      color = '#D345FF';
      shadowColor = 'rgba(211, 69, 255, 0.5)';
      glowSize = 5;
      break;
    case 'avoid':
      color = '#FF4444';
      shadowColor = 'rgba(255, 68, 68, 0.5)';
      break;
    case 'enemy':
      color = '#FF2222';
      shadowColor = 'rgba(255, 34, 34, 0.5)';
      break;
    default:
      color = '#FFFFFF';
      shadowColor = 'rgba(255, 255, 255, 0.5)';
  }

  // Add pulse effect on beat
  let sizeModifier = 0;
  if (pattern.createdOnBeat) {
    const pulseDuration = 500; // ms
    const age = Date.now() - pattern.timestamp;
    if (age < pulseDuration) {
      const pulseProgress = age / pulseDuration;
      sizeModifier = Math.sin(pulseProgress * Math.PI) * 5;
    }
  }

  // Add glow effect for special patterns
  if (glowSize > 0) {
    ctx.shadowColor = shadowColor;
    ctx.shadowBlur = glowSize;
  }

  // Draw main circle
  ctx.beginPath();
  ctx.arc(
    pattern.position.x,
    pattern.position.y,
    (pattern.size || 20) / 2 + sizeModifier,
    0,
    Math.PI * 2
  );
  ctx.fillStyle = color;
  ctx.fill();

  // Reset glow effects
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;

  // Add inner circle for special patterns
  if (pattern.type === 'golden' || pattern.type === 'blue') {
    ctx.beginPath();
    ctx.arc(
      pattern.position.x,
      pattern.position.y,
      (pattern.size || 20) / 4,
      0,
      Math.PI * 2
    );
    ctx.fillStyle = pattern.type === 'golden' ? '#FFFFFF' : '#DDFAFF';
    ctx.fill();
  }

  // Add dashed border for perfect timing window
  if (pattern.targetTime) {
    const timeUntilTarget = pattern.targetTime - Date.now();
    const perfectWindowSize = 100; // ms

    if (Math.abs(timeUntilTarget) < perfectWindowSize) {
      // In perfect window, show bright border
      ctx.beginPath();
      ctx.arc(
        pattern.position.x,
        pattern.position.y,
        (pattern.size || 20) / 2 + 3,
        0,
        Math.PI * 2
      );
      ctx.strokeStyle =
        pattern.type === 'golden'
          ? 'rgba(255, 255, 255, 0.8)'
          : pattern.type === 'blue'
            ? 'rgba(200, 255, 255, 0.8)'
            : 'rgba(255, 200, 255, 0.8)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  // Add debug text
  ctx.font = '10px Arial';
  ctx.fillStyle = 'white';
  ctx.textAlign = 'center';
  ctx.fillText(`${pattern.lane}`, pattern.position.x, pattern.position.y - 15);
  ctx.fillText(
    `${Math.round(pattern.position.x)},${Math.round(pattern.position.y)}`,
    pattern.position.x,
    pattern.position.y + 20
  );

  return null;
};

