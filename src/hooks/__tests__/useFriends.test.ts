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

  it('should handle reject friend request', async () => {
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
      await result.current.rejectRequest('friendship-1');
    });

    expect(mockFetchWithAuth).toHaveBeenCalledWith('/api/friends/friendship-1/reject', {
      method: 'POST',
    });
  });

  it('should handle unfriend', async () => {
    mockFetchWithAuth
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          friends: [{ id: '1', friendshipId: 'friendship-1' }],
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
      await result.current.unfriend('friendship-1');
    });

    expect(mockFetchWithAuth).toHaveBeenCalledWith('/api/friends/friendship-1', {
      method: 'DELETE',
    });
  });

  it('should handle fetch errors', async () => {
    mockFetchWithAuth.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useFriends());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBeTruthy();
  });

  it('should handle 401 errors silently', async () => {
    mockFetchWithAuth.mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ error: 'Non autorisé' }),
    });

    const { result } = renderHook(() => useFriends());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBeNull();
    expect(result.current.friends).toEqual([]);
  });

  it('should handle sendRequest errors', async () => {
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
        ok: false,
        json: async () => ({ error: 'Request failed' }),
      });

    const { result } = renderHook(() => useFriends());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await expect(async () => {
      await act(async () => {
        await result.current.sendRequest('user-2');
      });
    }).rejects.toThrow();
  });

  it('should handle acceptRequest errors', async () => {
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
        ok: false,
        json: async () => ({ error: 'Accept failed' }),
      });

    const { result } = renderHook(() => useFriends());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await expect(async () => {
      await act(async () => {
        await result.current.acceptRequest('friendship-1');
      });
    }).rejects.toThrow();
  });

  it('should handle rejectRequest errors', async () => {
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
        ok: false,
        json: async () => ({ error: 'Reject failed' }),
      });

    const { result } = renderHook(() => useFriends());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await expect(async () => {
      await act(async () => {
        await result.current.rejectRequest('friendship-1');
      });
    }).rejects.toThrow();
  });

  it('should handle unfriend errors', async () => {
    mockFetchWithAuth
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          friends: [{ id: '1', friendshipId: 'friendship-1' }],
          pendingReceived: [],
          pendingSent: [],
        }),
      })
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Unfriend failed' }),
      });

    const { result } = renderHook(() => useFriends());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await expect(async () => {
      await act(async () => {
        await result.current.unfriend('friendship-1');
      });
    }).rejects.toThrow();
  });

  it('should handle invalid response format', async () => {
    mockFetchWithAuth.mockResolvedValue({
      ok: true,
      json: async () => null, // Invalid format
    });

    const { result } = renderHook(() => useFriends());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBeTruthy();
  });

  it('should handle refresh function', async () => {
    mockFetchWithAuth.mockResolvedValue({
      ok: true,
      json: async () => ({
        friends: [],
        pendingReceived: [],
        pendingSent: [],
      }),
    });

    const { result } = renderHook(() => useFriends());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.refresh();
    });

    expect(mockFetchWithAuth).toHaveBeenCalled();
  });

  it('should handle loading state during session loading', () => {
    mockUseSession.mockReturnValue({
      data: null,
      status: 'loading',
    });
    mockFetchWithAuth.mockResolvedValue({
      ok: true,
      json: async () => ({
        friends: [],
        pendingReceived: [],
        pendingSent: [],
      }),
    });

    const { result } = renderHook(() => useFriends());

    // When session is loading, the hook should not fetch yet
    // But isLoading might be true initially
    expect(result.current.friends).toEqual([]);
  });

  it('should normalize date strings', async () => {
    const mockFriends = {
      friends: [
        {
          id: '1',
          user: { id: 'user-2', name: 'Friend' },
          createdAt: '2024-01-01T00:00:00Z',
        },
      ],
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

    expect(result.current.friends[0].createdAt).toBe('2024-01-01T00:00:00Z');
  });

  it('should normalize Date objects to ISO strings', async () => {
    const mockFriends = {
      friends: [
        {
          id: '1',
          user: { id: 'user-2', name: 'Friend' },
          createdAt: new Date('2024-01-01'),
        },
      ],
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

    expect(typeof result.current.friends[0].createdAt).toBe('string');
  });
});
