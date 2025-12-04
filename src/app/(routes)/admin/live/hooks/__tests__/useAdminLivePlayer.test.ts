import { renderHook, act, waitFor } from '@testing-library/react';
import { useAdminLivePlayer } from '../useAdminLivePlayer';
import { analyzeAudioFile } from '@/lib/live/audio-analysis';

// Mock dependencies
jest.mock('sonner', () => ({
  toast: {
    error: jest.fn(),
  },
}));

jest.mock('@/lib/live/audio-analysis', () => ({
  analyzeAudioFile: jest.fn(),
  formatDuration: jest.fn(
    (seconds) =>
      `${Math.floor(seconds / 60)}:${Math.floor(seconds % 60)
        .toString()
        .padStart(2, '0')}`
  ),
}));

describe('useAdminLivePlayer', () => {
  const mockSubmission = {
    id: 'sub-1',
    fileUrl: 'http://example.com/audio.mp3',
    fileName: 'test-audio.mp3',
    status: 'PENDING',
    userId: 'user-1',
    User: { id: 'user-1', name: 'Test User', email: 'test@example.com' },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const mockAudioAnalysis = {
    duration: 120,
    waveform: [],
    peaks: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (analyzeAudioFile as jest.Mock).mockResolvedValue(mockAudioAnalysis);

    // Mock fetch for loadAudioAnalysis
    global.fetch = jest.fn(() =>
      Promise.resolve({
        blob: () => Promise.resolve(new Blob(['audio content'], { type: 'audio/mp3' })),
      })
    ) as jest.Mock;

    // Mock localStorage
    Storage.prototype.getItem = jest.fn();
    Storage.prototype.setItem = jest.fn();
    Storage.prototype.removeItem = jest.fn();
  });

  it('should initialize with default values', () => {
    const { result } = renderHook(() => useAdminLivePlayer());

    expect(result.current.selectedSubmission).toBeNull();
    expect(result.current.audioAnalysis).toBeNull();
    expect(result.current.isPlaying).toBe(false);
    expect(result.current.currentTime).toBe(0);
    expect(result.current.duration).toBe(0);
    expect(result.current.volume).toBe(1);
    expect(result.current.playbackRate).toBe(1);
  });

  it('should set selected submission and load analysis', async () => {
    const { result } = renderHook(() => useAdminLivePlayer());

    await act(async () => {
      result.current.setSelectedSubmission(mockSubmission as any);
    });

    expect(result.current.selectedSubmission).toEqual(mockSubmission);
    expect(localStorage.setItem).toHaveBeenCalledWith(
      'adminLiveSelectedSubmissionId',
      mockSubmission.id
    );

    await waitFor(() => {
      expect(analyzeAudioFile).toHaveBeenCalled();
      expect(result.current.audioAnalysis).toEqual(mockAudioAnalysis);
    });
  });

  it('should handle play/pause', async () => {
    const { result } = renderHook(() => useAdminLivePlayer());

    // Setup audio ref mock
    const playMock = jest.fn().mockResolvedValue(undefined);
    const pauseMock = jest.fn();
    const loadMock = jest.fn();

    // We need to manually set the ref current value since it's internal
    // However, the hook exposes audioRef, so we can modify it?
    // Actually, we can't easily modify the ref attached to an element if we don't render the element.
    // But the hook returns audioRef, so we can assign a mock object to it for testing purposes
    // although in a real component it would be attached to an <audio> tag.

    // Let's simulate the ref being attached
    Object.defineProperty(result.current.audioRef, 'current', {
      value: {
        play: playMock,
        pause: pauseMock,
        load: loadMock,
        readyState: 4, // HAVE_ENOUGH_DATA
        volume: 1,
        playbackRate: 1,
        currentTime: 0,
        duration: 120,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      },
      writable: true,
    });

    await act(async () => {
      await result.current.handlePlayPause();
    });

    expect(playMock).toHaveBeenCalled();
    // State update happens in event listeners in the hook, but we mocked play/pause methods.
    // The hook listens to 'play' and 'pause' events on the audio element to update state.
    // Since we mocked the element but didn't trigger events, state won't update automatically
    // unless we simulate the events or if the hook sets state optimistically (it doesn't seem to).

    // Wait, the hook sets isPlaying(true) in handlePlay event handler.
    // We need to simulate the event.
    // But we can't easily trigger event on our mock object unless we implement EventTarget.

    // Alternatively, we can check if the play method was called, which we did.
  });

  it('should handle volume changes', () => {
    const { result } = renderHook(() => useAdminLivePlayer());

    // Mock audio ref
    const audioMock = { volume: 1 };
    Object.defineProperty(result.current.audioRef, 'current', {
      value: audioMock,
      writable: true,
    });

    act(() => {
      result.current.handleVolumeChange(0.5);
    });

    expect(result.current.volume).toBe(0.5);
    expect(audioMock.volume).toBe(0.5);
  });

  it('should handle volume toggle (mute/unmute)', () => {
    const { result } = renderHook(() => useAdminLivePlayer());

    // Mock audio ref
    const audioMock = { volume: 1 };
    Object.defineProperty(result.current.audioRef, 'current', {
      value: audioMock,
      writable: true,
    });

    // Mute
    act(() => {
      result.current.handleVolumeToggle();
    });
    expect(result.current.volume).toBe(0);
    expect(audioMock.volume).toBe(0);

    // Unmute
    act(() => {
      result.current.handleVolumeToggle();
    });
    expect(result.current.volume).toBe(1); // Should restore to previous (1)
    expect(audioMock.volume).toBe(1);
  });

  it('should handle playback rate toggle', () => {
    const { result } = renderHook(() => useAdminLivePlayer());

    // Mock audio ref
    const audioMock = { playbackRate: 1 };
    Object.defineProperty(result.current.audioRef, 'current', {
      value: audioMock,
      writable: true,
    });

    // 1 -> 1.5
    act(() => {
      result.current.handlePlaybackRateToggle();
    });
    expect(result.current.playbackRate).toBe(1.5);
    expect(audioMock.playbackRate).toBe(1.5);

    // 1.5 -> 2
    act(() => {
      result.current.handlePlaybackRateToggle();
    });
    expect(result.current.playbackRate).toBe(2);

    // 2 -> 1
    act(() => {
      result.current.handlePlaybackRateToggle();
    });
    expect(result.current.playbackRate).toBe(1);
  });

  it('should handle close', () => {
    const { result } = renderHook(() => useAdminLivePlayer());

    // Set some state
    act(() => {
      result.current.setSelectedSubmission(mockSubmission as any);
    });

    // Mock audio ref
    const pauseMock = jest.fn();
    Object.defineProperty(result.current.audioRef, 'current', {
      value: {
        pause: pauseMock,
        currentTime: 10,
      },
      writable: true,
    });

    act(() => {
      result.current.handleClose();
    });

    expect(result.current.selectedSubmission).toBeNull();
    expect(result.current.audioAnalysis).toBeNull();
    expect(result.current.isPlaying).toBe(false);
    expect(pauseMock).toHaveBeenCalled();
    expect(localStorage.removeItem).toHaveBeenCalledWith('adminLiveSelectedSubmissionId');
  });

  it('should restore selected submission from localStorage', () => {
    const { result } = renderHook(() => useAdminLivePlayer());

    (localStorage.getItem as jest.Mock).mockReturnValue('sub-1');

    act(() => {
      result.current.restoreSelectedSubmission([mockSubmission] as any);
    });

    expect(result.current.selectedSubmission).toEqual(mockSubmission);
  });
});
