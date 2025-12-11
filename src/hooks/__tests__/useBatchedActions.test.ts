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
    // Only run pending timers if fake timers are active
    if (jest.isMockFunction(setTimeout)) {
      jest.runOnlyPendingTimers();
    }
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

  describe('error handling', () => {
    // Error handling tests are in a separate describe block with real timers
    // to avoid issues with fake timers and promise rejections
  });

  describe('error handling with real timers', () => {
    let unhandledRejections: Error[] = [];

    beforeEach(() => {
      jest.clearAllMocks();
      jest.useRealTimers();
      unhandledRejections = [];
      // Catch unhandled rejections to prevent test failures
      process.on('unhandledRejection', (reason) => {
        unhandledRejections.push(reason as Error);
      });
    });

    afterEach(() => {
      jest.useRealTimers();
      process.removeAllListeners('unhandledRejection');
      unhandledRejections = [];
    });

    it('should handle non-OK HTTP responses', async () => {
      const { fetchWithAuth } = await import('@/lib/api/fetchWithAuth');
      (fetchWithAuth as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({
          error: 'Internal server error',
        }),
      });

      const { result } = renderHook(() =>
        useBatchedActions({
          batchEndpoint: '/api/batch',
          debounceDelay: 100,
        })
      );

      const action = { type: 'activate', id: '1' };
      let promise: Promise<{ success: boolean; error?: string }>;

      // Handle promise rejection immediately to prevent unhandled rejection
      await act(async () => {
        promise = result.current.queueAction(action);
        // Add catch handler immediately to prevent unhandled rejection
        promise.catch(() => {
          // Ignore - we'll check it later
        });
      });

      // Wait for debounce delay with real timers
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 150));
      });

      await act(async () => {
        await waitFor(
          () => {
            expect(fetchWithAuth).toHaveBeenCalled();
          },
          { timeout: 200 }
        );
      });

      // Wait a bit for promise rejection to propagate
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
      });

      // Catch the rejection explicitly
      let caughtError: Error | null = null;
      await promise!.catch((error) => {
        caughtError = error;
      });

      expect(caughtError).toBeInstanceOf(Error);
      expect(caughtError!.message).toBe('Internal server error');
    });

    it('should handle network errors', async () => {
      const { fetchWithAuth } = await import('@/lib/api/fetchWithAuth');
      (fetchWithAuth as jest.Mock).mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() =>
        useBatchedActions({
          batchEndpoint: '/api/batch',
          debounceDelay: 100,
        })
      );

      const action = { type: 'activate', id: '1' };
      let promise: Promise<{ success: boolean; error?: string }>;

      // Handle promise rejection immediately to prevent unhandled rejection
      await act(async () => {
        promise = result.current.queueAction(action);
        // Add catch handler immediately to prevent unhandled rejection
        promise.catch(() => {
          // Ignore - we'll check it later
        });
      });

      // Wait for debounce delay with real timers
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 150));
      });

      await act(async () => {
        await waitFor(
          () => {
            expect(fetchWithAuth).toHaveBeenCalled();
          },
          { timeout: 200 }
        );
      });

      // Wait a bit for promise rejection to propagate
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
      });

      // Catch the rejection explicitly
      let caughtError: Error | null = null;
      await promise!.catch((error) => {
        caughtError = error;
      });

      expect(caughtError).toBeInstanceOf(Error);
      expect(caughtError!.message).toBe('Network error');
    });

    it('should handle batch with some actions failing', async () => {
      const { fetchWithAuth } = await import('@/lib/api/fetchWithAuth');
      (fetchWithAuth as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          data: {
            results: [
              { success: true },
              { success: false, error: 'Action 2 failed' },
              { success: true },
            ],
            summary: { total: 3, success: 2, errors: 1 },
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
      const action3 = { type: 'activate', id: '3' };

      let promise1: Promise<{ success: boolean; error?: string }>;
      let promise2: Promise<{ success: boolean; error?: string }>;
      let promise3: Promise<{ success: boolean; error?: string }>;

      await act(async () => {
        promise1 = result.current.queueAction(action1);
        promise2 = result.current.queueAction(action2);
        promise3 = result.current.queueAction(action3);
        // Add catch handlers immediately to prevent unhandled rejections
        promise1.catch(() => {});
        promise2.catch(() => {});
        promise3.catch(() => {});
      });

      // Wait for debounce delay with real timers
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 150));
      });

      await act(async () => {
        await waitFor(
          () => {
            expect(fetchWithAuth).toHaveBeenCalled();
          },
          { timeout: 200 }
        );
      });

      // Wait a bit for promise rejection to propagate
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
      });

      // All promises should reject with the first error - catch explicitly
      let error1: Error | null = null;
      let error2: Error | null = null;
      let error3: Error | null = null;

      await Promise.allSettled([
        promise1!.catch((e) => {
          error1 = e;
        }),
        promise2!.catch((e) => {
          error2 = e;
        }),
        promise3!.catch((e) => {
          error3 = e;
        }),
      ]);

      expect(error1).toBeInstanceOf(Error);
      expect(error1!.message).toBe('Action 2 failed');
      expect(error2).toBeInstanceOf(Error);
      expect(error2!.message).toBe('Action 2 failed');
      expect(error3).toBeInstanceOf(Error);
      expect(error3!.message).toBe('Action 2 failed');
    });

    it('should handle JSON parsing errors', async () => {
      const { fetchWithAuth } = await import('@/lib/api/fetchWithAuth');
      (fetchWithAuth as jest.Mock).mockResolvedValue({
        ok: false,
        json: async () => {
          throw new Error('Invalid JSON');
        },
      });

      const { result } = renderHook(() =>
        useBatchedActions({
          batchEndpoint: '/api/batch',
          debounceDelay: 100,
        })
      );

      const action = { type: 'activate', id: '1' };
      let promise: Promise<{ success: boolean; error?: string }>;

      // Handle promise rejection immediately to prevent unhandled rejection
      await act(async () => {
        promise = result.current.queueAction(action);
        // Add catch handler immediately to prevent unhandled rejection
        promise.catch(() => {
          // Ignore - we'll check it later
        });
      });

      // Wait for debounce delay with real timers
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 150));
      });

      await act(async () => {
        await waitFor(
          () => {
            expect(fetchWithAuth).toHaveBeenCalled();
          },
          { timeout: 200 }
        );
      });

      // Wait a bit for promise rejection to propagate
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
      });

      // Catch the rejection explicitly
      let caughtError: Error | null = null;
      await promise!.catch((error) => {
        caughtError = error;
      });

      expect(caughtError).toBeInstanceOf(Error);
      expect(caughtError!.message).toBe('Erreur inconnue');
    });

    it('should handle unknown error types', async () => {
      const { fetchWithAuth } = await import('@/lib/api/fetchWithAuth');
      (fetchWithAuth as jest.Mock).mockRejectedValue('String error');

      const { result } = renderHook(() =>
        useBatchedActions({
          batchEndpoint: '/api/batch',
          debounceDelay: 100,
        })
      );

      const action = { type: 'activate', id: '1' };
      let promise: Promise<{ success: boolean; error?: string }>;

      // Handle promise rejection immediately to prevent unhandled rejection
      await act(async () => {
        promise = result.current.queueAction(action);
        // Add catch handler immediately to prevent unhandled rejection
        promise.catch(() => {
          // Ignore - we'll check it later
        });
      });

      // Wait for debounce delay with real timers
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 150));
      });

      await act(async () => {
        await waitFor(
          () => {
            expect(fetchWithAuth).toHaveBeenCalled();
          },
          { timeout: 200 }
        );
      });

      // Wait a bit for promise rejection to propagate
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
      });

      // Catch the rejection explicitly
      let caughtError: Error | null = null;
      await promise!.catch((error) => {
        caughtError = error;
      });

      expect(caughtError).toBeInstanceOf(Error);
      expect(caughtError!.message).toBe('Erreur de connexion');
    });
  });

  describe('edge cases', () => {
    it('should queue actions during processing', async () => {
      const { fetchWithAuth } = await import('@/lib/api/fetchWithAuth');
      let resolveFirstBatch: (value: any) => void;
      const firstBatchPromise = new Promise((resolve) => {
        resolveFirstBatch = resolve;
      });

      (fetchWithAuth as jest.Mock).mockImplementationOnce(() => firstBatchPromise);

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
        jest.advanceTimersByTime(100);
      });

      // Queue second action while first batch is processing
      await act(async () => {
        promise2 = result.current.queueAction(action2);
      });

      // Resolve first batch
      await act(async () => {
        resolveFirstBatch!({
          ok: true,
          json: async () => ({
            data: {
              results: [{ success: true }],
              summary: { total: 1, success: 1, errors: 0 },
            },
          }),
        });
      });

      // Mock second batch
      (fetchWithAuth as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            results: [{ success: true }],
            summary: { total: 1, success: 1, errors: 0 },
          },
        }),
      });

      await act(async () => {
        jest.advanceTimersByTime(50);
        await waitFor(() => {
          expect(fetchWithAuth).toHaveBeenCalledTimes(2);
        });
      });

      const result1 = await promise1!;
      const result2 = await promise2!;

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
    });

    it('should handle optimizeActions returning empty array', async () => {
      const { fetchWithAuth } = await import('@/lib/api/fetchWithAuth');
      const optimizeActions = jest.fn(() => []); // Return empty array

      const { result } = renderHook(() =>
        useBatchedActions({
          batchEndpoint: '/api/batch',
          optimizeActions,
          debounceDelay: 100,
        })
      );

      const action1 = { type: 'activate', id: '1' };
      const action2 = { type: 'activate', id: '2' };

      let promise1: Promise<{ success: boolean; error?: string }>;
      let promise2: Promise<{ success: boolean; error?: string }>;

      await act(async () => {
        promise1 = result.current.queueAction(action1);
        promise2 = result.current.queueAction(action2);
      });

      await act(async () => {
        jest.advanceTimersByTime(100);
        await waitFor(() => {
          expect(optimizeActions).toHaveBeenCalled();
        });
      });

      // Should resolve all promises as success even though no batch was sent
      const result1 = await promise1!;
      const result2 = await promise2!;

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      expect(fetchWithAuth).not.toHaveBeenCalled();
    });

    it('should flush batch immediately when flushBatch is called', async () => {
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

      const { result } = renderHook(() =>
        useBatchedActions({
          batchEndpoint: '/api/batch',
          debounceDelay: 1000, // Long delay
        })
      );

      const action = { type: 'activate', id: '1' };
      let promise: Promise<{ success: boolean; error?: string }>;

      // Handle promise rejection immediately to prevent unhandled rejection
      await act(async () => {
        promise = result.current.queueAction(action);
        // Add catch handler immediately to prevent unhandled rejection
        promise.catch(() => {
          // Ignore - we'll check it later
        });
      });

      // Flush immediately without waiting for debounce
      await act(async () => {
        await result.current.flushBatch();
        await waitFor(() => {
          expect(fetchWithAuth).toHaveBeenCalled();
        });
      });

      const result1 = await promise!;
      expect(result1.success).toBe(true);
    });

    it('should process new actions after batch completes', async () => {
      const { fetchWithAuth } = await import('@/lib/api/fetchWithAuth');
      (fetchWithAuth as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: {
              results: [{ success: true }],
              summary: { total: 1, success: 1, errors: 0 },
            },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: {
              results: [{ success: true }],
              summary: { total: 1, success: 1, errors: 0 },
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
        jest.advanceTimersByTime(100);
        await waitFor(() => {
          expect(fetchWithAuth).toHaveBeenCalledTimes(1);
        });
      });

      await act(async () => {
        promise2 = result.current.queueAction(action2);
      });

      await act(async () => {
        jest.advanceTimersByTime(50);
        await waitFor(() => {
          expect(fetchWithAuth).toHaveBeenCalledTimes(2);
        });
      });

      const result1 = await promise1!;
      const result2 = await promise2!;

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
    });
  });
});
