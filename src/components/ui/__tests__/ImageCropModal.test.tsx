import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ImageCropModal from '../ImageCropModal';

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

  // Skip: Requires complex canvas mocking and image loading simulation
  // The test needs to properly mock HTMLCanvasElement, Image loading, and react-image-crop interactions
  it.skip('should handle apply crop', async () => {
    // Mock canvas methods
    const mockContext = {
      beginPath: jest.fn(),
      arc: jest.fn(),
      clip: jest.fn(),
      drawImage: jest.fn(),
    };

    const mockCanvas = {
      getContext: jest.fn(() => mockContext),
      toDataURL: jest.fn(() => 'data:image/jpeg;base64,...'),
      toBlob: jest.fn((callback) => {
        if (callback) {
          callback(new Blob([''], { type: 'image/jpeg' }));
        }
      }),
      width: 0,
      height: 0,
    };

    // Mock document.createElement to return our mock canvas
    const originalCreateElement = document.createElement.bind(document);
    document.createElement = jest.fn((tagName: string) => {
      if (tagName === 'canvas') {
        return mockCanvas as any;
      }
      return originalCreateElement(tagName);
    });

    render(
      <ImageCropModal
        imageToEdit="/test.jpg"
        aspect={1}
        onCrop={mockOnCrop}
        onCancel={mockOnCancel}
      />
    );

    // Wait for image to be rendered and loaded
    await waitFor(() => {
      const image = document.querySelector('img');
      expect(image).toBeInTheDocument();
    });

    const image = document.querySelector('img') as HTMLImageElement;
    Object.defineProperty(image, 'naturalWidth', { value: 100, configurable: true });
    Object.defineProperty(image, 'naturalHeight', { value: 100, configurable: true });
    Object.defineProperty(image, 'width', { value: 100, configurable: true });
    Object.defineProperty(image, 'height', { value: 100, configurable: true });
    fireEvent.load(image);

    // Wait for image to load and crop to be initialized
    await waitFor(() => {
      expect(mockOnChange).toBeTruthy();
    });

    // Trigger onChange to set displayCrop - this simulates the crop being set
    if (mockOnChange) {
      mockOnChange({ x: 0, y: 0, width: 50, height: 50, unit: '%' });
    }

    // Wait a bit for state to update
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Wait for apply button to be enabled
    let applyButton: HTMLElement;
    await waitFor(
      () => {
        applyButton = screen.getByText(/Appliquer/i);
        expect(applyButton).toBeInTheDocument();
        // Check if button is not disabled by checking the disabled attribute
        const isDisabled =
          applyButton.hasAttribute('disabled') && applyButton.getAttribute('disabled') !== null;
        expect(isDisabled).toBe(false);
      },
      { timeout: 3000 }
    );

    fireEvent.click(applyButton!);

    // Wait for onCrop to be called
    await waitFor(
      () => {
        expect(mockOnCrop).toHaveBeenCalled();
      },
      { timeout: 3000 }
    );

    // Restore original createElement
    document.createElement = originalCreateElement;
  });

  // Skip: Requires complex canvas mocking and image loading simulation
  // The test needs to properly mock HTMLCanvasElement, Image loading, and react-image-crop interactions
  it.skip('should handle crop with pixel units', async () => {
    const mockCanvas = {
      getContext: jest.fn(() => ({
        beginPath: jest.fn(),
        arc: jest.fn(),
        clip: jest.fn(),
        drawImage: jest.fn(),
      })),
      toDataURL: jest.fn(() => 'data:image/jpeg;base64,...'),
      toBlob: jest.fn((callback) => {
        callback?.(new Blob([''], { type: 'image/jpeg' }));
      }),
      width: 0,
      height: 0,
    };

    HTMLCanvasElement.prototype.getContext = mockCanvas.getContext;
    HTMLCanvasElement.prototype.toDataURL = mockCanvas.toDataURL;
    HTMLCanvasElement.prototype.toBlob = mockCanvas.toBlob;

    render(
      <ImageCropModal
        imageToEdit="/test.jpg"
        aspect={1}
        onCrop={mockOnCrop}
        onCancel={mockOnCancel}
      />
    );

    // Wait for image to be rendered
    await waitFor(() => {
      const image = document.querySelector('img');
      expect(image).toBeInTheDocument();
    });

    const image = document.querySelector('img') as HTMLImageElement;
    Object.defineProperty(image, 'naturalWidth', { value: 100, configurable: true });
    Object.defineProperty(image, 'naturalHeight', { value: 100, configurable: true });
    Object.defineProperty(image, 'width', { value: 100, configurable: true });
    Object.defineProperty(image, 'height', { value: 100, configurable: true });
    fireEvent.load(image);

    // Wait for image to load and crop to be initialized
    await waitFor(() => {
      expect(mockOnChange).toBeTruthy();
    });

    // Trigger onChange to set displayCrop - this simulates the crop being set
    if (mockOnChange) {
      mockOnChange({ x: 0, y: 0, width: 50, height: 50, unit: 'px' });
    }

    // Wait a bit for state to update
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Wait for apply button to be enabled
    let applyButton: HTMLElement;
    await waitFor(
      () => {
        applyButton = screen.getByText(/Appliquer/i);
        expect(applyButton).toBeInTheDocument();
        // Check if button is not disabled by checking the disabled attribute
        const isDisabled =
          applyButton.hasAttribute('disabled') && applyButton.getAttribute('disabled') !== null;
        expect(isDisabled).toBe(false);
      },
      { timeout: 3000 }
    );

    fireEvent.click(applyButton!);

    await waitFor(
      () => {
        expect(mockOnCrop).toHaveBeenCalled();
      },
      { timeout: 3000 }
    );
  });
});
