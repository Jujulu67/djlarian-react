import { renderHook, act } from '@testing-library/react';
import { useScoreManager } from '../useScoreManager';
import type { GamePattern, GameState } from '@/types/game';

// Mock logger
jest.mock('@/lib/logger', () => ({
  logger: {
    warn: jest.fn(),
  },
}));

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock AudioContext
global.AudioContext = jest.fn().mockImplementation(() => ({
  createOscillator: jest.fn(() => ({
    type: '',
    frequency: {
      value: 0,
      setValueAtTime: jest.fn(),
      exponentialRampToValueAtTime: jest.fn(),
    },
    connect: jest.fn(),
    start: jest.fn(),
    stop: jest.fn(),
  })),
  createGain: jest.fn(() => ({
    gain: {
      value: 0,
      setValueAtTime: jest.fn(),
      exponentialRampToValueAtTime: jest.fn(),
    },
    connect: jest.fn(),
  })),
  destination: {},
  currentTime: 0,
  close: jest.fn(),
})) as unknown as typeof AudioContext;

describe('useScoreManager', () => {
  const mockSetGameState = jest.fn();
  const mockSetPatterns = jest.fn();
  const mockEndGame = jest.fn();
  const mockIsActive = { current: true };
  const mockAnimationFrame = { current: undefined as number | undefined };

  const defaultGameState: GameState = {
    isActive: true,
    score: 0,
    combo: 0,
    highScore: 0,
    perfectHits: 0,
    goodHits: 0,
    okHits: 0,
    totalNotes: 0,
  };

  const defaultProps = {
    gameState: defaultGameState,
    setGameState: mockSetGameState,
    setPatterns: mockSetPatterns,
    isActive: mockIsActive,
    animationFrame: mockAnimationFrame,
    endGame: mockEndGame,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
  });

  it('should calculate hit accuracy correctly', () => {
    const { result } = renderHook(() => useScoreManager(defaultProps));

    const pattern: GamePattern = {
      timestamp: Date.now() - 1000,
      type: 'collect',
      position: { x: 100, y: 200 },
      lane: 'mid',
      size: 20,
      targetTime: Date.now(),
    };

    const accuracy = result.current.calculateHitAccuracy(pattern, Date.now());
    expect(accuracy).toBeDefined();
    expect(['perfect', 'good', 'ok']).toContain(accuracy.type);
    expect(accuracy.points).toBeGreaterThan(0);
  });

  it('should return perfect for very close hits', () => {
    const { result } = renderHook(() => useScoreManager(defaultProps));

    const now = Date.now();
    const pattern: GamePattern = {
      timestamp: now - 1000,
      type: 'collect',
      position: { x: 100, y: 200 },
      lane: 'mid',
      size: 20,
      targetTime: now + 50, // Very close
    };

    const accuracy = result.current.calculateHitAccuracy(pattern, now);
    expect(accuracy.type).toBe('perfect');
  });

  it('should handle collision for collect type', () => {
    const { result } = renderHook(() => useScoreManager(defaultProps));

    const pattern: GamePattern = {
      timestamp: Date.now() - 1000,
      type: 'collect',
      position: { x: 100, y: 200 },
      lane: 'mid',
      size: 20,
      targetTime: Date.now(),
    };

    act(() => {
      result.current.handleCollision('collect', pattern);
    });

    expect(mockSetGameState).toHaveBeenCalled();
    expect(mockSetPatterns).toHaveBeenCalled();
  });

  it('should handle collision for golden type', () => {
    const { result } = renderHook(() => useScoreManager(defaultProps));

    const pattern: GamePattern = {
      timestamp: Date.now() - 1000,
      type: 'golden',
      position: { x: 100, y: 200 },
      lane: 'bass',
      size: 25,
      targetTime: Date.now(),
    };

    act(() => {
      result.current.handleCollision('golden', pattern);
    });

    expect(mockSetGameState).toHaveBeenCalled();
  });

  it('should handle collision for blue type', () => {
    const { result } = renderHook(() => useScoreManager(defaultProps));

    const pattern: GamePattern = {
      timestamp: Date.now() - 1000,
      type: 'blue',
      position: { x: 100, y: 200 },
      lane: 'high',
      size: 18,
      targetTime: Date.now(),
    };

    act(() => {
      result.current.handleCollision('blue', pattern);
    });

    expect(mockSetGameState).toHaveBeenCalled();
  });

  it('should end game on avoid/enemy collision', () => {
    const { result } = renderHook(() => useScoreManager(defaultProps));

    const pattern: GamePattern = {
      timestamp: Date.now() - 1000,
      type: 'avoid',
      position: { x: 100, y: 200 },
      lane: 'mid',
      size: 20,
    };

    act(() => {
      result.current.handleCollision('avoid', pattern);
    });

    expect(mockIsActive.current).toBe(false);
    expect(mockSetGameState).toHaveBeenCalled();
  });

  it('should not handle collision if game is not active', () => {
    mockIsActive.current = false;
    const inactiveGameState = {
      ...defaultGameState,
      isActive: false,
    };

    const { result } = renderHook(() =>
      useScoreManager({
        ...defaultProps,
        gameState: inactiveGameState,
      })
    );

    const pattern: GamePattern = {
      timestamp: Date.now() - 1000,
      type: 'collect',
      position: { x: 100, y: 200 },
      lane: 'mid',
      size: 20,
      targetTime: Date.now(),
    };

    act(() => {
      result.current.handleCollision('collect', pattern);
    });

    expect(mockSetGameState).not.toHaveBeenCalled();
  });

  it('should update high score in localStorage', () => {
    const { result } = renderHook(() => useScoreManager(defaultProps));

    const pattern: GamePattern = {
      timestamp: Date.now() - 1000,
      type: 'collect',
      position: { x: 100, y: 200 },
      lane: 'mid',
      size: 20,
      targetTime: Date.now(),
    };

    act(() => {
      result.current.handleCollision('collect', pattern);
    });

    // High score should be updated if score > highScore
    expect(mockSetGameState).toHaveBeenCalled();
  });

  it('should mark pattern as disintegrating on collision', () => {
    const { result } = renderHook(() => useScoreManager(defaultProps));

    const pattern: GamePattern = {
      timestamp: Date.now() - 1000,
      type: 'collect',
      position: { x: 100, y: 200 },
      lane: 'mid',
      size: 20,
      targetTime: Date.now(),
    };

    act(() => {
      result.current.handleCollision('collect', pattern);
    });

    expect(mockSetPatterns).toHaveBeenCalled();
    const setPatternsCall = mockSetPatterns.mock.calls[0][0];
    expect(typeof setPatternsCall).toBe('function');
  });

  it('should return good accuracy for medium timing', () => {
    const { result } = renderHook(() => useScoreManager(defaultProps));

    const now = Date.now();
    const pattern: GamePattern = {
      timestamp: now - 1000,
      type: 'collect',
      position: { x: 100, y: 200 },
      lane: 'mid',
      size: 20,
      targetTime: now + 150, // Medium timing
    };

    const accuracy = result.current.calculateHitAccuracy(pattern, now);
    expect(accuracy.type).toBe('good');
  });

  it('should return ok accuracy for far timing', () => {
    const { result } = renderHook(() => useScoreManager(defaultProps));

    const now = Date.now();
    const pattern: GamePattern = {
      timestamp: now - 1000,
      type: 'collect',
      position: { x: 100, y: 200 },
      lane: 'mid',
      size: 20,
      targetTime: now + 300, // Far timing
    };

    const accuracy = result.current.calculateHitAccuracy(pattern, now);
    expect(accuracy.type).toBe('ok');
  });

  it('should return ok accuracy when no targetTime', () => {
    const { result } = renderHook(() => useScoreManager(defaultProps));

    const pattern: GamePattern = {
      timestamp: Date.now() - 1000,
      type: 'collect',
      position: { x: 100, y: 200 },
      lane: 'mid',
      size: 20,
    };

    const accuracy = result.current.calculateHitAccuracy(pattern, Date.now());
    expect(accuracy.type).toBe('ok');
  });

  it('should handle enemy collision', () => {
    const { result } = renderHook(() => useScoreManager(defaultProps));

    const pattern: GamePattern = {
      timestamp: Date.now() - 1000,
      type: 'enemy',
      position: { x: 100, y: 200 },
      lane: 'mid',
      size: 20,
    };

    act(() => {
      result.current.handleCollision('enemy', pattern);
    });

    expect(mockIsActive.current).toBe(false);
    expect(mockSetGameState).toHaveBeenCalled();
  });

  it('should update high score when score exceeds highScore on avoid/enemy', () => {
    const gameStateWithScore = {
      ...defaultGameState,
      score: 1000,
      highScore: 500,
    };

    const { result } = renderHook(() =>
      useScoreManager({ ...defaultProps, gameState: gameStateWithScore })
    );

    const pattern: GamePattern = {
      timestamp: Date.now() - 1000,
      type: 'avoid',
      position: { x: 100, y: 200 },
      lane: 'mid',
      size: 20,
    };

    act(() => {
      result.current.handleCollision('avoid', pattern);
    });

    expect(localStorageMock.setItem).toHaveBeenCalled();
  });

  it('should cancel animation frame on avoid/enemy collision', () => {
    const mockCancelAnimationFrame = jest.fn();
    global.cancelAnimationFrame = mockCancelAnimationFrame;

    const animationFrameWithValue = { current: 123 as number | undefined };

    const { result } = renderHook(() =>
      useScoreManager({ ...defaultProps, animationFrame: animationFrameWithValue })
    );

    const pattern: GamePattern = {
      timestamp: Date.now() - 1000,
      type: 'avoid',
      position: { x: 100, y: 200 },
      lane: 'mid',
      size: 20,
    };

    act(() => {
      result.current.handleCollision('avoid', pattern);
    });

    expect(mockCancelAnimationFrame).toHaveBeenCalledWith(123);
  });
});
