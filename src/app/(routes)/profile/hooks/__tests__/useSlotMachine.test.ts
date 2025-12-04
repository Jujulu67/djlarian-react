import { renderHook, act, waitFor } from '@testing-library/react';
import { useSlotMachine } from '../useSlotMachine';
import { fetchWithAuth } from '@/lib/api/fetchWithAuth';
import { toast } from 'react-hot-toast';

// Mock dependencies
jest.mock('next-auth/react', () => ({
  signOut: jest.fn(),
}));

jest.mock('@/lib/api/fetchWithAuth');
jest.mock('react-hot-toast', () => ({
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

      // Fast-forward timers
      act(() => {
        jest.advanceTimersByTime(2000);
      });

      await waitFor(() => {
        expect(result.current.lastResult).toEqual(mockSpinResult);
        expect(result.current.isSpinning).toBe(false);
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
        rewardType: 'ITEM' as const,
        rewardAmount: 1,
        message: 'You won an item!',
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

      act(() => {
        jest.advanceTimersByTime(2000);
      });

      await waitFor(() => {
        expect(result.current.pendingReward).toEqual({
          rewardType: 'ITEM',
          rewardAmount: 1,
        });
      });

      expect(mockToast.success).toHaveBeenCalledWith('You won an item!', {
        duration: 5000,
      });
    });
  });
});
