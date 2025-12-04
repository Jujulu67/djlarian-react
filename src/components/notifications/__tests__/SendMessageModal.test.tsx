import { render, screen } from '@testing-library/react';
import { SendMessageModal } from '../SendMessageModal';

// Mock next-auth/react
jest.mock('next-auth/react', () => ({
  useSession: () => ({
    data: { user: { role: 'ADMIN' } },
  }),
}));

// Mock hooks
jest.mock('@/hooks/useFriends', () => ({
  useFriends: () => ({
    friends: [],
  }),
}));

// Mock fetch
global.fetch = jest.fn();

describe('SendMessageModal', () => {
  const mockOnClose = jest.fn();
  const mockOnSuccess = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ users: [] }),
    });
  });

  it('should not render when closed', () => {
    const { container } = render(<SendMessageModal isOpen={false} onClose={mockOnClose} />);
    expect(container.firstChild).toBeNull();
  });

  it('should render when open', () => {
    render(<SendMessageModal isOpen={true} onClose={mockOnClose} />);
    // Check for the title which is more specific
    expect(screen.getByText(/Envoyer un message/i)).toBeInTheDocument();
  });

  it('should load users when opened', () => {
    render(<SendMessageModal isOpen={true} onClose={mockOnClose} />);
    expect(global.fetch).toHaveBeenCalled();
  });
});
