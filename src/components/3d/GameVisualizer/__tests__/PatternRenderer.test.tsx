import { PatternRenderer } from '../PatternRenderer';
import type { GamePattern } from '@/types/game';

describe('PatternRenderer', () => {
  const mockCtx = {
    beginPath: jest.fn(),
    arc: jest.fn(),
    fill: jest.fn(),
    stroke: jest.fn(),
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 0,
    shadowColor: '',
    shadowBlur: 0,
    font: '',
    textAlign: '',
    fillText: jest.fn(),
  } as unknown as CanvasRenderingContext2D;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return null for invalid pattern position', () => {
    const pattern: GamePattern = {
      timestamp: Date.now(),
      type: 'collect',
      position: { x: NaN, y: 100 },
      lane: 'mid',
      size: 20,
    };

    const result = PatternRenderer({ pattern, ctx: mockCtx, canvasWidth: 800, canvasHeight: 600 });
    expect(result).toBeNull();
  });

  it('should return null for pattern out of bounds', () => {
    const pattern: GamePattern = {
      timestamp: Date.now(),
      type: 'collect',
      position: { x: -100, y: 100 },
      lane: 'mid',
      size: 20,
    };

    const result = PatternRenderer({ pattern, ctx: mockCtx, canvasWidth: 800, canvasHeight: 600 });
    expect(result).toBeNull();
  });

  it('should render normal pattern', () => {
    const pattern: GamePattern = {
      timestamp: Date.now(),
      type: 'collect',
      position: { x: 100, y: 100 },
      lane: 'mid',
      size: 20,
    };

    const result = PatternRenderer({ pattern, ctx: mockCtx, canvasWidth: 800, canvasHeight: 600 });
    expect(mockCtx.beginPath).toHaveBeenCalled();
    expect(mockCtx.arc).toHaveBeenCalled();
  });

  it('should render golden pattern', () => {
    const pattern: GamePattern = {
      timestamp: Date.now(),
      type: 'golden',
      position: { x: 100, y: 100 },
      lane: 'bass',
      size: 25,
    };

    const result = PatternRenderer({ pattern, ctx: mockCtx, canvasWidth: 800, canvasHeight: 600 });
    expect(mockCtx.beginPath).toHaveBeenCalled();
  });

  it('should render blue pattern', () => {
    const pattern: GamePattern = {
      timestamp: Date.now(),
      type: 'blue',
      position: { x: 100, y: 100 },
      lane: 'high',
      size: 18,
    };

    const result = PatternRenderer({ pattern, ctx: mockCtx, canvasWidth: 800, canvasHeight: 600 });
    expect(mockCtx.beginPath).toHaveBeenCalled();
  });

  it('should render disintegrating pattern', () => {
    const pattern: GamePattern = {
      timestamp: Date.now() - 1000,
      type: 'collect',
      position: { x: 100, y: 100 },
      lane: 'mid',
      size: 20,
      isDisintegrating: true,
      disintegrateStartTime: Date.now() - 100,
      disintegrateDuration: 500,
      accuracyType: 'perfect',
    };

    const result = PatternRenderer({ pattern, ctx: mockCtx, canvasWidth: 800, canvasHeight: 600 });
    expect(mockCtx.beginPath).toHaveBeenCalled();
  });

  it('should handle pattern with targetTime', () => {
    const pattern: GamePattern = {
      timestamp: Date.now(),
      type: 'collect',
      position: { x: 100, y: 100 },
      lane: 'mid',
      size: 20,
      targetTime: Date.now() + 50, // Very close to target
    };

    const result = PatternRenderer({ pattern, ctx: mockCtx, canvasWidth: 800, canvasHeight: 600 });
    expect(mockCtx.beginPath).toHaveBeenCalled();
  });
});
