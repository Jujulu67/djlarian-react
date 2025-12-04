import { render, screen } from '@testing-library/react';
import AuthModal from '../AuthModal';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

// Mock next-auth/react
jest.mock('next-auth/react', () => ({
  signIn: jest.fn(),
}));

// Mock Modal
jest.mock('@/components/ui/Modal', () => {
  return function MockModal({ children }: any) {
    return <div data-testid="modal">{children}</div>;
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
});
