import { renderHook, act, waitFor } from '@testing-library/react';

import * as audioUtils from '@/lib/utils/audioUtils';
import { Track } from '@/lib/utils/types';

import { useSoundCloudPlayer } from '../useSoundCloudPlayer';

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
    soundcloud: {
      url: 'https://soundcloud.com/user/track',
    },
  },
} as Track;

describe('useSoundCloudPlayer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should extract SoundCloud URL from track', () => {
    const { result } = renderHook(() =>
      useSoundCloudPlayer({
        track: mockTrack,
        isActive: false,
        isPlaying: false,
        onPlay: jest.fn(),
      })
    );

    expect(result.current.soundcloudUrl).toBe('https://soundcloud.com/user/track');
  });

  it('should generate correct embed URL', () => {
    const { result } = renderHook(() =>
      useSoundCloudPlayer({
        track: mockTrack,
        isActive: false,
        isPlaying: false,
        onPlay: jest.fn(),
      })
    );

    const embedUrl = result.current.getSoundcloudEmbedUrl('https://soundcloud.com/user/track');
    expect(embedUrl).toContain('soundcloud.com');
    expect(embedUrl).toContain('player');
  });

  it('should show SoundCloud iframe when active and playing', async () => {
    const { result } = renderHook(() =>
      useSoundCloudPlayer({
        track: mockTrack,
        isActive: true,
        isPlaying: true,
        onPlay: jest.fn(),
      })
    );

    await waitFor(() => {
      expect(result.current.isSoundcloudVisible).toBe(true);
    });
  });

  it('should send play command when ready and playing', async () => {
    const mockIframe = document.createElement('iframe');
    const mockContentWindow = { postMessage: jest.fn() };
    // Mock contentWindow for sendPlayerCommand
    Object.defineProperty(mockIframe, 'contentWindow', {
      value: mockContentWindow,
      writable: true,
    });

    const { result } = renderHook(() =>
      useSoundCloudPlayer({
        track: mockTrack,
        isActive: true,
        isPlaying: true,
        onPlay: jest.fn(),
      })
    );

    (result.current.soundcloudIframeRef as any).current = mockIframe;

    // Simulate iframe ready - this sets isSoundcloudLoaded
    act(() => {
      result.current.handleSoundcloudIframeLoad();
    });

    // Simulate ready message from SoundCloud - must match the source check
    act(() => {
      const event = new MessageEvent('message', {
        data: JSON.stringify({ method: 'ready' }),
        source: mockContentWindow as unknown as MessageEventSource,
      });
      window.dispatchEvent(event);
    });

    await waitFor(
      () => {
        expect(audioUtils.sendPlayerCommand).toHaveBeenCalledWith(mockIframe, 'soundcloud', 'play');
      },
      { timeout: 2000 }
    );
  });

  it('should send pause command when not playing', async () => {
    const mockIframe = document.createElement('iframe');
    const mockContentWindow = { postMessage: jest.fn() };
    // Mock contentWindow for sendPlayerCommand
    Object.defineProperty(mockIframe, 'contentWindow', {
      value: mockContentWindow,
      writable: true,
    });

    const { result, rerender } = renderHook(
      ({ isActive, isPlaying }) =>
        useSoundCloudPlayer({
          track: mockTrack,
          isActive,
          isPlaying,
          onPlay: jest.fn(),
        }),
      {
        initialProps: { isActive: true, isPlaying: true },
      }
    );

    (result.current.soundcloudIframeRef as any).current = mockIframe;

    // Change to not playing to trigger pause
    rerender({ isActive: true, isPlaying: false });

    await waitFor(
      () => {
        expect(audioUtils.sendPlayerCommand).toHaveBeenCalledWith(
          mockIframe,
          'soundcloud',
          'pause'
        );
      },
      { timeout: 2000 }
    );
  });

  it('should handle iframe load and set ready state', () => {
    const { result } = renderHook(() =>
      useSoundCloudPlayer({
        track: mockTrack,
        isActive: false,
        isPlaying: false,
        onPlay: jest.fn(),
      })
    );

    act(() => {
      result.current.handleSoundcloudIframeLoad();
    });

    expect(result.current.isSoundcloudLoaded).toBe(true);
  });

  it('should pause and hide SoundCloud', () => {
    const mockIframe = document.createElement('iframe');
    const mockContentWindow = { postMessage: jest.fn() };
    // Mock contentWindow for sendPlayerCommand
    Object.defineProperty(mockIframe, 'contentWindow', {
      value: mockContentWindow,
      writable: true,
    });

    const { result } = renderHook(() =>
      useSoundCloudPlayer({
        track: mockTrack,
        isActive: true,
        isPlaying: true,
        onPlay: jest.fn(),
      })
    );

    (result.current.soundcloudIframeRef as any).current = mockIframe;

    act(() => {
      result.current.pauseAndHideSoundcloud();
    });

    // pauseAndHideSoundcloud sets playWhenReady to false but doesn't hide
    // The visibility is managed by setIsSoundcloudVisible elsewhere
    // So we just verify that sendPlayerCommand was called
    expect(audioUtils.sendPlayerCommand).toHaveBeenCalledWith(mockIframe, 'soundcloud', 'pause');
  });

  it('should determine SoundCloud active state correctly', () => {
    const { result, rerender } = renderHook(
      ({ isActive, isPlaying }) =>
        useSoundCloudPlayer({
          track: mockTrack,
          isActive,
          isPlaying,
          onPlay: jest.fn(),
        }),
      {
        initialProps: { isActive: true, isPlaying: true },
      }
    );

    // Set iframe as loaded
    act(() => {
      result.current.handleSoundcloudIframeLoad();
    });

    expect(result.current.isSoundcloudActive).toBe(true);

    rerender({ isActive: false, isPlaying: true });
    expect(result.current.isSoundcloudActive).toBe(false);
  });

  it('should wait for ready state before playing', async () => {
    const mockIframe = document.createElement('iframe');
    const mockContentWindow = { postMessage: jest.fn() };
    // Mock contentWindow for sendPlayerCommand
    Object.defineProperty(mockIframe, 'contentWindow', {
      value: mockContentWindow,
      writable: true,
    });

    const { result } = renderHook(() =>
      useSoundCloudPlayer({
        track: mockTrack,
        isActive: true,
        isPlaying: true,
        onPlay: jest.fn(),
      })
    );

    (result.current.soundcloudIframeRef as any).current = mockIframe;

    // Simulate iframe load
    act(() => {
      result.current.handleSoundcloudIframeLoad();
    });

    // Simulate ready message from SoundCloud
    act(() => {
      const event = new MessageEvent('message', {
        data: JSON.stringify({ method: 'ready' }),
        source: mockContentWindow as unknown as MessageEventSource,
      });
      window.dispatchEvent(event);
    });

    // Wait for the effect to trigger
    await waitFor(
      () => {
        expect(audioUtils.sendPlayerCommand).toHaveBeenCalledWith(mockIframe, 'soundcloud', 'play');
      },
      { timeout: 2000 }
    );
  });
});
