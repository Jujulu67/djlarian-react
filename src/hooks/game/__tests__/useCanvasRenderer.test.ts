import { renderHook, act } from '@testing-library/react';
import { useCanvasRenderer } from '../useCanvasRenderer';
import type { GamePattern } from '@/types/game';

// Mock logger
jest.mock('@/lib/logger', () => ({
  logger: {
    debug: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

describe('useCanvasRenderer', () => {
  const mockCanvasRef = { current: document.createElement('canvas') };
  const mockCtx = {
    current: {
      beginPath: jest.fn(),
      arc: jest.fn(),
      fill: jest.fn(),
      stroke: jest.fn(),
      clearRect: jest.fn(),
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 0,
      font: '',
      createRadialGradient: jest.fn(() => ({
        addColorStop: jest.fn(),
      })),
      fillRect: jest.fn(),
      save: jest.fn(),
      restore: jest.fn(),
      translate: jest.fn(),
      rotate: jest.fn(),
      moveTo: jest.fn(),
      lineTo: jest.fn(),
      closePath: jest.fn(),
      fillText: jest.fn(),
      globalAlpha: 1,
    } as unknown as CanvasRenderingContext2D,
  };
  const mockPlayerRef = { current: { x: 100, y: 200 } };
  const mockUpdateScreenShake = jest.fn();
  const mockDrawLanes = jest.fn();
  const mockCheckAndAddBeat = jest.fn();
  const mockUpdateAndDrawBeats = jest.fn();
  const mockUpdatePointAnimations = jest.fn();
  const mockCheckCollisions = jest.fn();

  const defaultProps = {
    canvasRef: mockCanvasRef as React.RefObject<HTMLCanvasElement>,
    ctx: mockCtx as React.MutableRefObject<CanvasRenderingContext2D | null>,
    playerRef: mockPlayerRef as React.MutableRefObject<{ x: number; y: number }>,
    patterns: [] as GamePattern[],
    screenShake: { active: false, intensity: 0 },
    updateScreenShake: mockUpdateScreenShake,
    drawLanes: mockDrawLanes,
    checkAndAddBeat: mockCheckAndAddBeat,
    updateAndDrawBeats: mockUpdateAndDrawBeats,
    updatePointAnimations: mockUpdatePointAnimations,
    checkCollisions: mockCheckCollisions,
    audioData: new Uint8Array(256),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockCanvasRef.current.width = 800;
    mockCanvasRef.current.height = 400;
  });

  it('should draw player', () => {
    const { result } = renderHook(() => useCanvasRenderer(defaultProps));

    act(() => {
      result.current.drawPlayer(mockCtx.current, 100, 200);
    });

    expect(mockCtx.current.beginPath).toHaveBeenCalled();
    expect(mockCtx.current.arc).toHaveBeenCalled();
  });

  it('should draw pattern', () => {
    const { result } = renderHook(() => useCanvasRenderer(defaultProps));

    const pattern: GamePattern = {
      timestamp: Date.now(),
      type: 'collect',
      position: { x: 100, y: 200 },
      lane: 'mid',
      size: 20,
    };

    act(() => {
      result.current.drawPattern(pattern, 800);
    });

    expect(mockCtx.current.beginPath).toHaveBeenCalled();
  });

  it('should not draw pattern if out of bounds', () => {
    const { result } = renderHook(() => useCanvasRenderer(defaultProps));

    const pattern: GamePattern = {
      timestamp: Date.now(),
      type: 'collect',
      position: { x: -100, y: 200 },
      lane: 'mid',
      size: 20,
    };

    act(() => {
      result.current.drawPattern(pattern, 800);
    });

    // Should not draw if out of bounds - function returns early
    expect(mockCtx.current.beginPath).not.toHaveBeenCalled();
  });

  it('should draw disintegrating pattern', () => {
    const { result } = renderHook(() => useCanvasRenderer(defaultProps));

    const pattern: GamePattern = {
      timestamp: Date.now() - 1000,
      type: 'collect',
      position: { x: 100, y: 200 },
      lane: 'mid',
      size: 20,
      isDisintegrating: true,
      disintegrateStartTime: Date.now() - 100,
      disintegrateDuration: 500,
    };

    act(() => {
      result.current.drawPattern(pattern, 800);
    });

    expect(mockCtx.current.beginPath).toHaveBeenCalled();
  });

  it('should animate game', () => {
    const { result } = renderHook(() => useCanvasRenderer(defaultProps));

    const gameData = {
      patterns: [] as GamePattern[],
      audioData: new Uint8Array(256),
      handleCollision: jest.fn(),
      gameState: { isActive: true },
    };

    act(() => {
      result.current.animate(true, gameData);
    });

    expect(mockDrawLanes).toHaveBeenCalled();
  });

  it('should not animate if not active', () => {
    const { result } = renderHook(() => useCanvasRenderer(defaultProps));

    const gameData = {
      patterns: [] as GamePattern[],
      audioData: new Uint8Array(256),
      handleCollision: jest.fn(),
      gameState: { isActive: false },
    };

    act(() => {
      result.current.animate(false, gameData);
    });

    // Should still call some functions but game logic should be skipped
    expect(mockCtx.current.clearRect).toHaveBeenCalled();
  });

  it('should handle screen shake', () => {
    const { result } = renderHook(() =>
      useCanvasRenderer({
        ...defaultProps,
        screenShake: { active: true, intensity: 10 },
      })
    );

    const gameData = {
      patterns: [] as GamePattern[],
      audioData: new Uint8Array(256),
      handleCollision: jest.fn(),
      gameState: { isActive: true },
    };

    act(() => {
      result.current.animate(true, gameData);
    });

    expect(mockUpdateScreenShake).toHaveBeenCalled();
  });

  it('should check collisions during animation', () => {
    const { result } = renderHook(() => useCanvasRenderer(defaultProps));

    const patterns: GamePattern[] = [
      {
        timestamp: Date.now(),
        type: 'collect',
        position: { x: 100, y: 200 },
        lane: 'mid',
        size: 20,
      },
    ];

    const gameData = {
      patterns,
      audioData: new Uint8Array(256),
      handleCollision: jest.fn(),
      gameState: { isActive: true },
    };

    act(() => {
      result.current.animate(true, gameData);
    });

    expect(mockCheckCollisions).toHaveBeenCalled();
  });

  it('should handle missing canvas', () => {
    const { result } = renderHook(() =>
      useCanvasRenderer({
        ...defaultProps,
        canvasRef: { current: null } as React.RefObject<HTMLCanvasElement>,
      })
    );

    act(() => {
      result.current.drawPlayer();
    });

    // drawPlayer checks for canvasRef.current, so it returns early if null
    expect(mockCtx.current.beginPath).not.toHaveBeenCalled();
  });

  it('should handle missing context', () => {
    const { result } = renderHook(() =>
      useCanvasRenderer({
        ...defaultProps,
        ctx: { current: null } as React.MutableRefObject<CanvasRenderingContext2D | null>,
      })
    );

    const pattern: GamePattern = {
      timestamp: Date.now(),
      type: 'collect',
      position: { x: 100, y: 200 },
      lane: 'mid',
      size: 20,
    };

    act(() => {
      result.current.drawPattern(pattern, 800);
    });

    // Should handle gracefully without context
    expect(() => result.current.drawPattern(pattern, 800)).not.toThrow();
  });
});
