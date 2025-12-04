import { renderHook, act, waitFor } from '@testing-library/react';
import { useFriends } from '../useFriends';

// Mock next-auth/react
const mockUseSession = jest.fn(() => ({
  data: { user: { id: 'user-1' } },
  status: 'authenticated',
}));

jest.mock('next-auth/react', () => ({
  useSession: () => mockUseSession(),
}));

// Mock fetchWithAuth
jest.mock('@/lib/api/fetchWithAuth', () => ({
  fetchWithAuth: jest.fn(),
}));

describe('useFriends', () => {
  const mockFetchWithAuth = require('@/lib/api/fetchWithAuth').fetchWithAuth;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSession.mockReturnValue({
      data: { user: { id: 'user-1' } },
      status: 'authenticated',
    });
  });

  it('should initialize with loading state', () => {
    mockFetchWithAuth.mockResolvedValue({
      ok: true,
      json: async () => ({
        friends: [],
        pendingReceived: [],
        pendingSent: [],
      }),
    });

    const { result } = renderHook(() => useFriends());

    expect(result.current.isLoading).toBe(true);
  });

  it('should load friends', async () => {
    const mockFriends = {
      friends: [{ id: '1', user: { id: 'user-2', name: 'Friend' } }],
      pendingReceived: [],
      pendingSent: [],
    };

    mockFetchWithAuth.mockResolvedValue({
      ok: true,
      json: async () => mockFriends,
    });

    const { result } = renderHook(() => useFriends());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.friends).toHaveLength(1);
  });

  it('should send friend request', async () => {
    mockFetchWithAuth
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          friends: [],
          pendingReceived: [],
          pendingSent: [],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

    const { result } = renderHook(() => useFriends());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.sendRequest('user-2');
    });

    expect(mockFetchWithAuth).toHaveBeenCalled();
  });

  it('should accept friend request', async () => {
    mockFetchWithAuth
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          friends: [],
          pendingReceived: [{ id: '1', friendshipId: 'friendship-1' }],
          pendingSent: [],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

    const { result } = renderHook(() => useFriends());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.acceptRequest('friendship-1');
    });

    expect(mockFetchWithAuth).toHaveBeenCalled();
  });

  it('should handle unauthenticated state', () => {
    mockUseSession.mockReturnValue({
      data: null,
      status: 'unauthenticated',
    });

    const { result } = renderHook(() => useFriends());

    expect(result.current.friends).toEqual([]);
    expect(result.current.isLoading).toBe(false);
  });
});
