import { render, screen } from '@testing-library/react';
import ScorePanel from '../ScorePanel';
import type { Player } from '../gameEngine';

describe('ScorePanel', () => {
  const mockPlayer: Player = {
    position: { x: 100, y: 200 },
    radius: 10,
    score: 1000,
    combo: 5,
    highScore: 2000,
    perfectHits: 10,
    goodHits: 5,
    okHits: 3,
    missHits: 2,
    missedPatterns: 1,
    totalNotes: 21,
  };

  it('should render score panel', () => {
    render(<ScorePanel player={mockPlayer} isActive={true} />);
    // Score might be formatted or animated, so check for score-related content
    expect(screen.getByText(/1000|1\.0K/i)).toBeInTheDocument();
  });

  it('should display combo when greater than 1', () => {
    render(<ScorePanel player={mockPlayer} isActive={true} />);
    expect(screen.getByText(/combo/i)).toBeInTheDocument();
  });

  it('should display high score', () => {
    render(<ScorePanel player={mockPlayer} isActive={true} />);
    expect(screen.getByText(/meilleur/i)).toBeInTheDocument();
  });

  it('should display stats when active', () => {
    render(<ScorePanel player={mockPlayer} isActive={true} />);
    expect(screen.getByText(/parfait/i)).toBeInTheDocument();
    expect(screen.getByText(/bon/i)).toBeInTheDocument();
  });

  it('should format large scores with K', () => {
    const playerWithLargeScore = { ...mockPlayer, score: 5000 };
    render(<ScorePanel player={playerWithLargeScore} isActive={true} />);
    expect(screen.getByText(/5\.0K/i)).toBeInTheDocument();
  });

  it('should format very large scores with M', () => {
    const playerWithVeryLargeScore = { ...mockPlayer, score: 2000000 };
    render(<ScorePanel player={playerWithVeryLargeScore} isActive={true} />);
    expect(screen.getByText(/2\.0M/i)).toBeInTheDocument();
  });

  it('should calculate and display rank', () => {
    render(<ScorePanel player={mockPlayer} isActive={true} />);
    expect(screen.getByText(/rang/i)).toBeInTheDocument();
  });
});
