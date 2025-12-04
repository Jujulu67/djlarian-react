import { render, screen, fireEvent } from '@testing-library/react';
import ErrorModal from '../ErrorModal';

// Mock next/navigation
const mockPush = jest.fn();
const mockBack = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    back: mockBack,
  }),
}));

// Mock Modal
jest.mock('../Modal', () => {
  return function MockModal({ children }: any) {
    return <div data-testid="modal">{children}</div>;
  };
});

// Mock next/image
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: any) => <img {...props} />,
}));

describe('ErrorModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render with default title and message', () => {
    render(<ErrorModal />);

    expect(screen.getByText(/Oops ! Quelque chose s'est mal passé/i)).toBeInTheDocument();
    expect(screen.getByText(/Une erreur inattendue est survenue/i)).toBeInTheDocument();
  });

  it('should render with custom title and message', () => {
    render(<ErrorModal title="Custom Title" message="Custom Message" />);

    expect(screen.getByText('Custom Title')).toBeInTheDocument();
    expect(screen.getByText('Custom Message')).toBeInTheDocument();
  });

  it('should render image when imageUrl is provided', () => {
    render(<ErrorModal imageUrl="/test.jpg" />);

    const image = screen.getByAltText(/Illustration d'erreur/i);
    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute('src', '/test.jpg');
  });

  it('should call router.back when back button is clicked without backHref', () => {
    render(<ErrorModal />);

    const backButton = screen.getByText('Retour');
    fireEvent.click(backButton);

    expect(mockBack).toHaveBeenCalled();
  });

  it('should call router.push with backHref when back button is clicked', () => {
    render(<ErrorModal backHref="/home" />);

    const backButton = screen.getByText('Retour');
    fireEvent.click(backButton);

    expect(mockPush).toHaveBeenCalledWith('/home');
  });

  it('should use custom back button label', () => {
    render(<ErrorModal backButtonLabel="Go Home" />);

    expect(screen.getByText('Go Home')).toBeInTheDocument();
  });
});
