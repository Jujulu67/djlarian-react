import { render, screen, fireEvent } from '@testing-library/react';
import ImageDropzone from '../ImageDropzone';

// Mock ImageLibraryModal
jest.mock('../ImageLibraryModal', () => {
  return function MockImageLibraryModal({ onSelect, open }: any) {
    if (!open) return null;
    return (
      <div data-testid="image-library-modal">
        <button onClick={() => onSelect({ id: '1', url: '/test.jpg', name: 'test.jpg' })}>
          Select Image
        </button>
      </div>
    );
  };
});

// Mock next/image
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: any) => <img {...props} />,
}));

describe('ImageDropzone', () => {
  const mockOnDrop = jest.fn();
  const mockOnRecrop = jest.fn();
  const mockOnRemove = jest.fn();
  const mockOnFileSelected = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render with label', () => {
    render(
      <ImageDropzone
        label="Test Label"
        onDrop={mockOnDrop}
        onRecrop={mockOnRecrop}
        onRemove={mockOnRemove}
      />
    );

    expect(screen.getByText('Test Label')).toBeInTheDocument();
  });

  it('should render placeholder text', () => {
    render(
      <ImageDropzone
        label="Test Label"
        onDrop={mockOnDrop}
        onRecrop={mockOnRecrop}
        onRemove={mockOnRemove}
        placeholderText="Custom placeholder"
      />
    );

    expect(screen.getByText('Custom placeholder')).toBeInTheDocument();
  });

  it('should render help text', () => {
    render(
      <ImageDropzone
        label="Test Label"
        onDrop={mockOnDrop}
        onRecrop={mockOnRecrop}
        onRemove={mockOnRemove}
        helpText="Custom help"
      />
    );

    expect(screen.getByText('Custom help')).toBeInTheDocument();
  });

  it('should display image when imageUrl is provided', () => {
    render(
      <ImageDropzone
        label="Test Label"
        imageUrl="/test.jpg"
        onDrop={mockOnDrop}
        onRecrop={mockOnRecrop}
        onRemove={mockOnRemove}
      />
    );

    const image = screen.getByAltText('Cover preview');
    expect(image).toBeInTheDocument();
  });

  it('should call onRemove when remove button is clicked', () => {
    render(
      <ImageDropzone
        label="Test Label"
        imageUrl="/test.jpg"
        onDrop={mockOnDrop}
        onRecrop={mockOnRecrop}
        onRemove={mockOnRemove}
      />
    );

    const removeButton = screen.getByRole('button', { name: /supprimer/i });
    fireEvent.click(removeButton);

    expect(mockOnRemove).toHaveBeenCalled();
  });

  it('should open library modal when library button is clicked', () => {
    render(
      <ImageDropzone
        label="Test Label"
        onDrop={mockOnDrop}
        onRecrop={mockOnRecrop}
        onRemove={mockOnRemove}
      />
    );

    const libraryButton = screen.getByText(/Importer depuis la bibliothèque/i);
    fireEvent.click(libraryButton);

    expect(screen.getByTestId('image-library-modal')).toBeInTheDocument();
  });
});
