import { renderHook, act, waitFor } from '@testing-library/react';
import { useSlotMachine } from '../useSlotMachine';
import { fetchWithAuth } from '@/lib/api/fetchWithAuth';
import { toast } from 'sonner';

// Mock dependencies
jest.mock('next-auth/react', () => ({
  signOut: jest.fn(),
}));

jest.mock('@/lib/api/fetchWithAuth');
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

const mockFetchWithAuth = fetchWithAuth as jest.MockedFunction<typeof fetchWithAuth>;
const mockToast = toast as jest.Mocked<typeof toast>;

describe('useSlotMachine', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('refreshStatus', () => {
    it('should fetch and set status successfully', async () => {
      const mockStatus = {
        tokens: 10,
        totalSpins: 5,
        totalWins: 2,
      };

      mockFetchWithAuth.mockResolvedValue({
        ok: true,
        json: async () => ({ data: mockStatus }),
      } as Response);

      const { result } = renderHook(() => useSlotMachine());

      await act(async () => {
        await result.current.refreshStatus();
      });

      expect(result.current.status).toEqual(mockStatus);
      expect(result.current.isLoading).toBe(false);
    });

    it('should handle fetch error gracefully', async () => {
      mockFetchWithAuth.mockResolvedValue({
        ok: false,
        json: async () => ({ error: 'Test error' }),
      } as Response);

      const { result } = renderHook(() => useSlotMachine());

      await act(async () => {
        await result.current.refreshStatus();
      });

      expect(result.current.status).toBeNull();
      expect(result.current.isLoading).toBe(false);
    });

    it('should reset sessionSpent on refresh', async () => {
      const mockStatus = {
        tokens: 10,
        totalSpins: 5,
        totalWins: 2,
      };

      mockFetchWithAuth.mockResolvedValue({
        ok: true,
        json: async () => ({ data: mockStatus }),
      } as Response);

      const { result } = renderHook(() => useSlotMachine());

      // Note: sessionSpent is not directly settable, it's internal state
      // We test that it resets on refreshStatus

      await act(async () => {
        await result.current.refreshStatus();
      });

      expect(result.current.sessionSpent).toBe(0);
    });
  });

  describe('spin', () => {
    it('should not spin if already spinning', async () => {
      const mockStatus = {
        tokens: 10,
        totalSpins: 5,
        totalWins: 2,
      };

      mockFetchWithAuth.mockResolvedValue({
        ok: true,
        json: async () => ({ data: mockStatus }),
      } as Response);

      const { result } = renderHook(() => useSlotMachine());

      await act(async () => {
        await result.current.refreshStatus();
      });

      // Start first spin
      act(() => {
        result.current.spin();
      });

      // Try to spin again while spinning
      const secondSpinResult = await act(async () => {
        return await result.current.spin();
      });

      expect(secondSpinResult).toBeNull();
    });

    it('should not spin if insufficient tokens', async () => {
      const mockStatus = {
        tokens: 2, // Less than 3 required
        totalSpins: 5,
        totalWins: 2,
      };

      mockFetchWithAuth.mockResolvedValue({
        ok: true,
        json: async () => ({ data: mockStatus }),
      } as Response);

      const { result } = renderHook(() => useSlotMachine());

      await act(async () => {
        await result.current.refreshStatus();
      });

      const spinResult = await act(async () => {
        return await result.current.spin();
      });

      expect(spinResult).toBeNull();
    });

    it('should handle successful spin with TOKENS reward', async () => {
      const mockStatus = {
        tokens: 10,
        totalSpins: 5,
        totalWins: 2,
      };

      const mockSpinResult = {
        isWin: true,
        rewardType: 'TOKENS' as const,
        rewardAmount: 5,
        message: 'You won 5 tokens!',
      };

      mockFetchWithAuth
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: mockStatus }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: mockSpinResult }),
        } as Response);

      const { result } = renderHook(() => useSlotMachine());

      await act(async () => {
        await result.current.refreshStatus();
      });

      await act(async () => {
        await result.current.spin();
      });

      // Fast-forward timers to match animation duration (3600ms in the hook)
      act(() => {
        jest.advanceTimersByTime(3600);
      });

      await waitFor(() => {
        expect(result.current.isSpinning).toBe(false);
        expect(result.current.lastResult).toEqual(mockSpinResult);
      });

      // Should have deducted 3 tokens and added 5 reward tokens = net +2
      expect(result.current.status?.tokens).toBe(12);
      expect(mockToast.success).toHaveBeenCalledWith('You won 5 tokens!');
    });

    it('should handle spin with non-TOKENS reward', async () => {
      const mockStatus = {
        tokens: 10,
        totalSpins: 5,
        totalWins: 2,
      };

      const mockSpinResult = {
        isWin: true,
        rewardType: 'QUEUE_SKIP' as const,
        rewardAmount: 1,
        message: 'You won a queue skip!',
      };

      mockFetchWithAuth
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: mockStatus }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: mockSpinResult }),
        } as Response);

      const { result } = renderHook(() => useSlotMachine());

      await act(async () => {
        await result.current.refreshStatus();
      });

      await act(async () => {
        await result.current.spin();
      });

      // Advance timers to match animation duration (3600ms in the hook)
      act(() => {
        jest.advanceTimersByTime(3600);
      });

      await waitFor(() => {
        expect(result.current.pendingReward).toEqual({
          rewardType: 'QUEUE_SKIP',
          rewardAmount: 1,
        });
      });

      expect(mockToast.success).toHaveBeenCalledWith('You won a queue skip!', {
        duration: 5000,
      });

      // L'item est octroyé par le serveur pendant le tirage : aucun appel de réclamation,
      // mais le statut est rafraîchi
      const calledUrls = mockFetchWithAuth.mock.calls.map(([url]) => url);
      expect(calledUrls).not.toContain('/api/slot-machine/claim-reward');
      expect(calledUrls.filter((url) => url === '/api/slot-machine/status')).toHaveLength(2);
    });

    it('should dismiss the won reward locally without any request', async () => {
      const mockStatus = { tokens: 10, totalSpins: 5, totalWins: 2 };
      mockFetchWithAuth
        .mockResolvedValueOnce({ ok: true, json: async () => ({ data: mockStatus }) } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: { isWin: true, rewardType: 'ETERNAL_TICKET', rewardAmount: 1, message: 'ET' },
          }),
        } as Response)
        .mockResolvedValue({ ok: true, json: async () => ({ data: mockStatus }) } as Response);

      const { result } = renderHook(() => useSlotMachine());

      await act(async () => {
        await result.current.refreshStatus();
      });
      await act(async () => {
        await result.current.spin();
      });
      act(() => {
        jest.advanceTimersByTime(3600);
      });
      await waitFor(() => {
        expect(result.current.pendingReward).not.toBeNull();
      });

      const callsBefore = mockFetchWithAuth.mock.calls.length;
      act(() => {
        result.current.dismissReward();
      });

      expect(result.current.pendingReward).toBeNull();
      expect(mockFetchWithAuth.mock.calls).toHaveLength(callsBefore);
    });
  });

  describe('spinMultiple', () => {
    it('should show won items from the batch without calling claim-reward', async () => {
      const mockStatus = { tokens: 100, totalSpins: 0, totalWins: 0 };
      mockFetchWithAuth
        .mockResolvedValueOnce({ ok: true, json: async () => ({ data: mockStatus }) } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: {
              symbols: [],
              rewardType: null,
              rewardAmount: 0,
              isWin: false,
              message: '',
              results: [],
              summary: {
                totalSpins: 5,
                totalWins: 2,
                totalTokensWon: 150,
                queueSkips: 1,
                eternalTickets: 1,
                netProfit: 135,
                winRate: 40,
              },
            },
          }),
        } as Response)
        .mockResolvedValue({ ok: true, json: async () => ({ data: mockStatus }) } as Response);

      const { result } = renderHook(() => useSlotMachine());

      await act(async () => {
        await result.current.refreshStatus();
      });
      await act(async () => {
        await result.current.spinMultiple(5);
      });

      expect(result.current.pendingReward).toEqual({ rewardType: 'QUEUE_SKIP', rewardAmount: 1 });

      act(() => {
        jest.advanceTimersByTime(3600);
      });

      const calledUrls = mockFetchWithAuth.mock.calls.map(([url]) => url);
      expect(calledUrls).not.toContain('/api/slot-machine/claim-reward');
      expect(calledUrls).toContain('/api/slot-machine/spin-batch');
    });
  });
});
