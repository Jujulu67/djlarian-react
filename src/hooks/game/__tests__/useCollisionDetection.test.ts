import { renderHook, act } from '@testing-library/react';

import { GamePattern } from '@/types/game';

import { useCollisionDetection } from '../useCollisionDetection';

const mockHandleCollision = jest.fn();
const mockSetScreenShake = jest.fn();
const mockSetParticles = jest.fn();
const mockSetPointAnimations = jest.fn();

const mockGameState = {
  lastHitAccuracy: undefined,
  lastHitPoints: undefined,
};

const defaultProps = {
  handleCollision: mockHandleCollision,
  gameState: mockGameState,
  setScreenShake: mockSetScreenShake,
  setParticles: mockSetParticles,
  setPointAnimations: mockSetPointAnimations,
};

describe('useCollisionDetection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return checkCollisions function', () => {
    const { result } = renderHook(() => useCollisionDetection(defaultProps));
    expect(typeof result.current.checkCollisions).toBe('function');
  });

  it('should not detect collision when pattern is disintegrating', () => {
    const { result } = renderHook(() => useCollisionDetection(defaultProps));

    const patterns: GamePattern[] = [
      {
        id: '1',
        type: 'collect',
        position: { x: 100, y: 100 },
        isDisintegrating: true,
      } as GamePattern,
    ];

    act(() => {
      result.current.checkCollisions(100, 100, patterns, Date.now());
    });

    expect(mockHandleCollision).not.toHaveBeenCalled();
  });

  it('should detect collision when player is close to pattern', () => {
    const { result } = renderHook(() => useCollisionDetection(defaultProps));

    const patterns: GamePattern[] = [
      {
        id: '1',
        type: 'collect',
        position: { x: 100, y: 100 },
        isDisintegrating: false,
      } as GamePattern,
    ];

    act(() => {
      result.current.checkCollisions(100, 100, patterns, Date.now());
    });

    expect(mockHandleCollision).toHaveBeenCalledWith('collect', patterns[0]);
  });

  it('should not detect collision when player is too far', () => {
    const { result } = renderHook(() => useCollisionDetection(defaultProps));

    const patterns: GamePattern[] = [
      {
        id: '1',
        type: 'collect',
        position: { x: 200, y: 200 },
        isDisintegrating: false,
      } as GamePattern,
    ];

    act(() => {
      result.current.checkCollisions(100, 100, patterns, Date.now());
    });

    expect(mockHandleCollision).not.toHaveBeenCalled();
  });

  it('should trigger screen shake on collision', () => {
    const { result } = renderHook(() => useCollisionDetection(defaultProps));

    const patterns: GamePattern[] = [
      {
        id: '1',
        type: 'collect',
        position: { x: 100, y: 100 },
        isDisintegrating: false,
      } as GamePattern,
    ];

    act(() => {
      result.current.checkCollisions(100, 100, patterns, Date.now());
    });

    expect(mockSetScreenShake).toHaveBeenCalledWith({
      active: true,
      intensity: expect.any(Number),
    });
  });

  it('should create particles on collision', () => {
    const { result } = renderHook(() => useCollisionDetection(defaultProps));

    const patterns: GamePattern[] = [
      {
        id: '1',
        type: 'collect',
        position: { x: 100, y: 100 },
        isDisintegrating: false,
      } as GamePattern,
    ];

    act(() => {
      result.current.checkCollisions(100, 100, patterns, Date.now());
    });

    expect(mockSetParticles).toHaveBeenCalled();
    const particlesCall = mockSetParticles.mock.calls[0][0];
    expect(Array.isArray(particlesCall) || typeof particlesCall === 'function').toBe(true);
  });

  it('should handle multiple patterns', () => {
    const { result } = renderHook(() => useCollisionDetection(defaultProps));

    const patterns: GamePattern[] = [
      {
        id: '1',
        type: 'collect',
        position: { x: 100, y: 100 },
        isDisintegrating: false,
      } as GamePattern,
      {
        id: '2',
        type: 'obstacle',
        position: { x: 200, y: 200 },
        isDisintegrating: false,
      } as GamePattern,
    ];

    act(() => {
      result.current.checkCollisions(100, 100, patterns, Date.now());
    });

    // Should only detect collision with first pattern
    expect(mockHandleCollision).toHaveBeenCalledTimes(1);
    expect(mockHandleCollision).toHaveBeenCalledWith('collect', patterns[0]);
  });

  it('should handle different pattern types', () => {
    const { result } = renderHook(() => useCollisionDetection(defaultProps));

    const patternTypes: GamePattern['type'][] = ['collect', 'obstacle', 'powerup'];

    patternTypes.forEach((type) => {
      jest.clearAllMocks();
      const patterns: GamePattern[] = [
        {
          id: '1',
          type,
          position: { x: 100, y: 100 },
          isDisintegrating: false,
        } as GamePattern,
      ];

      act(() => {
        result.current.checkCollisions(100, 100, patterns, Date.now());
      });

      expect(mockHandleCollision).toHaveBeenCalledWith(type, patterns[0]);
    });
  });
});
