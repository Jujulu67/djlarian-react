import { render, screen } from '@testing-library/react';
import RhythmCatcher from '../index';

// Mock dependencies
jest.mock('../GameCanvas', () => ({
  __esModule: true,
  default: () => <div data-testid="game-canvas">Game Canvas</div>,
}));

jest.mock('../ScorePanel', () => ({
  __esModule: true,
  default: () => <div data-testid="score-panel">Score Panel</div>,
}));

jest.mock('../gameEngine', () => ({
  initializeGame: jest.fn(() => ({
    isActive: false,
    patterns: [],
    player: { score: 0, combo: 0 },
  })),
  updateGame: jest.fn(),
  handleCollision: jest.fn(),
  checkCollisions: jest.fn(),
  detectBPM: jest.fn(() => 120),
}));

// Mock logger
jest.mock('@/lib/logger', () => ({
  logger: {
    debug: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

describe('RhythmCatcher', () => {
  beforeEach(() => {
    // Mock window.innerWidth
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024,
    });
  });

  it('should render rhythm catcher', () => {
    render(<RhythmCatcher />);
    expect(screen.getByTestId('game-canvas')).toBeInTheDocument();
  });

  it('should render with audio source', () => {
    render(<RhythmCatcher audioSrc="/test.mp3" />);
    expect(screen.getByTestId('game-canvas')).toBeInTheDocument();
  });

  it('should handle mobile viewport', () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 500,
    });

    render(<RhythmCatcher />);
    expect(screen.getByTestId('game-canvas')).toBeInTheDocument();
  });
});
