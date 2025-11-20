import React from 'react';

interface GridRendererProps {
  ctx: CanvasRenderingContext2D;
  canvasWidth: number;
  canvasHeight: number;
}

/**
 * Component to render the reference grid on the canvas
 */
export const GridRenderer: React.FC<GridRendererProps> = ({ ctx, canvasWidth, canvasHeight }) => {
  ctx.strokeStyle = 'rgba(50, 50, 50, 0.3)';
  ctx.lineWidth = 1;

  // Horizontal lines
  for (let y = 0; y < canvasHeight; y += 100) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvasWidth, y);
    ctx.stroke();

    // Add coordinates
    ctx.fillStyle = 'rgba(150, 150, 150, 0.5)';
    ctx.font = '10px Arial';
    ctx.fillText(`y: ${y}`, 5, y + 12);
  }

  // Vertical lines
  for (let x = 0; x < canvasWidth; x += 100) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvasHeight);
    ctx.stroke();

    // Add coordinates
    ctx.fillStyle = 'rgba(150, 150, 150, 0.5)';
    ctx.font = '10px Arial';
    ctx.fillText(`x: ${x}`, x + 2, 10);
  }

  return null;
};

