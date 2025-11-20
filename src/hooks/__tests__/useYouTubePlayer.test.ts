import { renderHook, act, waitFor } from '@testing-library/react';

import * as audioUtils from '@/lib/utils/audioUtils';
import { Track } from '@/lib/utils/types';

import { useYouTubePlayer } from '../useYouTubePlayer';

// Mock dependencies
jest.mock('@/lib/utils/audioUtils');
jest.mock('@/lib/logger', () => ({
  logger: {
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

const mockTrack: Track = {
  id: '1',
  title: 'Test Track',
  artist: 'Test Artist',
  platforms: {
    youtube: {
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    },
  },
} as Track;

describe('useYouTubePlayer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should extract YouTube video ID from URL', () => {
    const { result } = renderHook(() =>
      useYouTubePlayer({
        track: mockTrack,
        isActive: false,
        isPlaying: false,
        onPlay: jest.fn(),
      })
    );

    expect(result.current.youtubeVideoId).toBe('dQw4w9WgXcQ');
  });

  it('should extract YouTube video ID from short URL', () => {
    const shortUrlTrack = {
      ...mockTrack,
      platforms: {
        youtube: {
          url: 'https://youtu.be/dQw4w9WgXcQ',
        },
      },
    };

    const { result } = renderHook(() =>
      useYouTubePlayer({
        track: shortUrlTrack,
        isActive: false,
        isPlaying: false,
        onPlay: jest.fn(),
      })
    );

    expect(result.current.youtubeVideoId).toBe('dQw4w9WgXcQ');
  });

  it('should handle video ID directly', () => {
    const directIdTrack = {
      ...mockTrack,
      platforms: {
        youtube: {
          url: 'dQw4w9WgXcQ',
        },
      },
    };

    const { result } = renderHook(() =>
      useYouTubePlayer({
        track: directIdTrack,
        isActive: false,
        isPlaying: false,
        onPlay: jest.fn(),
      })
    );

    expect(result.current.youtubeVideoId).toBe('dQw4w9WgXcQ');
  });

  it('should restore saved playback time from localStorage', () => {
    localStorage.setItem('youtube-time-dQw4w9WgXcQ', '42.5');

    const { result } = renderHook(() =>
      useYouTubePlayer({
        track: mockTrack,
        isActive: false,
        isPlaying: false,
        onPlay: jest.fn(),
      })
    );

    expect(result.current.currentTime).toBe(42.5);
  });

  it('should show YouTube iframe when active and playing', async () => {
    const { result } = renderHook(() =>
      useYouTubePlayer({
        track: mockTrack,
        isActive: true,
        isPlaying: true,
        onPlay: jest.fn(),
      })
    );

    act(() => {
      jest.advanceTimersByTime(200);
    });

    await waitFor(() => {
      expect(result.current.isYoutubeVisible).toBe(true);
    });
  });

  it('should send play command when active and playing', async () => {
    const mockIframe = document.createElement('iframe');
    const { result } = renderHook(() =>
      useYouTubePlayer({
        track: mockTrack,
        isActive: true,
        isPlaying: true,
        onPlay: jest.fn(),
      })
    );

    // Simulate iframe ref
    (result.current.iframeRef as any).current = mockIframe;

    act(() => {
      jest.advanceTimersByTime(200);
    });

    await waitFor(() => {
      expect(audioUtils.sendPlayerCommand).toHaveBeenCalledWith(mockIframe, 'youtube', 'play');
    });
  });

  it('should send pause command when not playing', async () => {
    const mockIframe = document.createElement('iframe');
    // Mock contentWindow for sendPlayerCommand
    Object.defineProperty(mockIframe, 'contentWindow', {
      value: { postMessage: jest.fn() },
      writable: true,
    });

    const { result, rerender } = renderHook(
      ({ isActive, isPlaying }) =>
        useYouTubePlayer({
          track: mockTrack,
          isActive,
          isPlaying,
          onPlay: jest.fn(),
        }),
      {
        initialProps: { isActive: true, isPlaying: true },
      }
    );

    (result.current.iframeRef as any).current = mockIframe;

    // Change to not playing to trigger pause
    rerender({ isActive: true, isPlaying: false });

    await waitFor(
      () => {
        expect(audioUtils.sendPlayerCommand).toHaveBeenCalledWith(mockIframe, 'youtube', 'pause');
      },
      { timeout: 2000 }
    );
  });

  it('should handle iframe load', () => {
    const { result } = renderHook(() =>
      useYouTubePlayer({
        track: mockTrack,
        isActive: false,
        isPlaying: false,
        onPlay: jest.fn(),
      })
    );

    act(() => {
      result.current.handleIframeLoad();
    });

    expect(result.current.isYoutubeLoaded).toBe(true);
  });

  it('should pause and hide YouTube', () => {
    const mockIframe = document.createElement('iframe');
    // Mock contentWindow for sendPlayerCommand
    Object.defineProperty(mockIframe, 'contentWindow', {
      value: { postMessage: jest.fn() },
      writable: true,
    });

    const { result } = renderHook(() =>
      useYouTubePlayer({
        track: mockTrack,
        isActive: true,
        isPlaying: true,
        onPlay: jest.fn(),
      })
    );

    (result.current.iframeRef as any).current = mockIframe;

    act(() => {
      result.current.pauseAndHideYoutube();
    });

    expect(result.current.isYoutubeVisible).toBe(false);
    expect(audioUtils.sendPlayerCommand).toHaveBeenCalledWith(mockIframe, 'youtube', 'pause');
  });

  it('should determine YouTube active state correctly', () => {
    const { result, rerender } = renderHook(
      ({ isActive, isPlaying }) =>
        useYouTubePlayer({
          track: mockTrack,
          isActive,
          isPlaying,
          onPlay: jest.fn(),
        }),
      {
        initialProps: { isActive: true, isPlaying: true },
      }
    );

    expect(result.current.isYoutubeActive).toBe(true);

    rerender({ isActive: false, isPlaying: true });
    expect(result.current.isYoutubeActive).toBe(false);
  });
});
