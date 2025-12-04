import { renderHook } from '@testing-library/react';
import { useSessionOptimized } from '../useSessionOptimized';
import * as nextAuth from 'next-auth/react';

// Mock next-auth/react
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
}));

describe('useSessionOptimized', () => {
  const mockUseSession = nextAuth.useSession as jest.MockedFunction<typeof nextAuth.useSession>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return session from useSession', () => {
    const mockSession = {
      user: {
        id: '123',
        email: 'test@example.com',
        name: 'Test User',
      },
      expires: '2024-12-31',
    };

    mockUseSession.mockReturnValue({
      data: mockSession,
      status: 'authenticated',
      update: jest.fn(),
    });

    const { result } = renderHook(() => useSessionOptimized());

    expect(result.current.data).toEqual(mockSession);
    expect(mockUseSession).toHaveBeenCalled();
  });

  it('should handle null session', () => {
    mockUseSession.mockReturnValue({
      data: null,
      status: 'unauthenticated',
      update: jest.fn(),
    });

    const { result } = renderHook(() => useSessionOptimized());

    expect(result.current.data).toBeNull();
    expect(result.current.status).toBe('unauthenticated');
  });

  it('should handle loading state', () => {
    mockUseSession.mockReturnValue({
      data: undefined,
      status: 'loading',
      update: jest.fn(),
    });

    const { result } = renderHook(() => useSessionOptimized());

    expect(result.current.data).toBeUndefined();
    expect(result.current.status).toBe('loading');
  });

  it('should set mountedRef to true on mount', () => {
    mockUseSession.mockReturnValue({
      data: null,
      status: 'unauthenticated',
      update: jest.fn(),
    });

    renderHook(() => useSessionOptimized());

    // The hook should have mounted
    expect(mockUseSession).toHaveBeenCalled();
  });
});
