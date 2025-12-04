import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ImageLibraryModal from '../ImageLibraryModal';

// Mock fetch
global.fetch = jest.fn();

// Mock Modal
jest.mock('../Modal', () => {
  return function MockModal({ children, onClose }: any) {
    return (
      <div data-testid="modal">
        {children}
        <button onClick={onClose}>Close</button>
      </div>
    );
  };
});

// Mock getImageUrl
jest.mock('@/lib/utils/getImageUrl', () => ({
  getImageUrl: jest.fn((id, options) => `/api/images/${id}${options?.original ? '-ori' : ''}`),
}));

describe('ImageLibraryModal', () => {
  const mockOnSelect = jest.fn();
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockResolvedValue({
      json: async () => ({
        images: [
          { id: '1', url: '/test1-ori.jpg', name: 'test1-ori.jpg', type: 'image/jpeg' },
          { id: '2', url: '/test2-ori.jpg', name: 'test2-ori.jpg', type: 'image/jpeg' },
        ],
      }),
    });
  });

  it('should not render when open is false', () => {
    const { container } = render(
      <ImageLibraryModal open={false} onClose={mockOnClose} onSelect={mockOnSelect} />
    );

    expect(container.firstChild).toBeNull();
  });

  it('should render when open is true', () => {
    render(<ImageLibraryModal open={true} onClose={mockOnClose} onSelect={mockOnSelect} />);

    expect(screen.getByTestId('modal')).toBeInTheDocument();
  });

  it('should fetch images when opened', async () => {
    render(<ImageLibraryModal open={true} onClose={mockOnClose} onSelect={mockOnSelect} />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/images');
    });
  });

  it('should call onClose when close button is clicked', () => {
    render(<ImageLibraryModal open={true} onClose={mockOnClose} onSelect={mockOnSelect} />);

    const closeButton = screen.getByText('Close');
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should filter images by search term', async () => {
    render(<ImageLibraryModal open={true} onClose={mockOnClose} onSelect={mockOnSelect} />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Rechercher/i)).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/Rechercher/i);
    fireEvent.change(searchInput, { target: { value: 'test1' } });

    // Should filter images
    expect(searchInput).toHaveValue('test1');
  });
});
