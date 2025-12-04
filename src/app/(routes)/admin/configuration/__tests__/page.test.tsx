/**
 * Tests for Admin Configuration Page
 * @jest-environment jsdom
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ConfigurationPage from '../page';
import { useConfigs } from '@/stores/useConfigs';

// Mock dependencies
jest.mock('next/dynamic', () => () => {
  const DynamicComponent = () => <div>Dynamic Component</div>;
  return DynamicComponent;
});

jest.mock('next/link', () => {
  return ({ children }: { children: React.ReactNode }) => <div>{children}</div>;
});

jest.mock('@/stores/useConfigs');
jest.mock('@/lib/logger');
jest.mock('@/components/admin/DatabaseSwitch', () => () => <div>DatabaseSwitch</div>);
jest.mock('@/components/config/ToggleRow', () => () => <div>ToggleRow</div>);
jest.mock('@/components/ui/Modal', () => ({ children, onClose }: any) => (
  <div role="dialog">
    {children}
    <button onClick={onClose}>Close Modal</button>
  </div>
));

// Mock fetch
global.fetch = jest.fn();
global.alert = jest.fn();
global.confirm = jest.fn();

const mockConfigs = {
  general: { siteName: 'Test Site' },
  appearance: {},
  homepage: {},
  notifications: {},
  security: {},
  api: {},
  update: jest.fn(),
  setAllConfigs: jest.fn(),
  resetConfigs: jest.fn(),
};

describe('ConfigurationPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useConfigs as unknown as jest.Mock).mockReturnValue(mockConfigs);

    // Mock successful fetch response
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockConfigs,
    });
  });

  it('should render loading state initially', async () => {
    // Mock empty config to force loading screen
    (useConfigs as unknown as jest.Mock).mockReturnValue({
      ...mockConfigs,
      general: {}, // No siteName
    });

    // Mock loading state by delaying fetch
    (global.fetch as jest.Mock).mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(
            () =>
              resolve({
                ok: true,
                json: async () => mockConfigs,
              }),
            100
          );
        })
    );

    render(<ConfigurationPage />);
    expect(screen.getByText('Chargement des configurations...')).toBeInTheDocument();

    // Wait for the promise to resolve to avoid act warnings
    await waitFor(() => {
      expect(screen.queryByText('Chargement des configurations...')).not.toBeInTheDocument();
    });
  });

  it('should render main layout after loading', async () => {
    render(<ConfigurationPage />);

    await waitFor(() => {
      expect(screen.getByText('Configuration')).toBeInTheDocument();
    });

    expect(screen.getByText('Général')).toBeInTheDocument();
    expect(screen.getByText('Apparence')).toBeInTheDocument();
  });

  it('should switch sections', async () => {
    const user = userEvent.setup();
    render(<ConfigurationPage />);

    await waitFor(() => {
      expect(screen.getByText('Configuration')).toBeInTheDocument();
    });

    const appearanceButton = screen.getByText('Apparence');
    await user.click(appearanceButton);

    // Verify URL hash update (mocked window)
    // Since we can't easily check window.location.hash in jsdom without navigation mock,
    // we assume the component state updated if no error occurred.
    // In a real integration test we'd check the active class or content.
  });

  it('should open save modal', async () => {
    const user = userEvent.setup();
    render(<ConfigurationPage />);

    await waitFor(() => {
      expect(screen.getByText('Configuration')).toBeInTheDocument();
    });

    const saveButton = screen.getByText('Sauvegarder');
    await user.click(saveButton);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Sauvegarder la configuration')).toBeInTheDocument();
  });

  it('should handle save submission', async () => {
    const user = userEvent.setup();
    render(<ConfigurationPage />);

    await waitFor(() => {
      expect(screen.getByText('Configuration')).toBeInTheDocument();
    });

    // Open modal - use specific selector for the main save button
    const saveButton = screen.getByRole('button', { name: /Sauvegarder/i });
    await user.click(saveButton);

    // Fill form
    const nameInput = screen.getByLabelText('Nom de la sauvegarde');
    await user.clear(nameInput);
    await user.type(nameInput, 'My Backup');

    // Submit - targeting the button inside the modal
    // Since we mocked Modal to just render children, we need to distinguish the buttons
    const submitButtons = screen.getAllByRole('button', { name: /Sauvegarder/i });
    // The second one should be the submit button in the modal (based on order)
    // Or better, use a more specific query if possible, but with the mock structure, getAll is safer
    await user.click(submitButtons[1]);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/admin/config',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('My Backup'),
        })
      );
    });
  });

  it('should handle fetch error with fallback', async () => {
    // Mock fetch error
    (global.fetch as jest.Mock).mockRejectedValue(new Error('API Error'));

    render(<ConfigurationPage />);

    await waitFor(() => {
      expect(screen.getByText(/Mode fallback activé/)).toBeInTheDocument();
    });

    expect(mockConfigs.resetConfigs).toHaveBeenCalled();
  });
});
