import { render } from '@testing-library/react';
import GameVisualizer from '../GameVisualizer';

// Mock all hooks
jest.mock('@/hooks/game/useBeatVisuals', () => ({
  useBeatVisuals: () => ({
    beatVisuals: [],
    checkAndAddBeat: jest.fn(),
    updateAndDrawBeats: jest.fn(),
  }),
}));

jest.mock('@/hooks/game/useCanvasRenderer', () => ({
  useCanvasRenderer: () => ({
    animate: jest.fn(),
    drawPlayer: jest.fn(),
    drawPattern: jest.fn(),
  }),
}));

jest.mock('@/hooks/game/useCollisionDetection', () => ({
  useCollisionDetection: () => ({
    checkCollisions: jest.fn(),
  }),
}));

jest.mock('@/hooks/game/useFrequencyLanes', () => ({
  useFrequencyLanes: () => ({
    drawLanes: jest.fn(),
  }),
}));

jest.mock('@/hooks/game/usePlayerPosition', () => ({
  usePlayerPosition: () => ({
    playerRef: { current: { x: 100, y: 200 } },
    updatePosition: jest.fn(),
    getPosition: jest.fn(() => ({ x: 100, y: 200 })),
    setInitialPosition: jest.fn(),
  }),
}));

jest.mock('@/hooks/game/usePointAnimations', () => ({
  usePointAnimations: () => ({
    addAnimation: jest.fn(),
    updateAnimations: jest.fn(),
  }),
}));

jest.mock('@/hooks/game/useScreenShake', () => ({
  useScreenShake: () => ({
    screenShake: { active: false, intensity: 0 },
    triggerShake: jest.fn(),
    updateShake: jest.fn(),
    getShakeOffset: jest.fn(() => ({ x: 0, y: 0 })),
  }),
}));

// Mock ParticleSystem
jest.mock('../ParticleSystem', () => ({
  __esModule: true,
  default: () => <div data-testid="particle-system">Particle System</div>,
}));

// Mock ScoreDisplay
jest.mock('../ScoreDisplay', () => ({
  __esModule: true,
  default: () => <div data-testid="score-display">Score Display</div>,
}));

// Mock logger
jest.mock('@/lib/logger', () => ({
  logger: {
    debug: jest.fn(),
    error: jest.fn(),
  },
}));

describe('GameVisualizer', () => {
  const mockGameData = {
    patterns: [],
    audioData: new Uint8Array(256),
    handleCollision: jest.fn(),
    gameState: {
      isActive: true,
      score: 0,
      combo: 0,
      highScore: 0,
      perfectHits: 0,
      goodHits: 0,
      okHits: 0,
      totalNotes: 0,
    },
    setPlayerPosition: jest.fn(),
    currentBpm: 120,
    beatConfidence: 0.8,
    startGame: jest.fn(),
    endGame: jest.fn(),
    simpleUpdateGame: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render game visualizer', () => {
    const { container } = render(<GameVisualizer gameData={mockGameData} audioElement={null} />);
    const canvas = container.querySelector('canvas');
    expect(canvas).toBeInTheDocument();
  });

  it('should render with active game state', () => {
    const { container } = render(
      <GameVisualizer
        gameData={{ ...mockGameData, gameState: { ...mockGameData.gameState, isActive: true } }}
        audioElement={null}
      />
    );
    const canvas = container.querySelector('canvas');
    expect(canvas).toBeInTheDocument();
  });

  it('should handle patterns', () => {
    const gameDataWithPatterns = {
      ...mockGameData,
      patterns: [
        {
          timestamp: Date.now(),
          type: 'collect' as const,
          position: { x: 100, y: 200 },
          lane: 'mid' as const,
          size: 20,
        },
      ],
    };

    const { container } = render(
      <GameVisualizer gameData={gameDataWithPatterns} audioElement={null} />
    );
    const canvas = container.querySelector('canvas');
    expect(canvas).toBeInTheDocument();
  });
});
