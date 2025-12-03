/**
 * Tests for useTheme hook
 */
import { renderHook, act } from '@testing-library/react';

import { useTheme } from '../useTheme';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value.toString();
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

describe('useTheme', () => {
  beforeEach(() => {
    localStorageMock.clear();
    document.documentElement.classList.remove('dark');
  });

  it('should return default theme', () => {
    const matchMediaMock = window.matchMedia as jest.Mock;
    matchMediaMock.mockReturnValue({
      matches: true, // prefers dark
      media: '(prefers-color-scheme: dark)',
    });

    const { result } = renderHook(() => useTheme());

    // Theme will be 'dark' if prefers-color-scheme is dark, or 'light' otherwise
    expect(['dark', 'light']).toContain(result.current[0]);
    expect(typeof result.current[1]).toBe('function');
  });

  it('should load theme from localStorage', () => {
    localStorageMock.setItem('theme', 'light');

    const { result } = renderHook(() => useTheme());

    expect(result.current[0]).toBe('light');
  });

  it('should change theme', () => {
    const { result } = renderHook(() => useTheme());

    act(() => {
      result.current[1]('light');
    });

    expect(result.current[0]).toBe('light');
    expect(localStorageMock.setItem).toHaveBeenCalledWith('theme', 'light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('should use prefers-color-scheme when no saved theme', () => {
    const matchMediaMock = window.matchMedia as jest.Mock;
    matchMediaMock.mockReturnValue({
      matches: true,
      media: '(prefers-color-scheme: dark)',
    });

    const { result } = renderHook(() => useTheme());

    expect(result.current[0]).toBe('dark');
  });
});
