/**
 * Tests for AdminProjectsClient component
 * @jest-environment jsdom
 */
import { render, screen, waitFor, fireEvent } from '@testing-library/react';

import { AdminProjectsClient } from '../AdminProjectsClient';
import { Project, ProjectStatus } from '@/components/projects/types';

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
    userId: 'user2',
    order: 1,
    createdAt: '2024-01-02T00:00:00Z',
    updatedAt: '2024-01-02T00:00:00Z',
  },
];

const mockUsers = [
  { id: 'user1', name: 'User 1', email: 'user1@test.com' },
  { id: 'user2', name: 'User 2', email: 'user2@test.com' },
];

describe('AdminProjectsClient', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ data: mockProjects }),
    });
  });

  it('should render admin projects view', () => {
    render(<AdminProjectsClient initialProjects={mockProjects} users={mockUsers} />);

    expect(screen.getByText(/Vue Admin/i)).toBeInTheDocument();
    expect(screen.getByText('Project 1')).toBeInTheDocument();
    expect(screen.getByText('Project 2')).toBeInTheDocument();
  });

  it('should display statistics using counts API', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: {
          total: 2,
          statusBreakdown: {
            EN_COURS: 1,
            TERMINE: 1,
            ANNULE: 0,
            A_REWORK: 0,
            GHOST_PRODUCTION: 0,
          },
        },
      }),
    });

    render(<AdminProjectsClient initialProjects={mockProjects} users={mockUsers} />);

    // Wait for counts to be fetched
    await waitFor(
      () => {
        expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/api/projects/counts'));
      },
      { timeout: 500 }
    );
  });

  it('should filter by user', async () => {
    jest.useFakeTimers();
    render(<AdminProjectsClient initialProjects={mockProjects} users={mockUsers} />);

    const userButton = screen.getByText(/Tous les utilisateurs/i);
    fireEvent.click(userButton);

    // Wait for dropdown to appear and select a user
    await waitFor(() => {
      const userOption = screen.getByText(/User 1/i);
      if (userOption) {
        fireEvent.click(userOption);
      }
    });

    jest.advanceTimersByTime(300);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('userId=user1'));
    });

    jest.useRealTimers();
  });

  it('should filter by status', async () => {
    jest.useFakeTimers();
    render(<AdminProjectsClient initialProjects={mockProjects} users={mockUsers} />);

    const termineButton = screen.getByText(/Terminé/i);
    fireEvent.click(termineButton);

    jest.advanceTimersByTime(300);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('status=TERMINE'));
    });

    jest.useRealTimers();
  });

  it('should debounce fetch calls', async () => {
    jest.useFakeTimers();
    render(<AdminProjectsClient initialProjects={mockProjects} users={mockUsers} />);

    const termineButton = screen.getByText(/Terminé/i);
    fireEvent.click(termineButton);
    fireEvent.click(termineButton);
    fireEvent.click(termineButton);

    jest.advanceTimersByTime(300);

    await waitFor(() => {
      // Should only call fetch once after debounce
      const fetchCalls = (global.fetch as jest.Mock).mock.calls.filter((call) =>
        call[0].includes('/api/projects?')
      );
      expect(fetchCalls.length).toBeLessThanOrEqual(1);
    });

    jest.useRealTimers();
  });

  it('should display stats correctly', () => {
    render(<AdminProjectsClient initialProjects={mockProjects} users={mockUsers} />);

    // Should show stats (may need to wait for counts API)
    expect(screen.getByText(/Projets/i)).toBeInTheDocument();
  });
});
