/**
 * Tests for useBatchedActions hook
 */
import { renderHook, act, waitFor } from '@testing-library/react';

import { useBatchedActions } from '../useBatchedActions';

// Mock fetchWithAuth
jest.mock('@/lib/api/fetchWithAuth', () => ({
  fetchWithAuth: jest.fn(),
}));

describe('useBatchedActions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('should queue and batch actions', async () => {
    const { fetchWithAuth } = await import('@/lib/api/fetchWithAuth');
    (fetchWithAuth as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          results: [{ success: true }, { success: true }],
          summary: { total: 2, success: 2, errors: 0 },
        },
      }),
    });

    const { result } = renderHook(() =>
      useBatchedActions({
        batchEndpoint: '/api/batch',
        debounceDelay: 100,
      })
    );

    const action1 = { type: 'activate', id: '1' };
    const action2 = { type: 'activate', id: '2' };

    let promise1: Promise<{ success: boolean; error?: string }>;
    let promise2: Promise<{ success: boolean; error?: string }>;

    await act(async () => {
      promise1 = result.current.queueAction(action1);
    });

    await act(async () => {
      promise2 = result.current.queueAction(action2);
    });

    // Fast-forward time to trigger batch
    await act(async () => {
      jest.advanceTimersByTime(100);
      await waitFor(() => {
        expect(fetchWithAuth).toHaveBeenCalled();
      });
    });

    const result1 = await promise1!;
    const result2 = await promise2!;

    expect(result1.success).toBe(true);
    expect(result2.success).toBe(true);
    expect(fetchWithAuth).toHaveBeenCalledWith(
      '/api/batch',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          actions: [action1, action2],
        }),
      })
    );
  });

  it('should optimize actions if optimizeActions is provided', async () => {
    const { fetchWithAuth } = await import('@/lib/api/fetchWithAuth');
    (fetchWithAuth as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          results: [{ success: true }],
          summary: { total: 1, success: 1, errors: 0 },
        },
      }),
    });

    const optimizeActions = jest.fn((actions) => {
      // Remove duplicates
      return actions.filter(
        (action: { id: string }, index: number, self: Array<{ id: string }>) =>
          index === self.findIndex((a) => a.id === action.id)
      );
    });

    const { result } = renderHook(() =>
      useBatchedActions({
        batchEndpoint: '/api/batch',
        optimizeActions,
        debounceDelay: 100,
      })
    );

    const action1 = { id: '1', type: 'activate' };
    const action2 = { id: '1', type: 'activate' }; // Duplicate

    await act(async () => {
      result.current.queueAction(action1);
      result.current.queueAction(action2);
    });

    await act(async () => {
      jest.advanceTimersByTime(100);
      await waitFor(() => {
        expect(optimizeActions).toHaveBeenCalled();
      });
    });
  });
});
