import { render, screen } from '@testing-library/react';
import MusicPlayerSystem from '../MusicPlayerSystem';
import type { Track } from '@/lib/utils/types';

// Mock next/image
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: any) => <img {...props} />,
}));

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <div>{children}</div>,
}));

// Mock logger
jest.mock('@/lib/logger', () => ({
  logger: {
    debug: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock music-service
jest.mock('@/lib/utils/music-service', () => ({
  getEmbedUrl: jest.fn(() => 'https://embed.test.com'),
}));

describe('MusicPlayerSystem', () => {
  const mockTrack: Track = {
    id: 'track-1',
    title: 'Test Track',
    artist: 'Test Artist',
    releaseDate: '2024-01-01',
    genre: [],
    type: 'single',
    platforms: {
      spotify: { url: 'https://spotify.com/track' },
    },
  };

  const mockOnClose = jest.fn();
  const mockOnTogglePlay = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render music player', () => {
    render(
      <MusicPlayerSystem
        track={mockTrack}
        isPlaying={false}
        onClose={mockOnClose}
        onTogglePlay={mockOnTogglePlay}
      />
    );

    expect(screen.getByText('Test Track')).toBeInTheDocument();
  });

  it('should render with playing state', () => {
    render(
      <MusicPlayerSystem
        track={mockTrack}
        isPlaying={true}
        onClose={mockOnClose}
        onTogglePlay={mockOnTogglePlay}
      />
    );

    expect(screen.getByText('Test Track')).toBeInTheDocument();
  });

  it('should handle null track', () => {
    render(
      <MusicPlayerSystem
        track={null}
        isPlaying={false}
        onClose={mockOnClose}
        onTogglePlay={mockOnTogglePlay}
      />
    );

    // Should render but without track info
    expect(screen.queryByText('Test Track')).not.toBeInTheDocument();
  });

  it('should display track title and artist', () => {
    render(
      <MusicPlayerSystem
        track={mockTrack}
        isPlaying={false}
        onClose={mockOnClose}
        onTogglePlay={mockOnTogglePlay}
      />
    );

    expect(screen.getByText('Test Track')).toBeInTheDocument();
    expect(screen.getByText('Test Artist')).toBeInTheDocument();
  });
});
