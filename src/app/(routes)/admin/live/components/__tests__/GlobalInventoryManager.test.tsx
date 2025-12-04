import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { GlobalInventoryManager } from '../GlobalInventoryManager';
import { searchUsers } from '@/actions/inventory';

// Mock dependencies
jest.mock('@/components/ui/Modal', () => ({ children, onClose }: any) => (
  <div data-testid="modal">
    <button onClick={onClose} aria-label="Close">
      Close
    </button>
    {children}
  </div>
));

jest.mock('../InventoryContent', () => ({
  InventoryContent: ({ userId, userName }: any) => (
    <div data-testid="inventory-content">
      Inventory for {userName} ({userId})
    </div>
  ),
}));

jest.mock('lucide-react', () => ({
  Search: () => <div data-testid="search-icon" />,
  User: () => <div data-testid="user-icon" />,
  Loader2: () => <div data-testid="loader-icon" />,
}));

jest.mock('@/actions/inventory', () => ({
  searchUsers: jest.fn(),
}));

describe('GlobalInventoryManager', () => {
  const mockOnClose = jest.fn();
  const mockUsers = [
    { id: 'user-1', name: 'User One', email: 'user1@example.com', image: null },
    {
      id: 'user-2',
      name: 'User Two',
      email: 'user2@example.com',
      image: 'http://example.com/img.jpg',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (searchUsers as jest.Mock).mockResolvedValue({ success: true, data: mockUsers });
  });

  it('should not render when closed', () => {
    render(<GlobalInventoryManager isOpen={false} onClose={mockOnClose} />);
    expect(screen.queryByTestId('modal')).not.toBeInTheDocument();
  });

  it('should render when open and fetch initial users', async () => {
    render(<GlobalInventoryManager isOpen={true} onClose={mockOnClose} />);

    expect(screen.getByTestId('modal')).toBeInTheDocument();
    expect(screen.getByText('GLOBAL INVENTORY MANAGER')).toBeInTheDocument();

    // Initial search is triggered
    await waitFor(() => {
      expect(searchUsers).toHaveBeenCalledWith('');
    });

    await waitFor(() => {
      expect(screen.getByText('User One')).toBeInTheDocument();
      expect(screen.getByText('User Two')).toBeInTheDocument();
    });
  });

  it('should handle search input', async () => {
    render(<GlobalInventoryManager isOpen={true} onClose={mockOnClose} />);

    const searchInput = screen.getByPlaceholderText('Search users...');
    fireEvent.change(searchInput, { target: { value: 'Two' } });

    // Debounce wait
    await waitFor(
      () => {
        expect(searchUsers).toHaveBeenCalledWith('Two');
      },
      { timeout: 1000 }
    );
  });

  it('should handle user selection', async () => {
    render(<GlobalInventoryManager isOpen={true} onClose={mockOnClose} />);

    await waitFor(() => {
      expect(screen.getByText('User One')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('User One'));

    expect(screen.getByTestId('inventory-content')).toBeInTheDocument();
    expect(screen.getByText('Inventory for User One (user-1)')).toBeInTheDocument();
  });

  it('should handle search error', async () => {
    (searchUsers as jest.Mock).mockRejectedValue(new Error('Search failed'));

    render(<GlobalInventoryManager isOpen={true} onClose={mockOnClose} />);

    await waitFor(() => {
      expect(searchUsers).toHaveBeenCalled();
    });

    // Should handle error gracefully (empty list or error state, component sets users to [] on error/empty)
    expect(screen.queryByText('User One')).not.toBeInTheDocument();
  });

  it('should display no users found message', async () => {
    (searchUsers as jest.Mock).mockResolvedValue({ success: true, data: [] });

    render(<GlobalInventoryManager isOpen={true} onClose={mockOnClose} />);

    await waitFor(() => {
      expect(screen.getByText('No users found')).toBeInTheDocument();
    });
  });
});
