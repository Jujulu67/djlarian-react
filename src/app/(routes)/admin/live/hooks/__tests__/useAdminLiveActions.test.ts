import { renderHook, act, waitFor } from '@testing-library/react';
import { useAdminLiveActions } from '../useAdminLiveActions';
import { toast } from 'sonner';
import { calculateTicketWeight, calculateMultiplier } from '@/lib/live/calculations';

// Mock dependencies
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  },
}));

jest.mock('@/lib/live/calculations', () => ({
  calculateTicketWeight: jest.fn(() => 10),
  calculateMultiplier: jest.fn(() => 1.5),
}));

// Mock global fetch
global.fetch = jest.fn();

// Mock clipboard
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn(),
  },
});

// Mock URL
global.URL.createObjectURL = jest.fn(() => 'blob:url');
global.URL.revokeObjectURL = jest.fn();

// Mock confirm
window.confirm = jest.fn(() => true);

describe('useAdminLiveActions', () => {
  const mockSubmissions = [
    {
      id: 'sub-1',
      isRolled: false,
      isPinned: false,
      createdAt: new Date().toISOString(),
      User: {
        id: 'user-1',
        name: 'User 1',
        UserTicket: [],
        UserLiveItem: [],
      },
    },
    {
      id: 'sub-2',
      isRolled: true,
      isPinned: false,
      createdAt: new Date().toISOString(),
      User: {
        id: 'user-2',
        name: 'User 2',
        UserTicket: [],
        UserLiveItem: [],
      },
    },
  ];

  const mockUpdateSubmissionRolled = jest.fn();
  const mockUpdateSubmissionPinned = jest.fn();
  const mockFetchSubmissions = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ data: {} }),
    });
  });

  it('loads settings on mount', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: {
          downloadsEnabled: false,
          trackSubmissions: false,
          koolKids: true,
          genreBlend: false,
        },
      }),
    });

    const { result } = renderHook(() => useAdminLiveActions());

    await waitFor(() => {
      expect(result.current.actions).toEqual({
        downloadsEnabled: false,
        trackSubmissions: false,
        koolKids: true,
        genreBlend: false,
      });
    });

    expect(global.fetch).toHaveBeenCalledWith('/api/admin/live/settings');
  });

  it('updates action settings', async () => {
    const { result } = renderHook(() => useAdminLiveActions());

    await act(async () => {
      await result.current.updateAction('downloadsEnabled', false);
    });

    expect(result.current.actions.downloadsEnabled).toBe(false);
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/admin/live/settings',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ key: 'downloadsEnabled', value: false }),
      })
    );
  });

  it('handles roll random', async () => {
    const { result } = renderHook(() =>
      useAdminLiveActions(
        mockSubmissions as any,
        mockUpdateSubmissionRolled,
        mockUpdateSubmissionPinned,
        mockFetchSubmissions
      )
    );

    await act(async () => {
      await result.current.rollRandom();
    });

    expect(result.current.isWheelModalOpen).toBe(true);
    expect(result.current.selectedSubmissions).toHaveLength(1); // Only non-rolled
    expect(result.current.selectedSubmissions[0].id).toBe('sub-1');
    expect(calculateTicketWeight).toHaveBeenCalled();
    expect(calculateMultiplier).toHaveBeenCalled();
  });

  it('handles wheel selection complete', async () => {
    mockUpdateSubmissionPinned.mockResolvedValue(true);
    mockUpdateSubmissionRolled.mockResolvedValue(true);

    const { result } = renderHook(() =>
      useAdminLiveActions(
        mockSubmissions as any,
        mockUpdateSubmissionRolled,
        mockUpdateSubmissionPinned,
        mockFetchSubmissions
      )
    );

    // First open modal to set state (though handleWheelSelectionComplete takes ID directly)
    // But we need to ensure internal state is consistent if it relies on it?
    // Actually handleWheelSelectionComplete uses 'submissions' prop.

    await act(async () => {
      await result.current.handleWheelSelectionComplete('sub-1');
    });

    expect(mockUpdateSubmissionPinned).toHaveBeenCalledWith('sub-1', true);
    expect(mockUpdateSubmissionRolled).toHaveBeenCalledWith('sub-1', true);
    expect(mockFetchSubmissions).toHaveBeenCalled();
    expect(toast.success).toHaveBeenCalledWith(expect.stringContaining('sélectionnée et pinée'));
  });

  it('handles download all', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        // for loadSettings
        ok: true,
        json: async () => ({ data: {} }),
      })
      .mockResolvedValueOnce({
        // for downloadAll
        ok: true,
        blob: async () => new Blob(['zip content']),
      });

    const { result } = renderHook(() => useAdminLiveActions());

    // Wait for loadSettings to complete
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));

    await act(async () => {
      await result.current.downloadAll();
    });

    expect(global.fetch).toHaveBeenCalledWith('/api/admin/live/submissions/download-all');
    expect(global.URL.createObjectURL).toHaveBeenCalled();
    expect(toast.success).toHaveBeenCalledWith('Téléchargement terminé !');
  });

  it('handles purge all submissions', async () => {
    const { result } = renderHook(() =>
      useAdminLiveActions([], undefined, undefined, mockFetchSubmissions)
    );

    await act(async () => {
      await result.current.purgeAllSubmissions();
    });

    expect(global.fetch).toHaveBeenCalledWith('/api/admin/live/submissions/purge', {
      method: 'DELETE',
    });
    expect(mockFetchSubmissions).toHaveBeenCalled();
    expect(toast.success).toHaveBeenCalledWith('Toutes les soumissions ont été supprimées');
  });

  it('copies names to clipboard', async () => {
    const { result } = renderHook(() => useAdminLiveActions(mockSubmissions as any));

    await act(async () => {
      await result.current.getAllNames();
    });

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(expect.stringContaining('User 1'));
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(expect.stringContaining('User 2'));
  });
});
