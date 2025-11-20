// Mock des dépendances AVANT les imports
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
}));

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

import { renderHook, act, waitFor } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

import { useTracks } from '../useTracks';

jest.mock('react-hot-toast', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));
jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
  },
}));

// Mock fetch
global.fetch = jest.fn();

describe('useTracks', () => {
  const mockPush = jest.fn();
  const mockReplace = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
      replace: mockReplace,
    });
    (useSession as jest.Mock).mockReturnValue({
      data: { user: { role: 'ADMIN' } },
      status: 'authenticated',
    });
  });

  it('should redirect to login if unauthenticated', () => {
    (useSession as jest.Mock).mockReturnValue({
      data: null,
      status: 'unauthenticated',
    });

    renderHook(() => useTracks());

    expect(mockPush).toHaveBeenCalledWith('/login');
  });

  it('should redirect to home if not admin', () => {
    (useSession as jest.Mock).mockReturnValue({
      data: { user: { role: 'USER' } },
      status: 'authenticated',
    });

    renderHook(() => useTracks());

    expect(mockPush).toHaveBeenCalledWith('/');
  });

  it('should fetch tracks on mount when authenticated', async () => {
    const mockTracks = [
      { id: '1', title: 'Track 1', artist: 'Artist 1', type: 'single', platforms: {}, genre: [] },
    ];

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockTracks,
    });

    const { result } = renderHook(() => useTracks());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(global.fetch).toHaveBeenCalledWith('/api/music');
    expect(result.current.tracks).toEqual(mockTracks);
  });

  it('should filter tracks by search term', async () => {
    const mockTracks = [
      {
        id: '1',
        title: 'House Track',
        artist: 'Artist 1',
        type: 'single',
        platforms: {},
        genre: [],
      },
      {
        id: '2',
        title: 'Techno Track',
        artist: 'Artist 2',
        type: 'single',
        platforms: {},
        genre: [],
      },
    ];

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockTracks,
    });

    const { result } = renderHook(() => useTracks());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.setSearchTerm('House');
    });

    await waitFor(() => {
      expect(result.current.filteredTracks.length).toBe(1);
      expect(result.current.filteredTracks[0].title).toBe('House Track');
    });
  });
});
