import { renderHook, act, waitFor } from '@testing-library/react';
import { useLiveInventory } from '../useLiveInventory';

// Mock fetchWithAuth
jest.mock('@/lib/api/fetchWithAuth', () => ({
  fetchWithAuth: jest.fn(),
}));

// Mock useBatchedInventory
jest.mock('../useBatchedInventory', () => ({
  useBatchedInventory: () => ({
    queueAction: jest.fn().mockResolvedValue({ success: true }),
  }),
}));

// Mock calculateTicketWeightClient
jest.mock('@/lib/live/calculations', () => ({
  calculateTicketWeightClient: jest.fn(() => 1),
}));

describe('useLiveInventory', () => {
  const mockFetchWithAuth = require('@/lib/api/fetchWithAuth').fetchWithAuth;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with loading state', () => {
    mockFetchWithAuth.mockResolvedValue({
      ok: true,
      json: async () => ({ data: null }),
    });

    const { result } = renderHook(() => useLiveInventory());

    expect(result.current.isLoading).toBe(true);
  });

  it('should load inventory', async () => {
    const mockInventory = {
      activatedItems: [],
      unactivatedItems: [],
      totalTickets: 1,
    };

    mockFetchWithAuth.mockResolvedValue({
      ok: true,
      json: async () => ({ data: mockInventory }),
    });

    const { result } = renderHook(() => useLiveInventory());

    await act(async () => {
      await result.current.loadInventory();
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.inventory).toEqual(mockInventory);
  });

  it('should handle load error', async () => {
    mockFetchWithAuth.mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Error loading' }),
    });

    const { result } = renderHook(() => useLiveInventory());

    await act(async () => {
      await result.current.loadInventory();
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBeTruthy();
  });

  it('should update item', async () => {
    const mockInventory = {
      activatedItems: [],
      unactivatedItems: [
        {
          id: 'item-1',
          itemId: 'item-1',
          quantity: 5,
          activatedQuantity: 0,
        },
      ],
      totalTickets: 1,
    };

    mockFetchWithAuth.mockResolvedValue({
      ok: true,
      json: async () => ({ data: mockInventory }),
    });

    const { result } = renderHook(() => useLiveInventory());

    await act(async () => {
      await result.current.loadInventory();
    });

    await waitFor(() => {
      expect(result.current.inventory).toBeTruthy();
    });

    await act(async () => {
      const updateResult = await result.current.updateItem({
        itemId: 'item-1',
        action: 'activate',
      });

      expect(updateResult.success).toBe(true);
    });
  });
});
