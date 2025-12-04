import { renderHook, act } from '@testing-library/react';
import { usePointAnimations } from '../usePointAnimations';

describe('usePointAnimations', () => {
  it('should initialize with empty animations', () => {
    const { result } = renderHook(() => usePointAnimations());

    expect(result.current.pointAnimations).toEqual([]);
  });

  it('should add point animation', () => {
    const { result } = renderHook(() => usePointAnimations());

    act(() => {
      result.current.addPointAnimation(100, 200, 50, 'perfect');
    });

    expect(result.current.pointAnimations).toHaveLength(1);
    expect(result.current.pointAnimations[0]).toMatchObject({
      x: 100,
      y: 175, // 200 - 25
      value: 50,
      type: 'perfect',
    });
  });

  it('should update animations and filter expired ones', () => {
    const { result } = renderHook(() => usePointAnimations());

    const mockCtx = {
      font: '',
      fillStyle: '',
      textAlign: '',
      fillText: jest.fn(),
    } as unknown as CanvasRenderingContext2D;

    act(() => {
      result.current.addPointAnimation(100, 200, 50, 'perfect');
    });

    const now = Date.now();
    const timestamp = result.current.pointAnimations[0].timestamp;

    // Update with time that should keep animation
    act(() => {
      result.current.updateAnimations(mockCtx, timestamp + 500);
    });

    expect(result.current.pointAnimations.length).toBeGreaterThan(0);

    // Update with time that should remove animation (after 1 second)
    act(() => {
      result.current.updateAnimations(mockCtx, timestamp + 1100);
    });

    expect(result.current.pointAnimations).toHaveLength(0);
  });

  it('should handle different animation types', () => {
    const { result } = renderHook(() => usePointAnimations());

    act(() => {
      result.current.addPointAnimation(100, 200, 50, 'perfect');
      result.current.addPointAnimation(150, 250, 30, 'good');
      result.current.addPointAnimation(200, 300, 10, 'ok');
    });

    expect(result.current.pointAnimations).toHaveLength(3);
    expect(result.current.pointAnimations[0].type).toBe('perfect');
    expect(result.current.pointAnimations[1].type).toBe('good');
    expect(result.current.pointAnimations[2].type).toBe('ok');
  });
});
