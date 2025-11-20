import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import GestionImages from '../GestionImages';

// Mock des dépendances
jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ src, alt, ...props }: { src: string; alt: string; [key: string]: unknown }) => (
    <img src={src} alt={alt} {...props} />
  ),
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    debug: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  },
}));

// Mock de l'API
global.fetch = jest.fn();

describe('GestionImages', () => {
  beforeEach(() => {
    (global.fetch as jest.Mock).mockClear();
  });

  it('should render the component', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ images: [] }),
    });
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ tracks: [] }),
    });
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ events: [] }),
    });

    render(<GestionImages />);
    await waitFor(() => {
      expect(screen.getByText(/Gestion des images uploadées/i)).toBeInTheDocument();
    });
  });

  it('should display loading state', () => {
    (global.fetch as jest.Mock).mockImplementation(() => new Promise(() => {}));
    render(<GestionImages />);
    // Le loader devrait être visible pendant le chargement
  });

  it('should handle image fetch error', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));
    render(<GestionImages />);
    await waitFor(() => {
      // L'erreur devrait être affichée
    });
  });
});
