/**
 * Tests for NotificationsClient component
 * @jest-environment jsdom
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NotificationsClient from '../NotificationsClient';
import { useNotifications } from '@/hooks/useNotifications';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';

// Mock dependencies
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(() => ({
    data: { user: { role: 'USER' } },
    status: 'authenticated',
  })),
}));
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(),
}));
jest.mock('@/hooks/useNotifications');
jest.mock('@/lib/api/fetchWithAuth');
jest.mock('@/components/notifications/SendMessageModal', () => ({
  SendMessageModal: ({ isOpen, onClose }: any) =>
    isOpen ? (
      <div role="dialog">
        Send Message Modal <button onClick={onClose}>Close</button>
      </div>
    ) : null,
}));
jest.mock('@/components/notifications/FriendsList', () => ({
  FriendsList: () => <div>Friends List Component</div>,
}));

// Mock fetch
global.fetch = jest.fn();
global.confirm = jest.fn();

const mockRouter = {
  push: jest.fn(),
  back: jest.fn(),
  refresh: jest.fn(),
};

const mockSearchParams = new URLSearchParams();

const mockNotifications = [
  {
    id: '1',
    type: 'MILESTONE',
    title: 'Milestone Reached',
    message: 'You reached 1000 streams',
    isRead: false,
    createdAt: '2024-01-01T10:00:00Z',
    metadata: JSON.stringify({ streams: 1000, projectName: 'Project A' }),
  },
  {
    id: '2',
    type: 'ADMIN_MESSAGE',
    title: 'Admin Message',
    message: 'Hello user',
    isRead: true,
    createdAt: '2024-01-02T10:00:00Z',
    metadata: JSON.stringify({ senderName: 'Admin' }),
  },
];

const mockUseNotifications = {
  notifications: mockNotifications,
  unreadCount: 1,
  isLoading: false,
  error: null,
  markAsRead: jest.fn(),
  markAllAsRead: jest.fn(),
  archive: jest.fn(),
  unarchive: jest.fn(),
  delete: jest.fn(),
  refresh: jest.fn(),
};

describe('NotificationsClient', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useSession as jest.Mock).mockReturnValue({
      data: { user: { role: 'USER' } },
    });
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (useSearchParams as jest.Mock).mockReturnValue(mockSearchParams);
    (useNotifications as jest.Mock).mockReturnValue(mockUseNotifications);

    // Mock fetch for archived notifications
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ data: { notifications: [] } }),
    });
  });

  it('should render notifications list by default', async () => {
    render(<NotificationsClient />);

    expect(screen.getByText('Notifications')).toBeInTheDocument();
    expect(screen.getByText('Milestone Reached')).toBeInTheDocument();
    expect(screen.queryByText('Admin Message')).not.toBeInTheDocument();
  });

  it('should filter notifications by type', async () => {
    const user = userEvent.setup();
    render(<NotificationsClient />);

    // Open filters
    await user.click(screen.getByText('Filtres'));

    // Select 'Non lues'
    await user.click(screen.getByText('Non lues'));

    expect(screen.getByText('Milestone Reached')).toBeInTheDocument();
    expect(screen.queryByText('Admin Message')).not.toBeInTheDocument();
  });

  it('should switch views (messages, friends)', async () => {
    const user = userEvent.setup();
    render(<NotificationsClient />);

    // Switch to Messages view
    const messagesButton = screen.getByText(/Messages/i);
    await user.click(messagesButton);

    expect(screen.queryByText('Milestone Reached')).not.toBeInTheDocument();
    expect(screen.getByText('Admin Message')).toBeInTheDocument();

    // Switch to Friends view
    const friendsButton = screen.getByText('Amis');
    await user.click(friendsButton);

    expect(screen.getByText('Friends List Component')).toBeInTheDocument();
  });

  it('should handle mark as read interaction', async () => {
    const user = userEvent.setup();
    render(<NotificationsClient />);

    await user.click(screen.getByText('Milestone Reached'));

    expect(mockUseNotifications.markAsRead).toHaveBeenCalledWith('1');
  });

  it('should handle archive interaction', async () => {
    const user = userEvent.setup();
    render(<NotificationsClient />);

    const archiveButtons = screen.getAllByTitle('Archiver');
    await user.click(archiveButtons[0]);

    expect(mockUseNotifications.archive).toHaveBeenCalledWith('1');
  });

  it('should open send message modal', async () => {
    const user = userEvent.setup();
    render(<NotificationsClient />);

    // Switch to Messages view to see the send button
    await user.click(screen.getByText(/Messages/i));

    const sendButton = screen.getByText(/Envoyer un message/i);
    await user.click(sendButton);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('should handle mark all as read', async () => {
    const user = userEvent.setup();
    render(<NotificationsClient />);

    const markAllButton = screen.getByText(/Tout marquer comme lu/i);
    await user.click(markAllButton);

    expect(mockUseNotifications.markAllAsRead).toHaveBeenCalled();
  });
});
