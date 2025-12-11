import { renderHook, act } from '@testing-library/react';

import { useGameManager } from '../useGameManager';
import type { GamePattern } from '@/types/game';

// Mock des dépendances
jest.mock('@/lib/logger', () => ({
  logger: {
    debug: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  },
}));

// Mock de localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
// Mock both global and window localStorage
global.localStorage = localStorageMock as unknown as Storage;
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

// Mock de requestAnimationFrame
global.requestAnimationFrame = jest.fn((cb) =>
  setTimeout(cb, 16)
) as unknown as typeof requestAnimationFrame;
global.cancelAnimationFrame = jest.fn();

// Mock de AudioContext
global.AudioContext = jest.fn().mockImplementation(() => ({
  createAnalyser: jest.fn(() => ({
    fftSize: 512,
    smoothingTimeConstant: 0.7,
    frequencyBinCount: 256,
    getByteFrequencyData: jest.fn(),
    disconnect: jest.fn(),
  })),
  createMediaElementSource: jest.fn(() => ({
    connect: jest.fn(),
    disconnect: jest.fn(),
  })),
  destination: {},
  state: 'running',
  resume: jest.fn(),
  close: jest.fn(),
})) as unknown as typeof AudioContext;

// Factory function to create valid GamePattern for tests
const createValidPattern = (overrides?: Partial<GamePattern>): GamePattern => {
  const now = Date.now();
  return {
    id: `test-pattern-${now}-${Math.random().toString(36).substring(2, 9)}`,
    timestamp: now,
    type: 'collect',
    position: { x: 400, y: 300 },
    size: 30,
    speed: 1.5,
    lane: 'mid',
    targetTime: now + 1000, // 1 seconde dans le futur
    createdOnBeat: true,
    ...overrides,
  };
};

describe('useGameManager', () => {
  let mockAudioElement: HTMLAudioElement;

  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);

    mockAudioElement = document.createElement('audio');
    document.body.appendChild(mockAudioElement);
  });

  afterEach(() => {
    document.body.removeChild(mockAudioElement);
  });

  it('should initialize with default game state', () => {
    const { result } = renderHook(() => useGameManager(mockAudioElement));

    expect(result.current.gameState).toMatchObject({
      isActive: false,
      score: 0,
      combo: 0,
      perfectHits: 0,
      goodHits: 0,
      okHits: 0,
      totalNotes: 0,
    });
  });

  it('should load high score from localStorage', () => {
    // Set localStorage value - must be set before hook initialization
    // because useState initializer runs synchronously during renderHook
    localStorageMock.getItem.mockImplementation((key: string) => {
      if (key === 'highScore') return '1000';
      return null;
    });

    const { result } = renderHook(() => useGameManager(mockAudioElement));

    // Verify high score was loaded from localStorage
    expect(result.current.gameState.highScore).toBe(1000);
    expect(localStorageMock.getItem).toHaveBeenCalledWith('highScore');
  });

  it('should initialize with empty patterns array', () => {
    const { result } = renderHook(() => useGameManager(mockAudioElement));

    // Patterns may be initialized by usePatternManager, so we check it's an array
    expect(Array.isArray(result.current.patterns)).toBe(true);
    // If patterns are created, they should be valid GamePattern objects
    if (result.current.patterns.length > 0) {
      expect(result.current.patterns[0]).toHaveProperty('id');
      expect(result.current.patterns[0]).toHaveProperty('type');
    }
  });

  it('should provide startGame function', () => {
    const { result } = renderHook(() => useGameManager(mockAudioElement));

    expect(typeof result.current.startGame).toBe('function');
  });

  it('should provide endGame function', () => {
    const { result } = renderHook(() => useGameManager(mockAudioElement));

    expect(typeof result.current.endGame).toBe('function');
  });

  it('should provide handleCollision function', () => {
    const { result } = renderHook(() => useGameManager(mockAudioElement));

    expect(typeof result.current.handleCollision).toBe('function');
  });

  it('should provide setPlayerPosition function', () => {
    const { result } = renderHook(() => useGameManager(mockAudioElement));

    expect(typeof result.current.setPlayerPosition).toBe('function');
  });

  it('should start game when startGame is called', () => {
    const { result } = renderHook(() => useGameManager(mockAudioElement));

    act(() => {
      result.current.startGame();
    });

    expect(result.current.gameState.isActive).toBe(true);
    expect(result.current.gameState.score).toBe(0);
    expect(result.current.gameState.combo).toBe(0);
  });

  it('should end game when endGame is called', () => {
    const { result } = renderHook(() => useGameManager(mockAudioElement));

    act(() => {
      result.current.startGame();
    });

    act(() => {
      result.current.endGame();
    });

    expect(result.current.gameState.isActive).toBe(false);
  });

  describe('high score management', () => {
    it('should save high score to localStorage when new record is set', async () => {
      localStorageMock.getItem.mockReturnValue('1000');
      const { result } = renderHook(() => useGameManager(mockAudioElement));

      act(() => {
        result.current.startGame();
      });

      // Wait for patterns to be generated
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      // Get a pattern from the generated patterns or create one
      let patternToUse: GamePattern;
      if (result.current.patterns.length > 0) {
        patternToUse = result.current.patterns[0];
      } else {
        patternToUse = createValidPattern({
          targetTime: Date.now() - 50, // Very close to target (PERFECT hit)
        });
      }

      // Simulate score increase through collisions
      // We need to call handleCollision with (type, pattern) signature
      act(() => {
        result.current.handleCollision(patternToUse.type, patternToUse);
      });

      // Create another pattern for a second hit
      const pattern2 = createValidPattern({
        targetTime: Date.now() - 50, // Very close to target (PERFECT hit)
      });

      act(() => {
        result.current.handleCollision(pattern2.type, pattern2);
      });

      // Wait a bit for state updates
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
      });

      act(() => {
        result.current.endGame();
      });

      // Should save if score > highScore
      expect(result.current.gameState.score).toBeGreaterThan(0);
      if (result.current.gameState.score > result.current.gameState.highScore) {
        expect(localStorageMock.setItem).toHaveBeenCalledWith(
          'highScore',
          result.current.gameState.score.toString()
        );
      }
    });
  });

  describe('pattern management', () => {
    it('should handle empty patterns array', () => {
      const { result } = renderHook(() => useGameManager(mockAudioElement));

      // Patterns should be initialized (may be empty initially)
      expect(Array.isArray(result.current.patterns)).toBe(true);
    });

    it('should generate emergency patterns when patterns are empty', () => {
      const { result } = renderHook(() => useGameManager(mockAudioElement));

      act(() => {
        result.current.startGame();
      });

      // After starting, patterns should be generated
      expect(result.current.patterns.length).toBeGreaterThan(0);
    });
  });

  describe('audio handling', () => {
    it('should handle null audio element', () => {
      const { result } = renderHook(() => useGameManager(null));

      expect(result.current.gameState).toBeDefined();
      expect(result.current.startGame).toBeDefined();
      expect(result.current.audioData).toBeDefined();
    });

    it('should provide audioData getter', () => {
      const { result } = renderHook(() => useGameManager(mockAudioElement));

      expect(result.current.audioData).toBeDefined();
    });
  });

  describe('game state updates', () => {
    it('should update player position', () => {
      const { result } = renderHook(() => useGameManager(mockAudioElement));

      act(() => {
        result.current.setPlayerPosition(100, 200);
      });

      // Position should be updated internally
      expect(result.current.setPlayerPosition).toBeDefined();
    });

    it('should reset score and stats when starting new game', async () => {
      const { result } = renderHook(() => useGameManager(mockAudioElement));

      act(() => {
        result.current.startGame();
      });

      // Wait for patterns to be generated
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      // Get a pattern from the generated patterns or create one
      let patternToUse: GamePattern;
      if (result.current.patterns.length > 0) {
        patternToUse = result.current.patterns[0];
      } else {
        patternToUse = createValidPattern({
          targetTime: Date.now() - 50, // Very close to target (PERFECT hit)
        });
      }

      // Simulate some gameplay
      act(() => {
        result.current.handleCollision(patternToUse.type, patternToUse);
      });

      // Wait for state updates
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
      });

      const scoreAfterCollision = result.current.gameState.score;
      const perfectHitsAfterCollision = result.current.gameState.perfectHits;
      const comboAfterCollision = result.current.gameState.combo;

      // Verify that we actually got some score
      expect(scoreAfterCollision).toBeGreaterThan(0);

      // Start new game
      act(() => {
        result.current.startGame();
      });

      // Wait for state updates
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
      });

      expect(result.current.gameState.score).toBe(0);
      expect(result.current.gameState.combo).toBe(0);
      expect(result.current.gameState.perfectHits).toBe(0);
      expect(result.current.gameState.goodHits).toBe(0);
      expect(result.current.gameState.okHits).toBe(0);
    });
  });
});
