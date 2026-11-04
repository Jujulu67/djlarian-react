import { fireEvent, render, screen } from '@testing-library/react';
import AuthModal from '../AuthModal';

const mockRouterBack = jest.fn();

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    back: mockRouterBack,
  }),
}));

// Mock next-auth/react
jest.mock('next-auth/react', () => ({
  signIn: jest.fn(),
}));

// Mock Modal
jest.mock('@/components/ui/Modal', () => {
  return function MockModal({ children, onClose }: any) {
    return (
      <div data-testid="modal">
        <button aria-label="Fermer la modale" onClick={onClose ?? mockRouterBack} />
        {children}
      </div>
    );
  };
});

// Mock logger
jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
  },
}));

// Mock fetch
global.fetch = jest.fn();

describe('AuthModal', () => {
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ google: true, twitch: true }),
    });
  });

  it('should not render when closed', () => {
    render(<AuthModal isOpen={false} onClose={mockOnClose} />);
    expect(screen.queryByTestId('modal')).not.toBeInTheDocument();
  });

  it('should render when open', () => {
    render(<AuthModal isOpen={true} onClose={mockOnClose} />);
    expect(screen.getByTestId('modal')).toBeInTheDocument();
  });

  it('should fetch providers on mount', async () => {
    render(<AuthModal isOpen={true} onClose={mockOnClose} />);
    expect(global.fetch).toHaveBeenCalledWith('/api/auth/providers');
  });

  it('la croix ferme la modale sans revenir à la page précédente', () => {
    render(<AuthModal isOpen={true} onClose={mockOnClose} />);
    fireEvent.click(screen.getByLabelText('Fermer la modale'));
    expect(mockOnClose).toHaveBeenCalledTimes(1);
    expect(mockRouterBack).not.toHaveBeenCalled();
  });
});
