// Mock next-auth/react before importing FriendsList
jest.mock('next-auth/react', () => ({
  useSession: () => ({
    data: { user: { id: 'user-1' } },
    status: 'authenticated',
  }),
}));

// Mock sonner before importing FriendsList
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  },
}));

// Mock hooks
jest.mock('@/hooks/useFriends', () => ({
  useFriends: () => ({
    friends: [],
    pendingReceived: [],
    pendingSent: [],
    isLoading: false,
    error: null,
    sendRequest: jest.fn(),
    acceptRequest: jest.fn(),
    rejectRequest: jest.fn(),
    unfriend: jest.fn(),
  }),
}));

// Mock fetch
global.fetch = jest.fn();

import { render, screen } from '@testing-library/react';
import { FriendsList } from '../FriendsList';

describe('FriendsList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ users: [] }),
    });
  });

  it('should render friends list', () => {
    render(<FriendsList />);
    // Use a more specific query - look for heading or specific text
    const heading = screen.getByRole('heading', { name: /amis/i });
    expect(heading).toBeInTheDocument();
  });

  it('should render search input', () => {
    render(<FriendsList />);
    const searchInput = screen.getByPlaceholderText(/rechercher/i);
    expect(searchInput).toBeInTheDocument();
  });
});
