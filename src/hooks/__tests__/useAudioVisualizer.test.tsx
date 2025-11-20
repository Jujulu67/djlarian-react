import { renderHook, act } from '@testing-library/react';
import { useAudioVisualizer } from '../useAudioVisualizer';

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

describe('useAudioVisualizer', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('should return empty audio data when players are not visible', () => {
    const { result } = renderHook(() =>
      useAudioVisualizer({
        isYoutubeVisible: false,
        isSoundcloudVisible: false,
      })
    );

    expect(result.current.audioData).toEqual(Array(20).fill(0));
    expect(result.current.renderVisualizer()).toBeNull();
  });

  it('should animate bars when YouTube is visible', () => {
    const { result, rerender } = renderHook(
      ({ isYoutubeVisible, isSoundcloudVisible }) =>
        useAudioVisualizer({
          isYoutubeVisible,
          isSoundcloudVisible,
        }),
      {
        initialProps: {
          isYoutubeVisible: false,
          isSoundcloudVisible: false,
        },
      }
    );

    expect(result.current.audioData).toEqual(Array(20).fill(0));

    // Make YouTube visible
    rerender({
      isYoutubeVisible: true,
      isSoundcloudVisible: false,
    });

    // Advance timers to trigger animation
    act(() => {
      jest.advanceTimersByTime(100);
    });

    // Audio data should be animated (not all zeros)
    const hasNonZeroValues = result.current.audioData.some((val) => val > 0);
    expect(hasNonZeroValues).toBe(true);
  });

  it('should animate bars when SoundCloud is visible', () => {
    const { result, rerender } = renderHook(
      ({ isYoutubeVisible, isSoundcloudVisible }) =>
        useAudioVisualizer({
          isYoutubeVisible,
          isSoundcloudVisible,
        }),
      {
        initialProps: {
          isYoutubeVisible: false,
          isSoundcloudVisible: false,
        },
      }
    );

    // Make SoundCloud visible
    rerender({
      isYoutubeVisible: false,
      isSoundcloudVisible: true,
    });

    act(() => {
      jest.advanceTimersByTime(100);
    });

    const hasNonZeroValues = result.current.audioData.some((val) => val > 0);
    expect(hasNonZeroValues).toBe(true);
  });

  it('should render visualizer when player is visible', () => {
    const { result } = renderHook(() =>
      useAudioVisualizer({
        isYoutubeVisible: true,
        isSoundcloudVisible: false,
      })
    );

    const visualizer = result.current.renderVisualizer();
    expect(visualizer).not.toBeNull();
  });

  it('should stop animation when players become invisible', () => {
    const { result, rerender } = renderHook(
      ({ isYoutubeVisible, isSoundcloudVisible }) =>
        useAudioVisualizer({
          isYoutubeVisible,
          isSoundcloudVisible,
        }),
      {
        initialProps: {
          isYoutubeVisible: true,
          isSoundcloudVisible: false,
        },
      }
    );

    act(() => {
      jest.advanceTimersByTime(100);
    });

    // Make invisible
    rerender({
      isYoutubeVisible: false,
      isSoundcloudVisible: false,
    });

    expect(result.current.audioData).toEqual(Array(20).fill(0));
  });
});

