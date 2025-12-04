/**
 * Tests for useMusicPlayer hook
 */
import { renderHook, act, waitFor } from '@testing-library/react';

import { useMusicPlayer } from '../useMusicPlayer';
import type { Track } from '@/lib/utils/types';

// Mock dependencies
jest.mock('@/lib/logger', () => ({
  logger: {
    debug: jest.fn(),
  },
}));

jest.mock('@/lib/utils/audioUtils', () => ({
  sendPlayerCommand: jest.fn(),
}));

const mockTracks: Track[] = [
  {
    id: '1',
    title: 'Track 1',
    artist: 'Artist 1',
    type: 'single',
    isPublished: true,
    featured: false,
    releaseDate: '2024-01-01',
    genre: ['Electronic'],
    publishAt: null,
    platforms: [],
  },
  {
    id: '2',
    title: 'Track 2',
    artist: 'Artist 2',
    type: 'album',
    isPublished: true,
    featured: false,
    releaseDate: '2024-02-01',
    genre: ['Rock'],
    publishAt: null,
    platforms: [],
  },
];

describe('useMusicPlayer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('should initialize with no current track', () => {
    const { result } = renderHook(() => useMusicPlayer({ filteredTracks: mockTracks }));

    expect(result.current.currentTrack).toBeNull();
    expect(result.current.isPlaying).toBe(false);
    expect(result.current.activeIndex).toBeNull();
  });

  it('should play a track', async () => {
    const { result } = renderHook(() => useMusicPlayer({ filteredTracks: mockTracks }));

    await act(async () => {
      result.current.playTrack({ id: '1', title: 'Track 1', action: 'play' });
      jest.advanceTimersByTime(200); // Advance past the 150ms timeout
    });

    await waitFor(() => {
      expect(result.current.currentTrack?.id).toBe('1');
    });
    expect(result.current.isPlaying).toBe(true);
    expect(result.current.activeIndex).toBe(0);
  });

  it('should toggle play/pause for same track', async () => {
    const { result } = renderHook(() => useMusicPlayer({ filteredTracks: mockTracks }));

    await act(async () => {
      result.current.playTrack({ id: '1', title: 'Track 1', action: 'play' });
      jest.advanceTimersByTime(200);
    });

    await waitFor(() => {
      expect(result.current.isPlaying).toBe(true);
    });

    await act(async () => {
      result.current.playTrack({ id: '1', title: 'Track 1', action: 'play' });
    });

    expect(result.current.isPlaying).toBe(false);
  });

  it('should close player', async () => {
    const { result } = renderHook(() => useMusicPlayer({ filteredTracks: mockTracks }));

    await act(async () => {
      result.current.playTrack({ id: '1', title: 'Track 1', action: 'play' });
    });

    await act(async () => {
      result.current.closePlayer();
      jest.advanceTimersByTime(100);
    });

    await waitFor(() => {
      expect(result.current.currentTrack).toBeNull();
      expect(result.current.isPlaying).toBe(false);
    });
  });

  it('should play next track', async () => {
    const { result } = renderHook(() => useMusicPlayer({ filteredTracks: mockTracks }));

    await act(async () => {
      result.current.playTrack({ id: '1', title: 'Track 1', action: 'play' });
      jest.advanceTimersByTime(200);
    });

    await waitFor(() => {
      expect(result.current.currentTrack?.id).toBe('1');
    });

    await act(async () => {
      result.current.playNextTrack();
      jest.advanceTimersByTime(200);
    });

    await waitFor(() => {
      expect(result.current.currentTrack?.id).toBe('2');
    });
    expect(result.current.activeIndex).toBe(1);
  });

  it('should play previous track', async () => {
    const { result } = renderHook(() => useMusicPlayer({ filteredTracks: mockTracks }));

    await act(async () => {
      result.current.playTrack({ id: '2', title: 'Track 2', action: 'play' });
      jest.advanceTimersByTime(200);
    });

    await waitFor(() => {
      expect(result.current.currentTrack?.id).toBe('2');
    });

    await act(async () => {
      result.current.playPrevTrack();
      jest.advanceTimersByTime(200);
    });

    await waitFor(() => {
      expect(result.current.currentTrack?.id).toBe('1');
    });
    expect(result.current.activeIndex).toBe(0);
  });

  it('should handle close request in playTrack', async () => {
    const { result } = renderHook(() => useMusicPlayer({ filteredTracks: mockTracks }));

    await act(async () => {
      result.current.playTrack({ id: '1', title: 'Track 1', action: 'play' });
    });

    await act(async () => {
      result.current.playTrack({ id: '1', title: 'Track 1', close: true });
      jest.advanceTimersByTime(100);
    });

    await waitFor(() => {
      expect(result.current.currentTrack).toBeNull();
    });
  });

  it('should toggle play/pause', async () => {
    const { result } = renderHook(() => useMusicPlayer({ filteredTracks: mockTracks }));

    await act(async () => {
      result.current.playTrack({ id: '1', title: 'Track 1', action: 'play' });
      jest.advanceTimersByTime(200);
    });

    await waitFor(() => {
      expect(result.current.isPlaying).toBe(true);
    });

    await act(async () => {
      result.current.togglePlay();
    });

    await waitFor(() => {
      expect(result.current.isPlaying).toBe(false);
    });
  });
  it('should auto-play track from URL parameter', async () => {
    // Mock window.location
    const originalLocation = window.location;
    delete (window as any).location;
    window.location = {
      ...originalLocation,
      search: '?play=1',
      href: 'http://localhost/?play=1',
    } as any;

    // Mock history.replaceState
    const replaceStateMock = jest.fn();
    window.history.replaceState = replaceStateMock;

    const { result } = renderHook(() => useMusicPlayer({ filteredTracks: mockTracks }));

    await act(async () => {
      jest.advanceTimersByTime(200);
    });

    await waitFor(() => {
      expect(result.current.currentTrack?.id).toBe('1');
    });
    expect(result.current.isPlaying).toBe(true);
    expect(replaceStateMock).toHaveBeenCalled();

    // Restore window.location
    window.location = originalLocation;
  });
});
