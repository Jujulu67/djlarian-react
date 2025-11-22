import { renderHook, act, waitFor } from '@testing-library/react';

import { logger } from '@/lib/logger';

import { useAudioFrequencyCapture } from '../useAudioFrequencyCapture';

// Mock logger
jest.mock('@/lib/logger', () => ({
  logger: {
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock Web Audio API
const mockAnalyser = {
  fftSize: 2048,
  frequencyBinCount: 1024,
  getByteFrequencyData: jest.fn(),
  connect: jest.fn(),
  disconnect: jest.fn(),
};

const mockAudioContext = {
  createAnalyser: jest.fn(() => mockAnalyser),
  createMediaElementSource: jest.fn(() => ({
    connect: jest.fn(),
    disconnect: jest.fn(),
  })),
  state: 'running',
  resume: jest.fn(),
  suspend: jest.fn(),
  close: jest.fn(),
} as any;

const mockMediaDevices = {
  getUserMedia: jest.fn(),
};

describe('useAudioFrequencyCapture', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Setup global mocks
    (window as any).AudioContext = jest.fn(() => mockAudioContext);
    (window as any).webkitAudioContext = jest.fn(() => mockAudioContext);
    Object.defineProperty(navigator, 'mediaDevices', {
      value: mockMediaDevices,
      writable: true,
      configurable: true,
    });

    // Reset analyser mock
    mockAnalyser.getByteFrequencyData.mockImplementation((array: Uint8Array) => {
      array.fill(128);
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with null frequency data', () => {
    const iframeRef = { current: null };
    const { result } = renderHook(() =>
      useAudioFrequencyCapture({
        iframeRef: iframeRef as any,
        isPlaying: false,
        isVisible: false,
      })
    );

    expect(result.current.frequencyData).toBeNull();
    expect(result.current.isCapturing).toBe(false);
  });

  it('should not capture when not visible', () => {
    const iframeRef = { current: document.createElement('iframe') };
    const { result } = renderHook(() =>
      useAudioFrequencyCapture({
        iframeRef: iframeRef as any,
        isPlaying: true,
        isVisible: false,
      })
    );

    expect(result.current.isCapturing).toBe(false);
    expect(result.current.frequencyData).toBeNull();
  });

  it('should not capture when not playing', () => {
    const iframeRef = { current: document.createElement('iframe') };
    const { result } = renderHook(() =>
      useAudioFrequencyCapture({
        iframeRef: iframeRef as any,
        isPlaying: false,
        isVisible: true,
      })
    );

    expect(result.current.isCapturing).toBe(false);
    expect(result.current.frequencyData).toBeNull();
  });

  it('should handle missing AudioContext gracefully', () => {
    (window as any).AudioContext = undefined;
    (window as any).webkitAudioContext = undefined;

    const iframeRef = { current: document.createElement('iframe') };
    const { result } = renderHook(() =>
      useAudioFrequencyCapture({
        iframeRef: iframeRef as any,
        isPlaying: true,
        isVisible: true,
      })
    );

    expect(result.current.isCapturing).toBe(false);
    expect(logger.warn).toHaveBeenCalledWith('AudioContext not supported');
  });

  it('should cleanup when conditions change', () => {
    const iframeRef = { current: document.createElement('iframe') };
    const { result, rerender } = renderHook(
      ({ isPlaying, isVisible }) =>
        useAudioFrequencyCapture({
          iframeRef: iframeRef as any,
          isPlaying,
          isVisible,
        }),
      {
        initialProps: { isPlaying: true, isVisible: true },
      }
    );

    // Change to not playing
    rerender({ isPlaying: false, isVisible: true });

    expect(result.current.isCapturing).toBe(false);
    expect(result.current.frequencyData).toBeNull();
  });

  it('should handle iframe ref becoming null', () => {
    const iframeRef = { current: document.createElement('iframe') };
    const { result, rerender } = renderHook(
      ({ iframeRef: ref }) =>
        useAudioFrequencyCapture({
          iframeRef: ref as any,
          isPlaying: true,
          isVisible: true,
        }),
      {
        initialProps: { iframeRef },
      }
    );

    // Set iframe to null
    iframeRef.current = null as unknown as HTMLIFrameElement;
    rerender({ iframeRef });

    expect(result.current.isCapturing).toBe(false);
  });
});
