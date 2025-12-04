import { renderHook, act } from '@testing-library/react';
import { usePlayerPosition } from '../usePlayerPosition';

describe('usePlayerPosition', () => {
  it('should initialize with default position', () => {
    const { result } = renderHook(() => usePlayerPosition({}));

    const position = result.current.getPosition();

    expect(position).toEqual({ x: 0, y: 0 });
  });

  it('should initialize with custom position', () => {
    const { result } = renderHook(() => usePlayerPosition({ initialX: 100, initialY: 200 }));

    const position = result.current.getPosition();

    expect(position).toEqual({ x: 100, y: 200 });
  });

  it('should update position', () => {
    const { result } = renderHook(() => usePlayerPosition({}));

    act(() => {
      result.current.updatePosition(50, 75);
    });

    const position = result.current.getPosition();
    expect(position).toEqual({ x: 50, y: 75 });
  });

  it('should call setPlayerPosition callback when provided', () => {
    const mockSetPlayerPosition = jest.fn();

    const { result } = renderHook(() =>
      usePlayerPosition({ setPlayerPosition: mockSetPlayerPosition })
    );

    act(() => {
      result.current.updatePosition(30, 40);
    });

    expect(mockSetPlayerPosition).toHaveBeenCalledWith(30, 40);
  });

  it('should set initial position', () => {
    const { result } = renderHook(() => usePlayerPosition({}));

    act(() => {
      result.current.setInitialPosition(200, 300);
    });

    const position = result.current.getPosition();
    expect(position).toEqual({ x: 200, y: 300 });
  });

  it('should call setPlayerPosition when setting initial position', () => {
    const mockSetPlayerPosition = jest.fn();

    const { result } = renderHook(() =>
      usePlayerPosition({ setPlayerPosition: mockSetPlayerPosition })
    );

    act(() => {
      result.current.setInitialPosition(150, 250);
    });

    expect(mockSetPlayerPosition).toHaveBeenCalledWith(150, 250);
  });

  it('should return playerRef', () => {
    const { result } = renderHook(() => usePlayerPosition({}));

    expect(result.current.playerRef).toBeDefined();
    expect(result.current.playerRef.current).toEqual({ x: 0, y: 0 });
  });
});
