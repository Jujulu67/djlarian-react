import { renderHook, act } from '@testing-library/react';
import { useBeatVisuals } from '../useBeatVisuals';

describe('useBeatVisuals', () => {
  it('should initialize with empty visuals', () => {
    const { result } = renderHook(() => useBeatVisuals());

    expect(result.current.beatVisuals).toEqual([]);
  });

  it('should add beat visual when bass value is high enough', () => {
    const { result } = renderHook(() => useBeatVisuals());

    const audioData = new Uint8Array(256);
    // Set high bass values (first 5 indices)
    audioData[0] = 200;
    audioData[1] = 180;
    audioData[2] = 190;
    audioData[3] = 200;
    audioData[4] = 180;

    act(() => {
      result.current.checkAndAddBeat(audioData, 800);
    });

    expect(result.current.beatVisuals).toHaveLength(1);
    expect(result.current.beatVisuals[0].position).toBe(800);
  });

  it('should not add beat if bass value is too low', () => {
    const { result } = renderHook(() => useBeatVisuals());

    const audioData = new Uint8Array(256);
    // Set low bass values
    audioData[0] = 50;
    audioData[1] = 40;
    audioData[2] = 50;
    audioData[3] = 40;
    audioData[4] = 50;

    act(() => {
      result.current.checkAndAddBeat(audioData, 800);
    });

    expect(result.current.beatVisuals).toHaveLength(0);
  });

  it('should not add beat if too soon after last beat', () => {
    const { result } = renderHook(() => useBeatVisuals());

    const audioData = new Uint8Array(256);
    audioData[0] = 200;
    audioData[1] = 200;
    audioData[2] = 200;
    audioData[3] = 200;
    audioData[4] = 200;

    act(() => {
      result.current.checkAndAddBeat(audioData, 800);
    });

    expect(result.current.beatVisuals).toHaveLength(1);

    // Try to add another beat immediately (should be blocked)
    act(() => {
      result.current.checkAndAddBeat(audioData, 800);
    });

    // Should still be 1 (not added due to time constraint)
    expect(result.current.beatVisuals).toHaveLength(1);
  });

  it('should update and draw beats', () => {
    const { result } = renderHook(() => useBeatVisuals());

    const mockCtx = {
      beginPath: jest.fn(),
      arc: jest.fn(),
      strokeStyle: '',
      lineWidth: 0,
      stroke: jest.fn(),
    } as unknown as CanvasRenderingContext2D;

    const audioData = new Uint8Array(256);
    audioData[0] = 200;
    audioData[1] = 200;
    audioData[2] = 200;
    audioData[3] = 200;
    audioData[4] = 200;

    act(() => {
      result.current.checkAndAddBeat(audioData, 800);
    });

    const timestamp = result.current.beatVisuals[0].timestamp;

    act(() => {
      result.current.updateAndDrawBeats(mockCtx, 800, 600, timestamp + 1000);
    });

    expect(mockCtx.beginPath).toHaveBeenCalled();
    expect(mockCtx.arc).toHaveBeenCalled();
    expect(mockCtx.stroke).toHaveBeenCalled();
  });

  it('should filter beats that are off screen', () => {
    const { result } = renderHook(() => useBeatVisuals());

    const mockCtx = {
      beginPath: jest.fn(),
      arc: jest.fn(),
      strokeStyle: '',
      lineWidth: 0,
      stroke: jest.fn(),
    } as unknown as CanvasRenderingContext2D;

    const audioData = new Uint8Array(256);
    audioData[0] = 200;
    audioData[1] = 200;
    audioData[2] = 200;
    audioData[3] = 200;
    audioData[4] = 200;

    act(() => {
      result.current.checkAndAddBeat(audioData, 800);
    });

    const timestamp = result.current.beatVisuals[0].timestamp;

    // Update with time that moves beat off screen
    act(() => {
      result.current.updateAndDrawBeats(mockCtx, 800, 600, timestamp + 3000);
    });

    // Beat should be filtered out
    expect(result.current.beatVisuals).toHaveLength(0);
  });
});
