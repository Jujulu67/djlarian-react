import { renderHook, act } from '@testing-library/react';
import { useAudioAnalyser } from '../useAudioAnalyser';

// Mock logger
jest.mock('@/lib/logger', () => ({
  logger: {
    debug: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

// Mock AudioContext
global.AudioContext = jest.fn().mockImplementation(() => ({
  createAnalyser: jest.fn(() => ({
    fftSize: 512,
    smoothingTimeConstant: 0.7,
    frequencyBinCount: 256,
    getByteFrequencyData: jest.fn(),
    connect: jest.fn(),
    disconnect: jest.fn(),
  })),
  createMediaElementSource: jest.fn(() => ({
    connect: jest.fn(),
    disconnect: jest.fn(),
  })),
  destination: {},
  state: 'running',
  resume: jest.fn().mockResolvedValue(undefined),
  close: jest.fn(),
})) as unknown as typeof AudioContext;

describe('useAudioAnalyser', () => {
  const mockAudioElement = {
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  } as unknown as HTMLAudioElement;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize audio analyser', () => {
    const { result } = renderHook(() => useAudioAnalyser(mockAudioElement));

    expect(result.current.audioAnalyser).toBeDefined();
    expect(result.current.audioData).toBeDefined();
    expect(result.current.bpm).toBeDefined();
    expect(result.current.beatConfidence).toBeDefined();
  });

  it('should setup audio analyser', async () => {
    const { result } = renderHook(() => useAudioAnalyser(mockAudioElement));

    await act(async () => {
      const success = await result.current.setupAudioAnalyser();
      expect(typeof success).toBe('boolean');
    });
  });

  it('should analyze frequency bands', () => {
    const { result } = renderHook(() => useAudioAnalyser(mockAudioElement));

    const audioData = new Uint8Array(256);
    audioData.fill(100);

    const bands = result.current.analyzeFrequencyBands(audioData);

    expect(bands).toBeDefined();
    expect(bands.bass).toBeGreaterThanOrEqual(0);
    expect(bands.mid).toBeGreaterThanOrEqual(0);
    expect(bands.high).toBeGreaterThanOrEqual(0);
  });

  it('should detect beats', () => {
    const { result } = renderHook(() => useAudioAnalyser(mockAudioElement));

    const audioData = new Uint8Array(256);
    audioData.fill(200); // High values to trigger beat

    const hasBeat = result.current.detectBeat(Date.now(), audioData);

    expect(typeof hasBeat).toBe('boolean');
  });

  it('should get audio data', () => {
    const { result } = renderHook(() => useAudioAnalyser(mockAudioElement));

    const audioData = result.current.getAudioData();

    expect(audioData === null || audioData instanceof Uint8Array).toBe(true);
  });

  it('should update audio data', () => {
    const { result } = renderHook(() => useAudioAnalyser(mockAudioElement));

    act(() => {
      result.current.updateAudioData();
    });

    // Should not throw
    expect(result.current).toBeDefined();
  });

  it('should reconnect audio', async () => {
    const { result } = renderHook(() => useAudioAnalyser(mockAudioElement));

    await act(async () => {
      const success = await result.current.reconnectAudio();
      expect(typeof success).toBe('boolean');
    });
  });

  it('should handle null audio element', () => {
    const { result } = renderHook(() => useAudioAnalyser(null));

    expect(result.current.audioAnalyser).toBeDefined();
  });

  it('should handle setupAudioAnalyser with null audio element', async () => {
    const { result } = renderHook(() => useAudioAnalyser(null));

    await act(async () => {
      const success = await result.current.setupAudioAnalyser();
      expect(success).toBe(false);
    });
  });

  it('should handle reconnectAudio with max attempts', async () => {
    const { result } = renderHook(() => useAudioAnalyser(mockAudioElement));

    // Mock multiple failed attempts
    (global.AudioContext as jest.Mock).mockImplementation(() => {
      throw new Error('Failed');
    });

    // Try to reconnect multiple times
    for (let i = 0; i < 4; i++) {
      await act(async () => {
        await result.current.reconnectAudio();
      });
    }

    // Should handle gracefully after max attempts
    expect(result.current).toBeDefined();
  });

  it('should detect beats with high audio values', () => {
    const { result } = renderHook(() => useAudioAnalyser(mockAudioElement));

    const audioData = new Uint8Array(256);
    // Set high bass values (first indices)
    audioData[0] = 255;
    audioData[1] = 255;
    audioData[2] = 255;

    const hasBeat = result.current.detectBeat(Date.now(), audioData);
    expect(typeof hasBeat).toBe('boolean');
  });

  it('should analyze frequency bands with different values', () => {
    const { result } = renderHook(() => useAudioAnalyser(mockAudioElement));

    const audioData = new Uint8Array(256);
    // Set different values for different frequency ranges
    for (let i = 0; i < 50; i++) {
      audioData[i] = 200; // Bass
    }
    for (let i = 50; i < 150; i++) {
      audioData[i] = 150; // Mid
    }
    for (let i = 150; i < 256; i++) {
      audioData[i] = 100; // High
    }

    const bands = result.current.analyzeFrequencyBands(audioData);
    expect(bands.bass).toBeGreaterThan(0);
    expect(bands.mid).toBeGreaterThan(0);
    expect(bands.high).toBeGreaterThan(0);
  });
});
