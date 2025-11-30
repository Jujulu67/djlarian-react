/**
 * Tests unitaires pour ProfilePage
 * @jest-environment jsdom
 */

// Mock next-auth/react before imports
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
  signIn: jest.fn(),
}));

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(),
}));

// Mock react-hot-toast
jest.mock('react-hot-toast', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock fetchWithAuth
jest.mock('@/lib/api/fetchWithAuth', () => ({
  fetchWithAuth: jest.fn(),
}));

// Mock ImageCropModal
jest.mock('@/components/ui/ImageCropModal', () => ({
  __esModule: true,
  default: ({ imageToEdit, onCrop, onCancel }: any) => {
    if (!imageToEdit) return null;
    return (
      <div data-testid="image-crop-modal">
        <button
          onClick={() => onCrop(new File([''], 'test.jpg', { type: 'image/jpeg' }), 'preview-url')}
        >
          Crop
        </button>
        <button onClick={onCancel}>Cancel</button>
      </div>
    );
  },
}));

import { render, screen, waitFor } from '@testing-library/react';
import { useSession, signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { fetchWithAuth } from '@/lib/api/fetchWithAuth';
import ProfilePage from '../page';

const mockUseSession = useSession as jest.MockedFunction<typeof useSession>;
const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;
const mockUseSearchParams = useSearchParams as jest.MockedFunction<typeof useSearchParams>;
const mockFetchWithAuth = fetchWithAuth as jest.MockedFunction<typeof fetchWithAuth>;
const mockSignIn = signIn as jest.MockedFunction<typeof signIn>;

describe('ProfilePage', () => {
  const mockPush = jest.fn();
  const mockReplace = jest.fn();
  const mockRefresh = jest.fn();
  const mockUpdate = jest.fn();

  const mockRouter = {
    push: mockPush,
    replace: mockReplace,
    back: jest.fn(),
    forward: jest.fn(),
    refresh: mockRefresh,
    prefetch: jest.fn(),
  };

  const mockSearchParams = new URLSearchParams();

  beforeEach(() => {
    jest.clearAllMocks();
    (mockUseRouter as jest.Mock).mockReturnValue(mockRouter);
    (mockUseSearchParams as jest.Mock).mockReturnValue(mockSearchParams);
    (mockFetchWithAuth as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ data: [] }),
    });
  });

  describe('Rendu sans session', () => {
    it("devrait afficher un message d'accès non autorisé quand l'utilisateur n'est pas connecté", () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'unauthenticated',
        update: mockUpdate,
      });

      render(<ProfilePage />);

      expect(screen.getByText('Accès non autorisé')).toBeInTheDocument();
      expect(
        screen.getByText(/Veuillez vous connecter pour accéder à votre profil/i)
      ).toBeInTheDocument();
    });

    it("devrait afficher un message d'accès non autorisé quand la session est en chargement", () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'loading',
        update: mockUpdate,
      });

      render(<ProfilePage />);

      expect(screen.getByText('Accès non autorisé')).toBeInTheDocument();
    });
  });

  describe('Rendu avec session', () => {
    const mockUser = {
      id: 'user1',
      name: 'Test User',
      email: 'test@example.com',
      image: null,
      role: 'USER' as const,
      createdAt: new Date('2024-01-01').toISOString(),
    };

    beforeEach(() => {
      mockUseSession.mockReturnValue({
        data: {
          user: mockUser,
        },
        status: 'authenticated',
        update: mockUpdate,
      });
    });

    it("devrait afficher les informations de l'utilisateur", async () => {
      (mockFetchWithAuth as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            total: 5,
            statusBreakdown: {
              EN_COURS: 2,
              TERMINE: 3,
            },
          },
        }),
      });

      render(<ProfilePage />);

      await waitFor(() => {
        expect(screen.getByText('Test User')).toBeInTheDocument();
      });

      expect(screen.getByText('test@example.com')).toBeInTheDocument();
    });

    it('devrait afficher les statistiques utilisateur', async () => {
      (mockFetchWithAuth as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            total: 5,
            statusBreakdown: {
              EN_COURS: 2,
              TERMINE: 3,
            },
          },
        }),
      });

      render(<ProfilePage />);

      await waitFor(() => {
        expect(screen.getByText('5')).toBeInTheDocument(); // Total projets
      });

      expect(screen.getByText('2')).toBeInTheDocument(); // En cours
      expect(screen.getByText('3')).toBeInTheDocument(); // Terminés
    });

    it("devrait afficher le bouton d'édition", async () => {
      (mockFetchWithAuth as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            total: 0,
            statusBreakdown: {},
          },
        }),
      });

      render(<ProfilePage />);

      await waitFor(() => {
        const editButton = screen.getByLabelText('Modifier le profil');
        expect(editButton).toBeInTheDocument();
      });
    });

    it('devrait charger les statistiques au montage', async () => {
      (mockFetchWithAuth as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            total: 10,
            statusBreakdown: {
              EN_COURS: 5,
              TERMINE: 5,
            },
          },
        }),
      });

      render(<ProfilePage />);

      await waitFor(() => {
        expect(mockFetchWithAuth).toHaveBeenCalledWith('/api/projects/counts');
      });
    });
  });

  describe('Affichage des sections', () => {
    const mockUser = {
      id: 'user1',
      name: 'Test User',
      email: 'test@example.com',
      image: null,
      role: 'USER' as const,
      createdAt: new Date('2024-01-01').toISOString(),
    };

    beforeEach(() => {
      mockUseSession.mockReturnValue({
        data: {
          user: mockUser,
        },
        status: 'authenticated',
        update: mockUpdate,
      });
    });

    it('devrait afficher la section badges', async () => {
      (mockFetchWithAuth as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            total: 0,
            statusBreakdown: {},
          },
        }),
      });

      render(<ProfilePage />);

      await waitFor(() => {
        expect(screen.getByText('Badges')).toBeInTheDocument();
      });
    });

    it('devrait afficher la section comptes connectés', async () => {
      (mockFetchWithAuth as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: {
              total: 0,
              statusBreakdown: {},
            },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            accounts: {
              google: { linked: false, available: true, accountId: null },
              twitch: { linked: false, available: true, accountId: null },
            },
            security: {
              hasPassword: false,
              oauthCount: 0,
              canUnlink: false,
              isSecure: false,
            },
          }),
        });

      render(<ProfilePage />);

      await waitFor(() => {
        expect(screen.getByText('Comptes connectés')).toBeInTheDocument();
      });
    });
  });
});
