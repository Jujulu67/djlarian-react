import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';

// Mock dependencies - MUST be before component imports
jest.mock('@/auth', () => ({
  auth: jest.fn(),
}));

jest.mock('@/actions/inventory', () => ({
  searchUsers: jest.fn(),
  getInventory: jest.fn(),
  getAllItems: jest.fn(),
  addItemToUser: jest.fn(),
  removeItemFromUser: jest.fn(),
  toggleItemActivation: jest.fn(),
}));

import { AdminLiveActions } from '../AdminLiveActions';
import { useAdminLiveActions } from '../../hooks/useAdminLiveActions';
import { useAdminLiveSubmissionsContext } from '../../context/AdminLiveSubmissionsContext';
import { useAdminLivePlayerContext } from '../../context/AdminLivePlayerContext';

// Mock dependencies
jest.mock('../../hooks/useAdminLiveActions');
jest.mock('../../context/AdminLiveSubmissionsContext', () => ({
  useAdminLiveSubmissionsContext: jest.fn(),
}));
jest.mock('../../context/AdminLivePlayerContext', () => ({
  useAdminLivePlayerContext: jest.fn(() => ({
    isPlaying: false,
    handlePlayPause: jest.fn(),
  })),
}));
jest.mock('../RandomWheelModal', () => ({
  RandomWheelModal: () => <div data-testid="wheel-modal" />,
}));
jest.mock('../GlobalInventoryManager', () => ({
  GlobalInventoryManager: () => <div data-testid="global-inventory-manager" />,
}));
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  },
}));
jest.mock('lucide-react', () => ({
  RefreshCw: () => <div data-testid="refresh-icon" />,
  Trash2: () => <div data-testid="trash-icon" />,
  Download: () => <div data-testid="download-icon" />,
  Shuffle: () => <div data-testid="shuffle-icon" />,
  Settings: () => <div data-testid="settings-icon" />,
  Users: () => <div data-testid="users-icon" />,
  Music: () => <div data-testid="music-icon" />,
  Eye: () => <div data-testid="eye-icon" />,
  RotateCcw: () => <div data-testid="rotate-icon" />,
  Gift: () => <div data-testid="gift-icon" />,
  MessageSquare: () => <div data-testid="message-icon" />,
  CheckCircle: () => <div data-testid="check-icon" />,
  FileText: () => <div data-testid="file-icon" />,
  Package: () => <div data-testid="package-icon" />,
  Clock: () => <div data-testid="clock-icon" />,
  RotateCw: () => <div data-testid="rotate-cw-icon" />,
}));

describe('AdminLiveActions', () => {
  const mockPurgeAllSubmissions = jest.fn();
  const mockDownloadAll = jest.fn();
  const mockRollRandom = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    (useAdminLiveActions as jest.Mock).mockReturnValue({
      actions: {
        downloadsEnabled: true,
        trackSubmissions: true,
        koolKids: false,
        genreBlend: true,
      },
      updateAction: jest.fn(),
      purgeAllSubmissions: mockPurgeAllSubmissions,
      downloadAll: mockDownloadAll,
      rollRandom: mockRollRandom,
      isWheelModalOpen: false,
    });

    (useAdminLiveSubmissionsContext as jest.Mock).mockReturnValue({
      submissions: [],
      isLoading: false,
      refreshSubmissions: jest.fn(),
    });
  });

  it('renders Purge All button', () => {
    render(<AdminLiveActions />);

    const purgeButton = screen.getByRole('button', { name: /purge all/i });
    expect(purgeButton).toBeInTheDocument();
    expect(screen.getByTestId('trash-icon')).toBeInTheDocument();
  });

  it('calls purgeAllSubmissions when clicked', () => {
    render(<AdminLiveActions />);

    const purgeButton = screen.getByRole('button', { name: /purge all/i });
    fireEvent.click(purgeButton);

    expect(mockPurgeAllSubmissions).toHaveBeenCalled();
  });

  it('renders Download All button', () => {
    render(<AdminLiveActions />);

    const downloadButton = screen.getByRole('button', { name: /download all/i });
  });
});
