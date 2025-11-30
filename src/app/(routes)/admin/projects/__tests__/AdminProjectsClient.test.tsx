/**
 * Tests for AdminProjectsClient component
 * @jest-environment jsdom
 */

// Mock next-auth/react before imports
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(() => ({
    data: { user: { role: 'ADMIN' } },
    status: 'authenticated',
  })),
}));

import { render, screen, waitFor, fireEvent, act, findByText } from '@testing-library/react';

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

  it('should render admin projects view', async () => {
    await act(async () => {
      render(<AdminProjectsClient initialProjects={mockProjects} users={mockUsers} />);
    });

    // Il y a plusieurs éléments avec "Vue Admin", utiliser getAllByText
    const vueAdminElements = screen.getAllByText(/Vue Admin/i);
    expect(vueAdminElements.length).toBeGreaterThan(0);
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

    await act(async () => {
      render(<AdminProjectsClient initialProjects={mockProjects} users={mockUsers} />);
    });

    // Wait for counts to be fetched
    await waitFor(
      () => {
        const fetchCalls = (global.fetch as jest.Mock).mock.calls;
        const hasCountsCall = fetchCalls.some(
          (call) => call[0] && String(call[0]).includes('/api/projects/counts')
        );
        expect(hasCountsCall).toBe(true);
      },
      { timeout: 500 }
    );
  });

  it('should filter by user', async () => {
    render(<AdminProjectsClient initialProjects={mockProjects} users={mockUsers} />);

    // Attendre que le composant soit complètement rendu
    const userButton = await screen.findByText(/Tous les utilisateurs/i, {}, { timeout: 3000 });

    await act(async () => {
      fireEvent.click(userButton);
    });

    // Wait for dropdown to appear and select a user
    const userOption = await screen.findByText(/User 1/i, {}, { timeout: 3000 });

    await act(async () => {
      fireEvent.click(userOption);
    });

    // Attendre le debounce et la requête
    await waitFor(
      () => {
        const fetchCalls = (global.fetch as jest.Mock).mock.calls;
        const hasUserFilter = fetchCalls.some(
          (call) => call[0] && String(call[0]).includes('userId=user1')
        );
        expect(hasUserFilter).toBe(true);
      },
      { timeout: 2000 }
    );
  });

  it('should filter by status', async () => {
    render(<AdminProjectsClient initialProjects={mockProjects} users={mockUsers} />);

    // Attendre que le composant soit complètement rendu, puis trouver le bouton (pas le texte dans les stats)
    await waitFor(
      () => {
        const buttons = screen.getAllByText(/Terminé/i);
        const termineButton = buttons.find((btn) => btn.tagName === 'BUTTON');
        expect(termineButton).toBeDefined();
      },
      { timeout: 3000 }
    );

    const buttons = screen.getAllByText(/Terminé/i);
    const termineButton = buttons.find((btn) => btn.tagName === 'BUTTON');

    await act(async () => {
      fireEvent.click(termineButton!);
    });

    // Attendre le debounce
    await waitFor(
      () => {
        const fetchCalls = (global.fetch as jest.Mock).mock.calls;
        const hasStatusFilter = fetchCalls.some(
          (call) => call[0] && String(call[0]).includes('status=TERMINE')
        );
        expect(hasStatusFilter).toBe(true);
      },
      { timeout: 2000 }
    );
  });

  it('should debounce fetch calls', async () => {
    render(<AdminProjectsClient initialProjects={mockProjects} users={mockUsers} />);

    // Attendre que le composant soit complètement rendu, puis trouver le bouton
    await waitFor(
      () => {
        const buttons = screen.getAllByText(/Terminé/i);
        const termineButton = buttons.find((btn) => btn.tagName === 'BUTTON');
        expect(termineButton).toBeDefined();
      },
      { timeout: 3000 }
    );

    const buttons = screen.getAllByText(/Terminé/i);
    const termineButton = buttons.find((btn) => btn.tagName === 'BUTTON')!;

    // Cliquer plusieurs fois rapidement
    await act(async () => {
      fireEvent.click(termineButton);
      fireEvent.click(termineButton);
      fireEvent.click(termineButton);
    });

    // Attendre le debounce (300ms)
    await new Promise((resolve) => setTimeout(resolve, 350));

    await waitFor(
      () => {
        // Should only call fetch once after debounce
        const fetchCalls = (global.fetch as jest.Mock).mock.calls.filter(
          (call) => call[0] && String(call[0]).includes('/api/projects?')
        );
        expect(fetchCalls.length).toBeLessThanOrEqual(1);
      },
      { timeout: 2000 }
    );
  });

  it('should display stats correctly', async () => {
    render(<AdminProjectsClient initialProjects={mockProjects} users={mockUsers} />);

    // Attendre que les stats soient affichées (il y a plusieurs éléments avec "Projets")
    await waitFor(
      () => {
        const projetsElements = screen.getAllByText(/Projets/i);
        expect(projetsElements.length).toBeGreaterThan(0);
      },
      { timeout: 3000 }
    );
  });
});
