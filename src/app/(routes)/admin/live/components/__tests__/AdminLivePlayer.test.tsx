import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AdminLivePlayer } from '../AdminLivePlayer';
import { useAdminLivePlayerContext } from '../../context/AdminLivePlayerContext';
import { getImageUrl } from '@/lib/utils/getImageUrl';

// Mock dependencies
jest.mock('../../context/AdminLivePlayerContext', () => ({
  useAdminLivePlayerContext: jest.fn(),
}));

jest.mock('@/lib/utils/getImageUrl', () => ({
  getImageUrl: jest.fn((id) => `http://example.com/${id}`),
}));

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, ...props }: any) => (
      <div className={className} {...props}>
        {children}
      </div>
    ),
  },
}));

// Mock lucide-react
jest.mock('lucide-react', () => ({
  Play: () => <div data-testid="play-icon">Play</div>,
  Pause: () => <div data-testid="pause-icon">Pause</div>,
  Volume2: () => <div data-testid="volume-icon">Volume</div>,
  VolumeX: () => <div data-testid="mute-icon">Mute</div>,
  Download: () => <div data-testid="download-icon">Download</div>,
  X: () => <div data-testid="close-icon">Close</div>,
  RotateCcw: () => <div data-testid="reset-icon">Reset</div>,
  Gauge: () => <div data-testid="gauge-icon">Gauge</div>,
  User: () => <div data-testid="user-icon">User</div>,
}));

// Mock URL.createObjectURL and revokeObjectURL
global.URL.createObjectURL = jest.fn(() => 'blob:http://example.com/blob');
global.URL.revokeObjectURL = jest.fn();

describe('AdminLivePlayer', () => {
  const mockContext = {
    selectedSubmission: null,
    audioAnalysis: null,
    isPlaying: false,
    currentTime: 0,
    duration: 100,
    volume: 0.5,
    playbackRate: 1,
    audioRef: { current: { currentTime: 0, play: jest.fn(), pause: jest.fn() } },
    handlePlayPause: jest.fn(),
    handleSeek: jest.fn(),
    handleVolumeChange: jest.fn(),
    handleVolumeToggle: jest.fn(),
    handlePlaybackRateToggle: jest.fn(),
    handleClose: jest.fn(),
    formatDuration: jest.fn((time) => `${time}s`),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useAdminLivePlayerContext as jest.Mock).mockReturnValue(mockContext);
  });

  it('should render select submission message when no submission is selected', () => {
    render(<AdminLivePlayer />);
    expect(
      screen.getByText("Sélectionnez une soumission pour afficher l'audio")
    ).toBeInTheDocument();
  });

  it('should render loading state when submission is selected but no audio analysis', () => {
    (useAdminLivePlayerContext as jest.Mock).mockReturnValue({
      ...mockContext,
      selectedSubmission: {
        id: '1',
        title: 'Test Submission',
        fileUrl: 'http://example.com/audio.mp3',
        fileName: 'audio.mp3',
        User: { name: 'Test User', image: 'image-1' },
      },
    });
    render(<AdminLivePlayer />);
    expect(screen.getByText("Chargement de l'audio...")).toBeInTheDocument();
  });

  it('should render player when submission and audio analysis are present', () => {
    (useAdminLivePlayerContext as jest.Mock).mockReturnValue({
      ...mockContext,
      selectedSubmission: {
        id: '1',
        title: 'Test Submission',
        fileUrl: 'http://example.com/audio.mp3',
        fileName: 'audio.mp3',
        User: { name: 'Test User', image: 'image-1' },
      },
      audioAnalysis: {
        duration: 100,
        waveform: [10, 20, 30, 40, 50],
      },
    });
    render(<AdminLivePlayer />);
    expect(screen.getByText('Test Submission')).toBeInTheDocument();
    expect(screen.getByText('Test User • audio.mp3')).toBeInTheDocument();
  });

  it('should handle play/pause', () => {
    (useAdminLivePlayerContext as jest.Mock).mockReturnValue({
      ...mockContext,
      selectedSubmission: {
        id: '1',
        title: 'Test Submission',
        fileUrl: 'http://example.com/audio.mp3',
        fileName: 'audio.mp3',
        User: { name: 'Test User', image: 'image-1' },
      },
      audioAnalysis: {
        duration: 100,
        waveform: [10, 20, 30, 40, 50],
      },
    });
    render(<AdminLivePlayer />);

    const playButton = screen.getByTestId('play-icon').closest('button');
    if (playButton) {
      fireEvent.click(playButton);
      expect(mockContext.handlePlayPause).toHaveBeenCalled();
    } else {
      throw new Error('Play button not found');
    }
  });

  it('should handle volume toggle', () => {
    (useAdminLivePlayerContext as jest.Mock).mockReturnValue({
      ...mockContext,
      selectedSubmission: {
        id: '1',
        title: 'Test Submission',
        fileUrl: 'http://example.com/audio.mp3',
        fileName: 'audio.mp3',
        User: { name: 'Test User', image: 'image-1' },
      },
      audioAnalysis: {
        duration: 100,
        waveform: [10, 20, 30, 40, 50],
      },
    });
    render(<AdminLivePlayer />);

    const muteButton = screen.getByTitle('Mute');
    fireEvent.click(muteButton);
    expect(mockContext.handleVolumeToggle).toHaveBeenCalled();
  });

  it('should handle playback rate toggle', () => {
    (useAdminLivePlayerContext as jest.Mock).mockReturnValue({
      ...mockContext,
      selectedSubmission: {
        id: '1',
        title: 'Test Submission',
        fileUrl: 'http://example.com/audio.mp3',
        fileName: 'audio.mp3',
        User: { name: 'Test User', image: 'image-1' },
      },
      audioAnalysis: {
        duration: 100,
        waveform: [10, 20, 30, 40, 50],
      },
    });
    render(<AdminLivePlayer />);

    const rateButton = screen.getByTitle('Change playback speed');
    fireEvent.click(rateButton);
    expect(mockContext.handlePlaybackRateToggle).toHaveBeenCalled();
  });

  it('should handle close', () => {
    (useAdminLivePlayerContext as jest.Mock).mockReturnValue({
      ...mockContext,
      selectedSubmission: {
        id: '1',
        title: 'Test Submission',
        fileUrl: 'http://example.com/audio.mp3',
        fileName: 'audio.mp3',
        User: { name: 'Test User', image: 'image-1' },
      },
      audioAnalysis: {
        duration: 100,
        waveform: [10, 20, 30, 40, 50],
      },
    });
    render(<AdminLivePlayer />);

    const closeButton = screen.getByTestId('close-icon').closest('button');
    if (closeButton) {
      fireEvent.click(closeButton);
      expect(mockContext.handleClose).toHaveBeenCalled();
    } else {
      throw new Error('Close button not found');
    }
  });

  it('should handle reset', () => {
    (useAdminLivePlayerContext as jest.Mock).mockReturnValue({
      ...mockContext,
      selectedSubmission: {
        id: '1',
        title: 'Test Submission',
        fileUrl: 'http://example.com/audio.mp3',
        fileName: 'audio.mp3',
        User: { name: 'Test User', image: 'image-1' },
      },
      audioAnalysis: {
        duration: 100,
        waveform: [10, 20, 30, 40, 50],
      },
    });
    render(<AdminLivePlayer />);

    const resetButton = screen.getByTitle('Reset');
    fireEvent.click(resetButton);
    expect(mockContext.handleSeek).toHaveBeenCalledWith(0);
  });
});
