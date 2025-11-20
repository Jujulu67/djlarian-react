import React from 'react';

const PLAYER_SIZE = 12;

interface PlayerRendererProps {
  ctx: CanvasRenderingContext2D;
  x: number;
  y: number;
}

/**
 * Component to render the player on the canvas
 */
export const PlayerRenderer: React.FC<PlayerRendererProps> = ({ ctx, x, y }) => {
  ctx.beginPath();
  ctx.arc(x, y, PLAYER_SIZE, 0, Math.PI * 2);

  // Radial gradient for player
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, PLAYER_SIZE);
  gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
  gradient.addColorStop(0.7, 'rgba(230, 230, 255, 0.9)');
  gradient.addColorStop(1, 'rgba(200, 200, 255, 0.7)');

  ctx.fillStyle = gradient;
  ctx.fill();

  // Add halo around player
  ctx.beginPath();
  ctx.arc(x, y, PLAYER_SIZE + 5, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(200, 200, 255, 0.3)';
  ctx.lineWidth = 2;
  ctx.stroke();

  return null;
};

