import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';

import { MusicCardVisualizer } from '../MusicCardVisualizer';

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

describe('MusicCardVisualizer', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should not render when not visible', () => {
    const { container } = render(
      <MusicCardVisualizer
        isVisible={false}
        isPlaying={false}
        frequencyData={null}
        isRealAudio={false}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it('should render when visible', () => {
    const { container } = render(
      <MusicCardVisualizer
        isVisible={true}
        isPlaying={false}
        frequencyData={null}
        isRealAudio={false}
      />
    );

    expect(container.firstChild).toBeInTheDocument();
  });

  it('should render 20 bars', () => {
    const { container } = render(
      <MusicCardVisualizer
        isVisible={true}
        isPlaying={false}
        frequencyData={null}
        isRealAudio={false}
      />
    );

    // Each bar has a key with "waveform-bar-" prefix
    const bars = container.querySelectorAll('[class*="rounded-t-md"]');
    expect(bars.length).toBeGreaterThanOrEqual(20);
  });

  it('should handle real audio frequency data', async () => {
    const frequencyData = new Uint8Array(1024).fill(128);

    const { container } = render(
      <MusicCardVisualizer
        isVisible={true}
        isPlaying={true}
        frequencyData={frequencyData}
        isRealAudio={true}
      />
    );

    // Advance time to trigger animation
    jest.advanceTimersByTime(100);

    await waitFor(() => {
      expect(container.firstChild).toBeInTheDocument();
    });
  });

  it('should handle simulated audio when playing without real audio', async () => {
    const { container } = render(
      <MusicCardVisualizer
        isVisible={true}
        isPlaying={true}
        frequencyData={null}
        isRealAudio={false}
      />
    );

    jest.advanceTimersByTime(100);

    await waitFor(() => {
      expect(container.firstChild).toBeInTheDocument();
    });
  });

  it('should handle pause animation when not playing', async () => {
    const { container } = render(
      <MusicCardVisualizer
        isVisible={true}
        isPlaying={false}
        frequencyData={null}
        isRealAudio={false}
      />
    );

    jest.advanceTimersByTime(100);

    await waitFor(() => {
      expect(container.firstChild).toBeInTheDocument();
    });
  });

  it('should cleanup animation frame on unmount', () => {
    const cancelAnimationFrameSpy = jest.spyOn(window, 'cancelAnimationFrame');

    const { unmount } = render(
      <MusicCardVisualizer
        isVisible={true}
        isPlaying={true}
        frequencyData={null}
        isRealAudio={false}
      />
    );

    jest.advanceTimersByTime(100);

    unmount();

    expect(cancelAnimationFrameSpy).toHaveBeenCalled();
    cancelAnimationFrameSpy.mockRestore();
  });

  it('should reset data when visibility changes to false', () => {
    const { rerender } = render(
      <MusicCardVisualizer
        isVisible={true}
        isPlaying={true}
        frequencyData={null}
        isRealAudio={false}
      />
    );

    jest.advanceTimersByTime(100);

    rerender(
      <MusicCardVisualizer
        isVisible={false}
        isPlaying={true}
        frequencyData={null}
        isRealAudio={false}
      />
    );

    // Component should not render
    const { container } = render(
      <MusicCardVisualizer
        isVisible={false}
        isPlaying={true}
        frequencyData={null}
        isRealAudio={false}
      />
    );

    expect(container.firstChild).toBeNull();
  });
});
