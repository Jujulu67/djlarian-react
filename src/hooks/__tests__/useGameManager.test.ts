import { renderHook, act } from '@testing-library/react';
import { useGameManager } from '../useGameManager';

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
global.localStorage = localStorageMock as unknown as Storage;

// Mock de requestAnimationFrame
global.requestAnimationFrame = jest.fn((cb) => setTimeout(cb, 16)) as unknown as typeof requestAnimationFrame;
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
    localStorageMock.getItem.mockReturnValue('1000');
    
    const { result } = renderHook(() => useGameManager(mockAudioElement));

    expect(result.current.gameState.highScore).toBe(1000);
  });

  it('should initialize with empty patterns array', () => {
    const { result } = renderHook(() => useGameManager(mockAudioElement));

    expect(result.current.patterns).toEqual([]);
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
});

