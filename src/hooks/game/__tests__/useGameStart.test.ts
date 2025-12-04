import { renderHook, act } from '@testing-library/react';
import { useGameStart } from '../useGameStart';
import { logger } from '@/lib/logger';

// Mock dependencies
jest.mock('@/lib/logger', () => ({
  logger: {
    debug: jest.fn(),
    error: jest.fn(),
  },
}));

describe('useGameStart', () => {
  const mockLogger = logger as jest.Mocked<typeof logger>;

  beforeEach(() => {
    jest.clearAllMocks();
    window.dispatchEvent = jest.fn();
  });

  it('should return handlePlayClick function', () => {
    const { result } = renderHook(() => useGameStart({ audioElement: null }));

    expect(typeof result.current.handlePlayClick).toBe('function');
  });

  it('should handle play click with audio element', async () => {
    const mockAudio = {
      paused: true,
      readyState: 0,
      currentTime: 0,
      src: 'test.mp3',
      load: jest.fn(),
      play: jest.fn().mockResolvedValue(undefined),
    } as unknown as HTMLAudioElement;

    const mockStartGame = jest.fn();

    const { result } = renderHook(() =>
      useGameStart({ audioElement: mockAudio, startGame: mockStartGame })
    );

    await act(async () => {
      result.current.handlePlayClick();
    });

    expect(mockAudio.play).toHaveBeenCalled();
    expect(mockStartGame).toHaveBeenCalled();
  });

  it('should dispatch game-start event when startGame is not available', async () => {
    const mockAudio = {
      paused: true,
      readyState: 2,
      currentTime: 0,
      src: 'test.mp3',
      play: jest.fn().mockResolvedValue(undefined),
    } as unknown as HTMLAudioElement;

    const { result } = renderHook(() => useGameStart({ audioElement: mockAudio }));

    await act(async () => {
      result.current.handlePlayClick();
    });

    expect(window.dispatchEvent).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'game-start' })
    );
  });

  it('should handle audio play error', async () => {
    const mockAudio = {
      paused: true,
      readyState: 2,
      currentTime: 0,
      src: 'test.mp3',
      play: jest.fn().mockRejectedValue(new Error('Play failed')),
    } as unknown as HTMLAudioElement;

    const mockStartGame = jest.fn();

    const { result } = renderHook(() =>
      useGameStart({ audioElement: mockAudio, startGame: mockStartGame })
    );

    await act(async () => {
      result.current.handlePlayClick();
    });

    expect(mockLogger.error).toHaveBeenCalled();
    expect(mockStartGame).toHaveBeenCalled();
  });

  it('should handle case when audio element is null', () => {
    const mockStartGame = jest.fn();

    const { result } = renderHook(() =>
      useGameStart({ audioElement: null, startGame: mockStartGame })
    );

    act(() => {
      result.current.handlePlayClick();
    });

    expect(mockStartGame).toHaveBeenCalled();
  });

  it('should load audio if readyState is too low', async () => {
    const mockLoad = jest.fn();
    const mockAudio = {
      paused: true,
      readyState: 1,
      currentTime: 0,
      src: 'test.mp3',
      load: mockLoad,
      play: jest.fn().mockResolvedValue(undefined),
    } as unknown as HTMLAudioElement;

    const { result } = renderHook(() => useGameStart({ audioElement: mockAudio }));

    await act(async () => {
      result.current.handlePlayClick();
    });

    expect(mockLoad).toHaveBeenCalled();
  });
});
