import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

import { Track } from '@/lib/utils/types';

import { MusicCard } from '../../MusicCard';

// Mock all dependencies
jest.mock('@/hooks/useYouTubePlayer');
jest.mock('@/hooks/useSoundCloudPlayer');
jest.mock('@/hooks/useAudioFrequencyCapture');
jest.mock('@/lib/utils/audioUtils', () => ({
  sendPlayerCommand: jest.fn(),
}));
jest.mock('@/lib/logger', () => ({
  logger: {
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

// Mock sub-components
jest.mock('../MusicCardBadges', () => ({
  MusicCardBadges: ({ track }: any) => <div data-testid="badges">{track.title}</div>,
}));

jest.mock('../MusicCardControls', () => ({
  MusicCardControls: ({ onPlayClick, isPlaying }: any) => (
    <button data-testid="play-button" onClick={onPlayClick}>
      {isPlaying ? 'Pause' : 'Play'}
    </button>
  ),
}));

jest.mock('../MusicCardImage', () => ({
  MusicCardImage: ({ track }: any) => <img data-testid="track-image" alt={track.title} />,
}));

jest.mock('../MusicCardInfo', () => ({
  MusicCardInfo: ({ track }: any) => <div data-testid="track-info">{track.title}</div>,
}));

jest.mock('../MusicCardPlatforms', () => ({
  MusicCardPlatforms: () => <div data-testid="platforms">Platforms</div>,
}));

jest.mock('../MusicCardPlayer', () => ({
  MusicCardPlayer: () => <div data-testid="player">Player</div>,
}));

jest.mock('../MusicCardVisualizer', () => ({
  MusicCardVisualizer: () => <div data-testid="visualizer">Visualizer</div>,
}));

const mockTrack: Track = {
  id: '1',
  title: 'Test Track',
  artist: 'Test Artist',
  coverUrl: 'https://example.com/cover.jpg',
  releaseDate: '2024-01-01',
  genre: ['Electronic'],
  type: 'single',
  platforms: {
    youtube: { url: 'https://youtube.com/watch?v=test' },
    soundcloud: { url: 'https://soundcloud.com/test' },
  },
} as Track;

describe('MusicCard Integration', () => {
  const mockOnPlay = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock hooks
    const { useYouTubePlayer } = require('@/hooks/useYouTubePlayer');
    const { useSoundCloudPlayer } = require('@/hooks/useSoundCloudPlayer');
    const { useAudioFrequencyCapture } = require('@/hooks/useAudioFrequencyCapture');

    useYouTubePlayer.mockReturnValue({
      youtubeVideoId: 'test',
      currentTime: 0,
      isYoutubeLoaded: false,
      isYoutubeVisible: false,
      isYoutubeActive: false,
      iframeRef: { current: null },
      setIsYoutubeVisible: jest.fn(),
      handleIframeLoad: jest.fn(),
      pauseAndHideYoutube: jest.fn(),
      resumeYoutube: jest.fn(),
      handleClosePlayer: jest.fn(),
    });

    useSoundCloudPlayer.mockReturnValue({
      soundcloudUrl: 'https://soundcloud.com/test',
      isSoundcloudLoaded: false,
      isSoundcloudVisible: false,
      isSoundcloudReady: false,
      isSoundcloudActive: false,
      soundcloudIframeRef: { current: null },
      setIsSoundcloudVisible: jest.fn(),
      handleSoundcloudIframeLoad: jest.fn(),
      getSoundcloudEmbedUrl: jest.fn((url) => url),
      pauseAndHideSoundcloud: jest.fn(),
      resumeSoundcloud: jest.fn(),
      handleClosePlayer: jest.fn(),
    });

    useAudioFrequencyCapture.mockReturnValue({
      frequencyData: null,
      isCapturing: false,
    });
  });

  it('should render all sub-components', () => {
    render(<MusicCard track={mockTrack} onPlay={mockOnPlay} isPlaying={false} isActive={false} />);

    expect(screen.getByTestId('track-image')).toBeInTheDocument();
    expect(screen.getByTestId('track-info')).toBeInTheDocument();
    expect(screen.getByTestId('badges')).toBeInTheDocument();
    expect(screen.getByTestId('platforms')).toBeInTheDocument();
    expect(screen.getByTestId('play-button')).toBeInTheDocument();
  });

  it('should call onPlay when play button is clicked', () => {
    render(<MusicCard track={mockTrack} onPlay={mockOnPlay} isPlaying={false} isActive={false} />);

    const playButton = screen.getByTestId('play-button');
    fireEvent.click(playButton);

    expect(mockOnPlay).toHaveBeenCalledWith(mockTrack);
  });

  it('should show player when active and playing', () => {
    const { useYouTubePlayer } = require('@/hooks/useYouTubePlayer');
    useYouTubePlayer.mockReturnValue({
      youtubeVideoId: 'test',
      isYoutubeVisible: true,
      isYoutubeActive: true,
      iframeRef: { current: null },
      setIsYoutubeVisible: jest.fn(),
      handleIframeLoad: jest.fn(),
      pauseAndHideYoutube: jest.fn(),
      resumeYoutube: jest.fn(),
      handleClosePlayer: jest.fn(),
    });

    render(<MusicCard track={mockTrack} onPlay={mockOnPlay} isPlaying={true} isActive={true} />);

    expect(screen.getByTestId('player')).toBeInTheDocument();
    expect(screen.getByTestId('visualizer')).toBeInTheDocument();
  });

  it('should handle image error', () => {
    render(<MusicCard track={mockTrack} onPlay={mockOnPlay} isPlaying={false} isActive={false} />);

    const image = screen.getByTestId('track-image');
    fireEvent.error(image);

    // Image error should be handled gracefully
    expect(image).toBeInTheDocument();
  });
});
