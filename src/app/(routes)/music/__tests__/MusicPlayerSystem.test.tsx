import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import MusicPlayerSystem from '@/components/ui/MusicPlayerSystem';
import { Track } from '@/lib/utils/types';

// Mock pour framer-motion
jest.mock('framer-motion', () => {
  const AnimatePresence = ({ children }: { children: React.ReactNode }) => <>{children}</>;
  const motion = {
    div: ({ children, ...props }: { children: React.ReactNode; [key: string]: any }) => (
      <div {...props}>{children}</div>
    ),
  };
  return { AnimatePresence, motion };
});

// Mock pour une piste
const mockTrack: Track = {
  id: '1',
  title: 'Mock Track Title',
  artist: 'Mock Artist',
  coverUrl: 'https://example.com/cover.jpg',
  releaseDate: '2024-01-01',
  genre: ['Test'],
  type: 'single',
  platforms: {
    youtube: {
      url: 'https://youtube.com/watch?v=test',
    },
    soundcloud: {
      url: 'https://soundcloud.com/test',
    },
  },
};

describe('MusicPlayerSystem', () => {
  it('should render the track title with correct data-testid', () => {
    render(
      <MusicPlayerSystem
        track={mockTrack}
        isPlaying={true}
        onTogglePlay={() => {}}
        onClose={() => {}}
      />
    );

    // Vérifier que le titre dans le footer a le bon data-testid
    const footerTitle = screen.getByTestId('footer-track-title');
    expect(footerTitle).toHaveTextContent(mockTrack.title);
  });

  it('should render play and control buttons with correct data-testid', () => {
    render(
      <MusicPlayerSystem
        track={mockTrack}
        isPlaying={true}
        onTogglePlay={() => {}}
        onClose={() => {}}
        onNextTrack={() => {}}
        onPrevTrack={() => {}}
      />
    );

    // Vérifier que les boutons de contrôle ont les bons data-testid
    expect(screen.getByTestId('system-play-button')).toBeInTheDocument();
    expect(screen.getByTestId('system-prev-button')).toBeInTheDocument();
    expect(screen.getByTestId('system-next-button')).toBeInTheDocument();
    expect(screen.getByTestId('system-close-button')).toBeInTheDocument();
  });

  it('should call onTogglePlay when play button is clicked', () => {
    const handleTogglePlay = jest.fn();
    render(
      <MusicPlayerSystem
        track={mockTrack}
        isPlaying={false}
        onTogglePlay={handleTogglePlay}
        onClose={() => {}}
      />
    );

    // Cliquer sur le bouton de lecture
    fireEvent.click(screen.getByTestId('system-play-button'));
    expect(handleTogglePlay).toHaveBeenCalledTimes(1);
  });

  it('should call onClose when close button is clicked', () => {
    const handleClose = jest.fn();
    render(
      <MusicPlayerSystem
        track={mockTrack}
        isPlaying={false}
        onTogglePlay={() => {}}
        onClose={handleClose}
      />
    );

    // Cliquer sur le bouton de fermeture
    fireEvent.click(screen.getByTestId('system-close-button'));
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('should display different icons based on isPlaying state', () => {
    const { rerender } = render(
      <MusicPlayerSystem
        track={mockTrack}
        isPlaying={false}
        onTogglePlay={() => {}}
        onClose={() => {}}
      />
    );

    // En état pause, le bouton de lecture est visible
    const playButton = screen.getByTestId('system-play-button');
    expect(playButton).toHaveAttribute('aria-label', 'Lecture');

    // Re-rendre avec isPlaying à true
    rerender(
      <MusicPlayerSystem
        track={mockTrack}
        isPlaying={true}
        onTogglePlay={() => {}}
        onClose={() => {}}
      />
    );

    // En état de lecture, le bouton de pause est visible
    expect(playButton).toHaveAttribute('aria-label', 'Pause');
  });

  it('should not render without a track', () => {
    const { container } = render(
      <MusicPlayerSystem
        track={null}
        isPlaying={false}
        onTogglePlay={() => {}}
        onClose={() => {}}
      />
    );

    // Le composant ne devrait rien rendre sans piste
    expect(container.firstChild).toBeNull();
  });
});
