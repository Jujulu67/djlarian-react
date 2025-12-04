import { renderHook, act, waitFor } from '@testing-library/react';
import { useAdminLiveSubmissions } from '../useAdminLiveSubmissions';
import { fetchWithAuth } from '@/lib/api/fetchWithAuth';
import { LiveSubmissionStatus } from '@/types/live';

// Mock dependencies
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('@/lib/api/fetchWithAuth', () => ({
  fetchWithAuth: jest.fn(),
}));

// Mock types if needed, but we import the enum
// If enum import fails in test environment (due to path mapping or ts-jest), we might need to mock it or ensure paths are correct.
// Since we have tsconfig.test.json, paths should be fine.

describe('useAdminLiveSubmissions', () => {
  const mockSubmissions = [
    {
      id: 'sub-1',
      userId: 'user-1',
      fileName: 'test.mp3',
      fileUrl: 'http://example.com/test.mp3',
      title: 'Test Title',
      description: 'Test Description',
      status: 'PENDING',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isRolled: false,
      isPinned: false,
      User: {
        id: 'user-1',
        name: 'Test User',
        email: 'test@example.com',
        image: null,
        UserLiveItem: [],
        UserTicket: [],
      },
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (fetchWithAuth as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ data: mockSubmissions }),
    });
  });

  it('should fetch submissions on mount', async () => {
    const { result } = renderHook(() => useAdminLiveSubmissions());

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.submissions).toEqual(mockSubmissions);
    expect(fetchWithAuth).toHaveBeenCalledWith('/api/admin/live/submissions');
  });

  it('should handle fetch error', async () => {
    (fetchWithAuth as jest.Mock).mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => 'Internal Server Error',
    });

    const { result } = renderHook(() => useAdminLiveSubmissions());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toContain('Erreur 500');
    expect(result.current.submissions).toEqual([]);
  });

  it('should update submission status', async () => {
    const { result } = renderHook(() => useAdminLiveSubmissions());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    (fetchWithAuth as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });

    await act(async () => {
      const success = await result.current.updateSubmissionStatus(
        'sub-1',
        'APPROVED' as LiveSubmissionStatus
      );
      expect(success).toBe(true);
    });

    expect(fetchWithAuth).toHaveBeenCalledWith(
      '/api/admin/live/submissions/sub-1',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ status: 'APPROVED' }),
      })
    );

    // Should refetch submissions
    expect(fetchWithAuth).toHaveBeenCalledTimes(3); // Initial fetch + update + refetch
  });

  it('should update submission rolled status', async () => {
    const { result } = renderHook(() => useAdminLiveSubmissions());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    (fetchWithAuth as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });

    await act(async () => {
      const success = await result.current.updateSubmissionRolled('sub-1', true);
      expect(success).toBe(true);
    });

    expect(fetchWithAuth).toHaveBeenCalledWith(
      '/api/admin/live/submissions/sub-1',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ isRolled: true }),
      })
    );

    // Optimistic update check
    expect(result.current.submissions[0].isRolled).toBe(true);
  });

  it('should update submission pinned status', async () => {
    const { result } = renderHook(() => useAdminLiveSubmissions());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    (fetchWithAuth as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });

    await act(async () => {
      const success = await result.current.updateSubmissionPinned('sub-1', true);
      expect(success).toBe(true);
    });

    expect(fetchWithAuth).toHaveBeenCalledWith(
      '/api/admin/live/submissions/sub-1',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ isPinned: true }),
      })
    );

    // Should refetch submissions
    expect(fetchWithAuth).toHaveBeenCalledTimes(3); // Initial fetch + update + refetch
  });
});
