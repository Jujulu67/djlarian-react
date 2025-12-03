/**
 * Tests for useFriends hook
 */
import { renderHook, act, waitFor } from '@testing-library/react';
import { useSession } from 'next-auth/react';

import { useFriends } from '../useFriends';

// Mock dependencies
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
}));

jest.mock('@/lib/api/fetchWithAuth', () => ({
  fetchWithAuth: jest.fn(),
}));

describe('useFriends', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with empty state', () => {
    (useSession as jest.Mock).mockReturnValue({
      data: null,
      status: 'unauthenticated',
    });

    const { result } = renderHook(() => useFriends());

    expect(result.current.friends).toEqual([]);
    expect(result.current.pendingReceived).toEqual([]);
    expect(result.current.pendingSent).toEqual([]);
    // isLoading is set to false when unauthenticated
    expect(result.current.isLoading).toBe(false);
  });

  it('should fetch friends for authenticated user', async () => {
    const { fetchWithAuth } = await import('@/lib/api/fetchWithAuth');
    (useSession as jest.Mock).mockReturnValue({
      data: { user: { id: 'user1' } },
      status: 'authenticated',
    });

    (fetchWithAuth as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          friends: [],
          pendingReceived: [],
          pendingSent: [],
        },
      }),
    });

    const { result } = renderHook(() => useFriends());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.friends).toEqual([]);
  });

  it('should handle unauthenticated user', () => {
    (useSession as jest.Mock).mockReturnValue({
      data: null,
      status: 'unauthenticated',
    });

    const { result } = renderHook(() => useFriends());

    expect(result.current.friends).toEqual([]);
    expect(result.current.isLoading).toBe(false);
  });

  it('should refresh friends', async () => {
    const { fetchWithAuth } = await import('@/lib/api/fetchWithAuth');
    (useSession as jest.Mock).mockReturnValue({
      data: { user: { id: 'user1' } },
      status: 'authenticated',
    });

    (fetchWithAuth as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          friends: [],
          pendingReceived: [],
          pendingSent: [],
        },
      }),
    });

    const { result } = renderHook(() => useFriends());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.refresh();
    });

    expect(fetchWithAuth).toHaveBeenCalled();
  });

  it('should send friend request', async () => {
    const { fetchWithAuth } = await import('@/lib/api/fetchWithAuth');
    (useSession as jest.Mock).mockReturnValue({
      data: { user: { id: 'user1' } },
      status: 'authenticated',
    });

    (fetchWithAuth as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            friends: [],
            pendingReceived: [],
            pendingSent: [],
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { success: true } }),
      });

    const { result } = renderHook(() => useFriends());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.sendRequest('user2');
    });

    expect(fetchWithAuth).toHaveBeenCalledWith('/api/friends/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: 'user2' }),
    });
  });
});
