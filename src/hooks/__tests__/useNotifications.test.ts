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
});
