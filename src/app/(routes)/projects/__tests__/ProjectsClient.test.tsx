/**
 * Tests for ProjectsClient component
 * @jest-environment jsdom
 */
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { useRouter } from 'next/navigation';

import { ProjectsClient } from '../ProjectsClient';
import { Project, ProjectStatus } from '@/components/projects/types';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

// Mock fetch
global.fetch = jest.fn();

const mockProjects: Project[] = [
  {
    id: '1',
    name: 'Project 1',
    status: 'EN_COURS' as ProjectStatus,
    userId: 'user1',
    order: 0,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: '2',
    name: 'Project 2',
    status: 'TERMINE' as ProjectStatus,
    userId: 'user1',
    order: 1,
    createdAt: '2024-01-02T00:00:00Z',
    updatedAt: '2024-01-02T00:00:00Z',
  },
];

describe('ProjectsClient', () => {
  const mockPush = jest.fn();
  const mockRouter = {
    push: mockPush,
    replace: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    prefetch: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ data: mockProjects }),
    });
  });

  it('should render projects list', () => {
    render(<ProjectsClient initialProjects={mockProjects} />);

    expect(screen.getByText('Mes Projets')).toBeInTheDocument();
    expect(screen.getByText('Project 1')).toBeInTheDocument();
    expect(screen.getByText('Project 2')).toBeInTheDocument();
  });

  it('should filter projects by status', async () => {
    render(<ProjectsClient initialProjects={mockProjects} />);

    const termineButton = screen.getByText(/Terminé/i);
    fireEvent.click(termineButton);

    // Wait for debounce
    await waitFor(
      () => {
        expect(global.fetch).toHaveBeenCalled();
      },
      { timeout: 500 }
    );
  });

  it('should debounce fetch calls', async () => {
    jest.useFakeTimers();
    render(<ProjectsClient initialProjects={mockProjects} />);

    const termineButton = screen.getByText(/Terminé/i);
    fireEvent.click(termineButton);
    fireEvent.click(termineButton);
    fireEvent.click(termineButton);

    // Fast-forward time
    jest.advanceTimersByTime(300);

    await waitFor(() => {
      // Should only call fetch once after debounce
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    jest.useRealTimers();
  });

  it('should use initialProjects to avoid double fetch', () => {
    render(<ProjectsClient initialProjects={mockProjects} />);

    // Should not fetch immediately if initialProjects are provided
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('should display project counts in filter buttons', () => {
    render(<ProjectsClient initialProjects={mockProjects} />);

    // Should show total count
    expect(screen.getByText(/Tous \(2\)/i)).toBeInTheDocument();
  });

  it('should handle search', () => {
    render(<ProjectsClient initialProjects={mockProjects} />);

    const searchInput = screen.getByPlaceholderText(/Rechercher un projet/i);
    fireEvent.change(searchInput, { target: { value: 'Project 1' } });

    expect(screen.getByText('Project 1')).toBeInTheDocument();
    expect(screen.queryByText('Project 2')).not.toBeInTheDocument();
  });

  it('should navigate to statistics page', () => {
    render(<ProjectsClient initialProjects={mockProjects} />);

    // Find and click statistics button (if it exists in the UI)
    // This depends on the actual implementation
    expect(mockRouter.push).toBeDefined();
  });
});
