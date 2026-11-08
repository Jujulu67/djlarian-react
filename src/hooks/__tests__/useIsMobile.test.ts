import { renderHook, act } from '@testing-library/react';
import { useIsMobile } from '../useIsMobile';

describe('useIsMobile', () => {
  const originalInnerWidth = window.innerWidth;
  const originalAddEventListener = window.addEventListener;
  const originalRemoveEventListener = window.removeEventListener;

  beforeEach(() => {
    // Reset window size
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024,
    });

    // Mock addEventListener and removeEventListener
    window.addEventListener = jest.fn();
    window.removeEventListener = jest.fn();
  });

  afterEach(() => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: originalInnerWidth,
    });
    window.addEventListener = originalAddEventListener;
    window.removeEventListener = originalRemoveEventListener;
  });

  it.each([
    ['should return false for desktop width (> 768)', 1024, false],
    ['should return true for mobile width (<= 768)', 768, true],
    ['should return true for small mobile width (< 768)', 375, true],
  ])('%s', (_label, width, expected) => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: width,
    });

    const { result } = renderHook(() => useIsMobile());

    expect(result.current).toBe(expected);
  });

  it('should add resize event listener on mount', () => {
    renderHook(() => useIsMobile());

    expect(window.addEventListener).toHaveBeenCalledWith('resize', expect.any(Function));
  });

  it('should remove resize event listener on unmount', () => {
    const { unmount } = renderHook(() => useIsMobile());

    unmount();

    expect(window.removeEventListener).toHaveBeenCalledWith('resize', expect.any(Function));
  });

  it('should update when window is resized', () => {
    let resizeHandler: (() => void) | null = null;

    window.addEventListener = jest.fn((event, handler) => {
      if (event === 'resize') {
        resizeHandler = handler as () => void;
      }
    });

    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024,
    });

    const { result, rerender } = renderHook(() => useIsMobile());

    expect(result.current).toBe(false);

    // Simulate resize to mobile
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 500,
    });

    act(() => {
      if (resizeHandler) {
        resizeHandler();
      }
    });

    rerender();

    expect(result.current).toBe(true);
  });
});
