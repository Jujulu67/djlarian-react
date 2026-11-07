import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ImageCropModal, { getCropCanvasSize } from '../ImageCropModal';

// Mock react-image-crop
let mockOnChange: ((crop: any) => void) | null = null;
jest.mock('react-image-crop', () => ({
  __esModule: true,
  default: ({ children, onChange, crop, aspect }: any) => {
    mockOnChange = onChange;
    return (
      <div data-testid="react-crop">
        {children}
        <button onClick={() => onChange?.({ x: 0, y: 0, width: 50, height: 50, unit: '%' })}>
          Complete Crop
        </button>
      </div>
    );
  },
  centerCrop: jest.fn((crop) => crop),
  makeAspectCrop: jest.fn((crop, aspect) => crop),
}));

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

describe('ImageCropModal', () => {
  const mockOnCrop = jest.fn();
  const mockOnCancel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockOnChange = null;
    // Mock canvas
    HTMLCanvasElement.prototype.toBlob = jest.fn((callback) => {
      callback?.(new Blob([''], { type: 'image/png' }));
    });
  });

  it('should not render when imageToEdit is null', () => {
    const { container } = render(
      <ImageCropModal imageToEdit={null} aspect={1} onCrop={mockOnCrop} onCancel={mockOnCancel} />
    );

    expect(container.firstChild).toBeNull();
  });

  it('should render when imageToEdit is provided', () => {
    render(
      <ImageCropModal
        imageToEdit="/test.jpg"
        aspect={1}
        onCrop={mockOnCrop}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByTestId('modal')).toBeInTheDocument();
  });

  it('should call onCancel when cancel button is clicked', () => {
    render(
      <ImageCropModal
        imageToEdit="/test.jpg"
        aspect={1}
        onCrop={mockOnCrop}
        onCancel={mockOnCancel}
      />
    );

    const cancelButton = screen.getByText(/Annuler/i);
    fireEvent.click(cancelButton);

    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('should display custom title when provided', () => {
    render(
      <ImageCropModal
        imageToEdit="/test.jpg"
        aspect={1}
        onCrop={mockOnCrop}
        onCancel={mockOnCancel}
        title="Custom Title"
      />
    );

    expect(screen.getByText('Custom Title')).toBeInTheDocument();
  });

  it('should handle image load', async () => {
    render(
      <ImageCropModal
        imageToEdit="/test.jpg"
        aspect={1}
        onCrop={mockOnCrop}
        onCancel={mockOnCancel}
      />
    );

    // Wait for image to be rendered - check for any image element
    await waitFor(() => {
      const image = document.querySelector('img');
      expect(image).toBeInTheDocument();
    });

    const image = document.querySelector('img') as HTMLImageElement;
    expect(image).toBeInTheDocument();

    // Simulate image load
    Object.defineProperty(image, 'naturalWidth', { value: 100, configurable: true });
    Object.defineProperty(image, 'naturalHeight', { value: 100, configurable: true });

    fireEvent.load(image);

    await waitFor(() => {
      expect(screen.getByTestId('react-crop')).toBeInTheDocument();
    });
  });

  it('should handle circular crop', () => {
    render(
      <ImageCropModal
        imageToEdit="/test.jpg"
        aspect={1}
        circular={true}
        onCrop={mockOnCrop}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByText(/rond/i)).toBeInTheDocument();
  });

  it('should handle 16:9 aspect ratio', () => {
    render(
      <ImageCropModal
        imageToEdit="/test.jpg"
        aspect={16 / 9}
        onCrop={mockOnCrop}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByText(/16:9/i)).toBeInTheDocument();
  });
});

describe('getCropCanvasSize', () => {
  it('garde le format 16:9 de la zone découpée (pas de toile carrée)', () => {
    expect(getCropCanvasSize(1024, 576)).toEqual({ width: 1024, height: 576 });
  });

  it('impose le format demandé malgré les arrondis', () => {
    expect(getCropCanvasSize(1024, 1023, { aspect: 1 })).toEqual({ width: 1024, height: 1024 });
    expect(getCropCanvasSize(1280, 721.4, { aspect: 16 / 9 })).toEqual({
      width: 1280,
      height: 720,
    });
  });

  it('arrondit les dimensions en pixels', () => {
    expect(getCropCanvasSize(1023.6, 575.8)).toEqual({ width: 1024, height: 576 });
  });

  it('prend le plus petit côté pour un recadrage rond', () => {
    expect(getCropCanvasSize(800, 600, { circular: true })).toEqual({ width: 600, height: 600 });
  });
});
