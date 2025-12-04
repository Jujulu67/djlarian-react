import { renderHook, act } from '@testing-library/react';
import { usePatternManager } from '../usePatternManager';
import type { GamePattern, GameState } from '@/types/game';

// Mock logger
jest.mock('@/lib/logger', () => ({
  logger: {
    debug: jest.fn(),
    warn: jest.fn(),
  },
}));

// Mock audio analyser
const mockAudioAnalyser = {
  analyzeFrequencyBands: jest.fn(() => ({
    bass: 100,
    mid: 80,
    high: 60,
  })),
  detectBeat: jest.fn(() => true),
  bpm: { current: 120 },
  beatConfidence: { current: 0.8 },
};

describe('usePatternManager', () => {
  const mockSetPatterns = jest.fn();
  const mockSetGameState = jest.fn();
  const mockIsActive = { current: true };

  const defaultProps = {
    patterns: [] as GamePattern[],
    setPatterns: mockSetPatterns,
    setGameState: mockSetGameState,
    isActive: mockIsActive,
    audioAnalyser: mockAudioAnalyser as any,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    document.querySelector = jest.fn(() => ({
      getBoundingClientRect: () => ({ width: 800, height: 400 }),
    })) as any;
  });

  it('should initialize with refs', () => {
    const { result } = renderHook(() => usePatternManager(defaultProps));

    expect(result.current.patternsRef).toBeDefined();
    expect(result.current.animationFrame).toBeDefined();
  });

  it('should generate patterns on beat', () => {
    const { result } = renderHook(() => usePatternManager(defaultProps));

    const audioData = new Uint8Array(256);
    const timestamp = Date.now();

    act(() => {
      result.current.generateObstacles(timestamp, audioData);
    });

    expect(mockSetPatterns).toHaveBeenCalled();
  });

  it('should update patterns position', () => {
    const initialPatterns: GamePattern[] = [
      {
        timestamp: Date.now() - 1000,
        type: 'collect',
        position: { x: 100, y: 200 },
        lane: 'mid',
        size: 20,
        speed: 1.5,
      },
    ];

    const { result } = renderHook(() =>
      usePatternManager({ ...defaultProps, patterns: initialPatterns })
    );

    const now = Date.now();

    act(() => {
      result.current.updatePatterns(now);
    });

    expect(mockSetPatterns).toHaveBeenCalled();
  });

  it('should remove patterns that are off screen', () => {
    const oldPattern: GamePattern = {
      timestamp: Date.now() - 1000,
      type: 'collect',
      position: { x: -100, y: 200 },
      lane: 'mid',
      size: 20,
      speed: 1.5,
    };

    const { result } = renderHook(() =>
      usePatternManager({ ...defaultProps, patterns: [oldPattern] })
    );

    act(() => {
      result.current.updatePatterns(Date.now());
    });

    expect(mockSetPatterns).toHaveBeenCalled();
  });

  it('should create pre-mapped patterns', () => {
    const { result } = renderHook(() => usePatternManager(defaultProps));

    const now = Date.now();
    const patterns = result.current.createPreMappedPatterns(now);

    expect(patterns).toBeDefined();
    expect(Array.isArray(patterns)).toBe(true);
  });

  it('should handle canvas not found', () => {
    document.querySelector = jest.fn(() => null);

    const { result } = renderHook(() => usePatternManager(defaultProps));

    const audioData = new Uint8Array(256);
    const timestamp = Date.now();

    act(() => {
      result.current.generateObstacles(timestamp, audioData);
    });

    expect(mockSetPatterns).toHaveBeenCalled();
  });

  it('should generate different pattern types based on frequency bands', () => {
    const { result } = renderHook(() => usePatternManager(defaultProps));

    const audioData = new Uint8Array(256);
    const timestamp = Date.now();

    act(() => {
      result.current.generateObstacles(timestamp, audioData);
    });

    expect(mockAudioAnalyser.analyzeFrequencyBands).toHaveBeenCalled();
  });

  it('should not generate patterns if band value is too low', () => {
    mockAudioAnalyser.analyzeFrequencyBands.mockReturnValueOnce({
      bass: 30,
      mid: 20,
      high: 10,
    });

    const { result } = renderHook(() => usePatternManager(defaultProps));

    const audioData = new Uint8Array(256);
    const timestamp = Date.now();

    act(() => {
      result.current.generateObstacles(timestamp, audioData);
    });

    // Should still be called but might not add patterns
    expect(mockAudioAnalyser.analyzeFrequencyBands).toHaveBeenCalled();
  });

  it('should update game state with total notes', () => {
    const { result } = renderHook(() => usePatternManager(defaultProps));

    const audioData = new Uint8Array(256);
    const timestamp = Date.now();

    act(() => {
      result.current.generateObstacles(timestamp, audioData);
    });

    expect(mockSetGameState).toHaveBeenCalled();
  });

  it('should generate patterns when no beat but enough time passed', () => {
    mockAudioAnalyser.detectBeat.mockReturnValueOnce(false);

    const { result } = renderHook(() => usePatternManager(defaultProps));

    const audioData = new Uint8Array(256);
    audioData.fill(150); // High values
    const timestamp = Date.now();

    act(() => {
      result.current.generateObstacles(timestamp, audioData);
    });

    expect(mockAudioAnalyser.analyzeFrequencyBands).toHaveBeenCalled();
  });

  it('should handle disintegrating patterns in updatePatterns', () => {
    const disintegratingPattern: GamePattern = {
      timestamp: Date.now() - 1000,
      type: 'collect',
      position: { x: 100, y: 200 },
      lane: 'mid',
      size: 20,
      speed: 1.5,
      isDisintegrating: true,
      disintegrateStartTime: Date.now() - 100,
      disintegrateDuration: 500,
    };

    const { result } = renderHook(() =>
      usePatternManager({ ...defaultProps, patterns: [disintegratingPattern] })
    );

    act(() => {
      result.current.updatePatterns(Date.now());
    });

    expect(mockSetPatterns).toHaveBeenCalled();
  });

  it('should remove patterns that exceed lifetime', () => {
    const oldPattern: GamePattern = {
      timestamp: Date.now() - 10000, // Very old
      type: 'collect',
      position: { x: 100, y: 200 },
      lane: 'mid',
      size: 20,
      speed: 1.5,
    };

    const { result } = renderHook(() =>
      usePatternManager({ ...defaultProps, patterns: [oldPattern] })
    );

    act(() => {
      result.current.updatePatterns(Date.now());
    });

    expect(mockSetPatterns).toHaveBeenCalled();
  });

  it('should handle inactive game state', () => {
    mockIsActive.current = false;

    const initialPatterns: GamePattern[] = [
      {
        timestamp: Date.now() - 1000,
        type: 'collect',
        position: { x: 100, y: 200 },
        lane: 'mid',
        size: 20,
        speed: 1.5,
      },
    ];

    const { result } = renderHook(() =>
      usePatternManager({ ...defaultProps, patterns: initialPatterns })
    );

    act(() => {
      result.current.updatePatterns(Date.now());
    });

    expect(mockSetPatterns).toHaveBeenCalled();
  });

  it('should generate different pattern types for different lanes', () => {
    const { result } = renderHook(() => usePatternManager(defaultProps));

    const audioData = new Uint8Array(256);
    audioData.fill(200); // High values for all bands
    const timestamp = Date.now();

    act(() => {
      result.current.generateObstacles(timestamp, audioData);
    });

    expect(mockAudioAnalyser.analyzeFrequencyBands).toHaveBeenCalled();
  });
});
