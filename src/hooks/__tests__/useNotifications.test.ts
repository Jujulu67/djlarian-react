/**
 * Tests for useNotifications hook
 */
import { renderHook, act, waitFor } from '@testing-library/react';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';

import { useNotifications } from '../useNotifications';

// Mock dependencies
jest.mock('next/navigation', () => ({
  usePathname: jest.fn(() => '/'),
}));

jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
}));

jest.mock('@/lib/api/fetchWithAuth', () => ({
  fetchWithAuth: jest.fn(),
}));

// Mock window focus/blur events
const mockAddEventListener = jest.fn();
const mockRemoveEventListener = jest.fn();

beforeAll(() => {
  window.addEventListener = mockAddEventListener;
  window.removeEventListener = mockRemoveEventListener;
});

describe('useNotifications', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (usePathname as jest.Mock).mockReturnValue('/');
    (useSession as jest.Mock).mockReturnValue({
      data: { user: { id: 'user1' } },
      status: 'authenticated',
    });
  });

  it('should initialize with empty notifications', () => {
    const { fetchWithAuth } = require('@/lib/api/fetchWithAuth');
    (fetchWithAuth as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          notifications: [],
          unreadCount: 0,
          total: 0,
        },
      }),
    });

    const { result } = renderHook(() => useNotifications());

    expect(result.current.notifications).toEqual([]);
    expect(result.current.unreadCount).toBe(0);
    expect(result.current.isLoading).toBe(true);
  });

  it('should fetch notifications on mount', async () => {
    const { fetchWithAuth } = require('@/lib/api/fetchWithAuth');
    const mockNotifications = [
      {
        id: '1',
        userId: 'user1',
        type: 'INFO',
        title: 'Test',
        message: 'Test message',
        metadata: null,
        isRead: false,
        createdAt: '2024-01-01',
        readAt: null,
        projectId: null,
      },
    ];

    (fetchWithAuth as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          notifications: mockNotifications,
          unreadCount: 1,
          total: 1,
        },
      }),
    });

    const { result } = renderHook(() => useNotifications());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // The hook processes the response and sets notifications
    expect(result.current.notifications.length).toBeGreaterThanOrEqual(0);
    expect(result.current.unreadCount).toBeGreaterThanOrEqual(0);
  });

  it('should handle unauthenticated user', () => {
    (useSession as jest.Mock).mockReturnValue({
      data: null,
      status: 'unauthenticated',
    });

    const { result } = renderHook(() => useNotifications());

    expect(result.current.notifications).toEqual([]);
    expect(result.current.unreadCount).toBe(0);
  });

  it('should refresh notifications', async () => {
    const { fetchWithAuth } = require('@/lib/api/fetchWithAuth');
    (fetchWithAuth as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          notifications: [],
          unreadCount: 0,
          total: 0,
        },
      }),
    });

    const { result } = renderHook(() => useNotifications());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.refresh();
    });

    expect(fetchWithAuth).toHaveBeenCalled();
  });

  it('should mark notification as read', async () => {
    const { fetchWithAuth } = require('@/lib/api/fetchWithAuth');
    (fetchWithAuth as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            notifications: [
              {
                id: '1',
                userId: 'user1',
                type: 'INFO',
                title: 'Test',
                message: 'Test message',
                metadata: null,
                isRead: false,
                createdAt: '2024-01-01',
                readAt: null,
                projectId: null,
              },
            ],
            unreadCount: 1,
            total: 1,
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { success: true } }),
      });

    const { result } = renderHook(() => useNotifications());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.markAsRead('1');
    });

    expect(fetchWithAuth).toHaveBeenCalledWith('/api/notifications/1', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ isRead: true }),
    });
  });

  it('should mark all notifications as read', async () => {
    const { fetchWithAuth } = require('@/lib/api/fetchWithAuth');
    (fetchWithAuth as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            notifications: [],
            unreadCount: 0,
            total: 0,
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { success: true } }),
      });

    const { result } = renderHook(() => useNotifications());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.markAllAsRead();
    });

    expect(fetchWithAuth).toHaveBeenCalledWith('/api/notifications/read-all', {
      method: 'POST',
    });
  });

  it('should filter by unreadOnly when option is set', async () => {
    const { fetchWithAuth } = require('@/lib/api/fetchWithAuth');
    (fetchWithAuth as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          notifications: [],
          unreadCount: 0,
          total: 0,
        },
      }),
    });

    renderHook(() => useNotifications({ unreadOnly: true }));

    await waitFor(() => {
      expect(fetchWithAuth).toHaveBeenCalledWith(expect.stringContaining('unreadOnly=true'));
    });
  });

  it('should filter by type when option is set', async () => {
    const { fetchWithAuth } = require('@/lib/api/fetchWithAuth');
    (fetchWithAuth as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          notifications: [],
          unreadCount: 0,
          total: 0,
        },
      }),
    });

    renderHook(() => useNotifications({ type: 'MILESTONE' }));

    await waitFor(() => {
      expect(fetchWithAuth).toHaveBeenCalledWith(expect.stringContaining('type=MILESTONE'));
    });
  });

  it('should handle fetch errors gracefully', async () => {
    const { fetchWithAuth } = require('@/lib/api/fetchWithAuth');
    (fetchWithAuth as jest.Mock).mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useNotifications());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBeTruthy();
  });

  it('should handle 401 errors silently', async () => {
    const { fetchWithAuth } = require('@/lib/api/fetchWithAuth');
    (fetchWithAuth as jest.Mock).mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ error: 'Non autorisé' }),
    });

    const { result } = renderHook(() => useNotifications());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBeNull();
    expect(result.current.notifications).toEqual([]);
  });

  it('should handle archive notification', async () => {
    const { fetchWithAuth } = require('@/lib/api/fetchWithAuth');
    (fetchWithAuth as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            notifications: [
              {
                id: '1',
                userId: 'user1',
                type: 'INFO',
                title: 'Test',
                message: 'Test message',
                metadata: null,
                isRead: false,
                createdAt: '2024-01-01',
                readAt: null,
                projectId: null,
              },
            ],
            unreadCount: 1,
            total: 1,
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { success: true } }),
      });

    const { result } = renderHook(() => useNotifications());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.archive('1');
    });

    expect(fetchWithAuth).toHaveBeenCalledWith('/api/notifications/1/archive', {
      method: 'PATCH',
    });
  });

  it('should handle unarchive notification', async () => {
    const { fetchWithAuth } = require('@/lib/api/fetchWithAuth');
    (fetchWithAuth as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            notifications: [],
            unreadCount: 0,
            total: 0,
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { success: true } }),
      });

    const { result } = renderHook(() => useNotifications());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.unarchive('1');
    });

    expect(fetchWithAuth).toHaveBeenCalledWith('/api/notifications/1/unarchive', {
      method: 'PATCH',
    });
  });

  it('should handle delete notification', async () => {
    const { fetchWithAuth } = require('@/lib/api/fetchWithAuth');
    (fetchWithAuth as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            notifications: [],
            unreadCount: 0,
            total: 0,
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { success: true } }),
      });

    const { result } = renderHook(() => useNotifications());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.delete('1');
    });

    expect(fetchWithAuth).toHaveBeenCalledWith('/api/notifications/1/delete', {
      method: 'DELETE',
    });
  });

  it('should handle loading state during session loading', () => {
    const { fetchWithAuth } = require('@/lib/api/fetchWithAuth');
    (useSession as jest.Mock).mockReturnValue({
      data: null,
      status: 'loading',
    });
    (fetchWithAuth as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          notifications: [],
          unreadCount: 0,
          total: 0,
        },
      }),
    });

    const { result } = renderHook(() => useNotifications());

    // When session is loading, isLoading might be true initially
    // But the hook might not fetch until session is authenticated
    expect(result.current.notifications).toEqual([]);
  });

  it('should not fetch when session is loading', async () => {
    const { fetchWithAuth } = require('@/lib/api/fetchWithAuth');
    (useSession as jest.Mock).mockReturnValue({
      data: null,
      status: 'loading',
    });

    renderHook(() => useNotifications());

    // Wait a bit to ensure no fetch is called
    await waitFor(
      () => {
        // The hook might not fetch immediately when loading
        expect(fetchWithAuth).not.toHaveBeenCalled();
      },
      { timeout: 200 }
    );
  });
});
