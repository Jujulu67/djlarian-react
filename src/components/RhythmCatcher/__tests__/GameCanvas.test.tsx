import { render, screen } from '@testing-library/react';
import GameCanvas from '../GameCanvas';
import { initializeGame } from '../gameEngine';

// Mock gameEngine
jest.mock('../gameEngine', () => ({
  initializeGame: jest.fn(() => ({
    isActive: false,
    patterns: [],
    powerUps: [],
    player: { score: 0, combo: 0, radius: 10, position: { x: 100, y: 100 } },
    activePowerUps: {
      magnet: false,
      slowMo: false,
      shield: false,
    },
  })),
  updateGame: jest.fn(),
  handleCollision: jest.fn(),
  checkCollisions: jest.fn(),
}));

// Mock canvas getContext
HTMLCanvasElement.prototype.getContext = jest.fn(() => ({
  clearRect: jest.fn(),
  fillRect: jest.fn(),
  beginPath: jest.fn(),
  arc: jest.fn(),
  fill: jest.fn(),
  stroke: jest.fn(),
  moveTo: jest.fn(),
  lineTo: jest.fn(),
  fillText: jest.fn(),
  save: jest.fn(),
  restore: jest.fn(),
  translate: jest.fn(),
  rotate: jest.fn(),
  createRadialGradient: jest.fn(() => ({
    addColorStop: jest.fn(),
  })),
  fillStyle: '',
  strokeStyle: '',
  lineWidth: 0,
  font: '',
  globalAlpha: 1,
})) as any;

describe('GameCanvas', () => {
  const mockGameState = initializeGame(800, 600);
  const mockOnCollision = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render game canvas', () => {
    render(
      <GameCanvas gameState={mockGameState} onCollision={mockOnCollision} isAudioActive={false} />
    );

    const canvas = document.querySelector('canvas');
    expect(canvas).toBeInTheDocument();
  });

  it('should render with active game state', () => {
    const activeGameState = { ...mockGameState, isActive: true };
    render(
      <GameCanvas gameState={activeGameState} onCollision={mockOnCollision} isAudioActive={true} />
    );

    const canvas = document.querySelector('canvas');
    expect(canvas).toBeInTheDocument();
  });

  it('should handle onStart callback', () => {
    const mockOnStart = jest.fn();
    render(
      <GameCanvas
        gameState={mockGameState}
        onCollision={mockOnCollision}
        isAudioActive={false}
        onStart={mockOnStart}
      />
    );

    expect(document.querySelector('canvas')).toBeInTheDocument();
  });
});
