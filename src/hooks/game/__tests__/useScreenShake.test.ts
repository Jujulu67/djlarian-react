import { renderHook, act } from '@testing-library/react';
import { useScreenShake } from '../useScreenShake';

describe('useScreenShake', () => {
  it('should initialize with inactive shake', () => {
    const { result } = renderHook(() => useScreenShake());

    expect(result.current.screenShake).toEqual({
      active: false,
      intensity: 0,
    });
  });

  it('should trigger shake with intensity', () => {
    const { result } = renderHook(() => useScreenShake());

    act(() => {
      result.current.triggerShake(10);
    });

    expect(result.current.screenShake).toEqual({
      active: true,
      intensity: 10,
    });
  });

  it('should update shake with reduce factor', () => {
    const { result } = renderHook(() => useScreenShake());

    act(() => {
      result.current.triggerShake(10);
    });

    act(() => {
      result.current.updateShake(0.5);
    });

    expect(result.current.screenShake.intensity).toBe(5);
  });

  it('should deactivate shake when intensity drops below threshold', () => {
    const { result } = renderHook(() => useScreenShake());

    act(() => {
      result.current.triggerShake(1);
    });

    // First update: 1 * 0.4 = 0.4, but active is based on prev.intensity (1) > 0.5, so still true
    act(() => {
      result.current.updateShake(0.4); // intensity becomes 0.4
    });

    // Second update: 0.4 * 0.4 = 0.16, and prev.intensity (0.4) < 0.5, so active becomes false
    act(() => {
      result.current.updateShake(0.4);
    });

    expect(result.current.screenShake.active).toBe(false);
    expect(result.current.screenShake.intensity).toBeLessThan(0.5);
  });

  it('should return zero offset when shake is inactive', () => {
    const { result } = renderHook(() => useScreenShake());

    const offset = result.current.getShakeOffset();

    expect(offset).toEqual({ x: 0, y: 0 });
  });

  it('should return random offset when shake is active', () => {
    const { result } = renderHook(() => useScreenShake());

    act(() => {
      result.current.triggerShake(10);
    });

    const offset = result.current.getShakeOffset();

    expect(offset.x).toBeGreaterThanOrEqual(-5);
    expect(offset.x).toBeLessThanOrEqual(5);
    expect(offset.y).toBeGreaterThanOrEqual(-5);
    expect(offset.y).toBeLessThanOrEqual(5);
  });
});
