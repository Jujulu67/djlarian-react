import { render, screen } from '@testing-library/react';
import AddUserForm from '../AddUserForm';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

// Mock next-auth/react
jest.mock('next-auth/react', () => ({
  useSession: () => ({
    data: { user: { role: 'ADMIN' } },
    update: jest.fn(),
  }),
}));

// Mock logger
jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
  },
}));

// Mock fetch
global.fetch = jest.fn();

describe('AddUserForm', () => {
  const mockOnSuccess = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });
  });

  it('should render form', () => {
    render(<AddUserForm onSuccess={mockOnSuccess} />);
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/nom/i)).toBeInTheDocument();
  });

  it('should pre-fill form in edit mode', () => {
    const userToEdit = {
      id: 'user-1',
      email: 'test@example.com',
      name: 'Test User',
      role: 'ADMIN',
      isVip: false,
    };

    render(<AddUserForm onSuccess={mockOnSuccess} userToEdit={userToEdit} />);
    expect(screen.getByDisplayValue('test@example.com')).toBeInTheDocument();
  });

  it('should have submit button', () => {
    render(<AddUserForm onSuccess={mockOnSuccess} />);
    // The button text might be "Créer l'Utilisateur" or "Modifier l'Utilisateur"
    const button = screen.getByRole('button', { name: /créer|modifier|utilisateur/i });
    expect(button).toBeInTheDocument();
  });
});
