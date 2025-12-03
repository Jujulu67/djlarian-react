/**
 * Tests for useAuthErrorHandler hook
 */
import { renderHook, act, waitFor } from '@testing-library/react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';

import { useAuthErrorHandler } from '../useAuthErrorHandler';

// Mock dependencies
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
  signOut: jest.fn(),
}));

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

// Mock fetch
global.fetch = jest.fn();

describe('useAuthErrorHandler', () => {
  const mockUpdate = jest.fn();
  const mockRouter = {
    push: jest.fn(),
    replace: jest.fn(),
    refresh: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useSession as jest.Mock).mockReturnValue({
      data: { user: { id: 'user1' } },
      update: mockUpdate,
      status: 'authenticated',
    });
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ user: { id: 'user1' } }),
    });
  });

  it('should return handler functions', () => {
    const { result } = renderHook(() => useAuthErrorHandler());

    expect(result.current.handle401Error).toBeDefined();
    expect(result.current.is401Error).toBeDefined();
    expect(result.current.refreshSession).toBeDefined();
    expect(result.current.fetchWithAuth).toBeDefined();
  });

  it('should detect 401 errors', () => {
    const { result } = renderHook(() => useAuthErrorHandler());

    const response401 = {
      status: 401,
    } as Response;
    expect(result.current.is401Error(response401)).toBe(true);

    const response200 = {
      status: 200,
    } as Response;
    expect(result.current.is401Error(response200)).toBe(false);
  });

  it('should refresh session on 401 error', async () => {
    const { result } = renderHook(() => useAuthErrorHandler());

    mockUpdate.mockResolvedValue(undefined);

    await act(async () => {
      const refreshed = await result.current.refreshSession();
      expect(refreshed).toBe(true);
    });

    expect(mockUpdate).toHaveBeenCalled();
  });

  it('should handle 401 error and retry request', async () => {
    const { result } = renderHook(() => useAuthErrorHandler());

    mockUpdate.mockResolvedValue(undefined);

    const originalRequest = jest.fn().mockResolvedValue({ data: 'success' });

    await act(async () => {
      const retried = await result.current.handle401Error(originalRequest, 1);
      expect(retried).toEqual({ data: 'success' });
    });
  });

  it('should sign out after max retries', async () => {
    const { result } = renderHook(() => useAuthErrorHandler());

    const originalRequest = jest.fn().mockRejectedValue(new Error('401'));

    await act(async () => {
      const retried = await result.current.handle401Error(originalRequest, 0);
      expect(retried).toBeNull();
    });

    expect(signOut).toHaveBeenCalledWith({ callbackUrl: '/' });
  });

  it('should handle fetch with auth', async () => {
    const { result } = renderHook(() => useAuthErrorHandler());

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
    });

    await act(async () => {
      const response = await result.current.fetchWithAuth('/api/test');
      expect(response.status).toBe(200);
    });
  });
});
