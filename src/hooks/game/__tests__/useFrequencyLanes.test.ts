import { renderHook, act } from '@testing-library/react';
import { useFrequencyLanes } from '../useFrequencyLanes';

describe('useFrequencyLanes', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('should initialize with default lanes', () => {
    const { result } = renderHook(() => useFrequencyLanes());

    expect(result.current.frequencyLanes).toHaveLength(3);
    expect(result.current.frequencyLanes[0].name).toBe('bass');
    expect(result.current.frequencyLanes[1].name).toBe('mid');
    expect(result.current.frequencyLanes[2].name).toBe('high');
  });

  it('should provide drawLanes function', () => {
    const { result } = renderHook(() => useFrequencyLanes());

    expect(typeof result.current.drawLanes).toBe('function');
  });

  it('should draw lanes on canvas', () => {
    const { result } = renderHook(() => useFrequencyLanes());

    const mockCtx = {
      beginPath: jest.fn(),
      moveTo: jest.fn(),
      lineTo: jest.fn(),
      strokeStyle: '',
      lineWidth: 0,
      stroke: jest.fn(),
      createLinearGradient: jest.fn(() => ({
        addColorStop: jest.fn(),
      })),
      fillStyle: '',
      fillRect: jest.fn(),
    } as unknown as CanvasRenderingContext2D;

    act(() => {
      result.current.drawLanes(mockCtx, 800, 600);
    });

    expect(mockCtx.beginPath).toHaveBeenCalled();
    expect(mockCtx.stroke).toHaveBeenCalled();
  });

  it('should pulse lanes when BPM is provided', () => {
    const { result } = renderHook(() => useFrequencyLanes(120));

    const initialAlpha = result.current.frequencyLanes[0].alpha;

    // Fast-forward time to trigger pulse
    act(() => {
      jest.advanceTimersByTime(500); // 60000 / 120 = 500ms per beat
    });

    // Alpha should have increased
    expect(result.current.frequencyLanes[0].alpha).toBeGreaterThan(initialAlpha);
  });

  it('should not pulse lanes when BPM is not provided', () => {
    const { result } = renderHook(() => useFrequencyLanes());

    const initialAlpha = result.current.frequencyLanes[0].alpha;

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    // Alpha should remain the same
    expect(result.current.frequencyLanes[0].alpha).toBe(initialAlpha);
  });
});
