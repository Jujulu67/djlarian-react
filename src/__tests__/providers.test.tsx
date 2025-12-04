import React from 'react';
import { render } from '@testing-library/react';
import { SessionProvider } from 'next-auth/react';
import { ThemeProvider } from 'next-themes';

import { Providers } from '../providers';

// Mock next-auth
jest.mock('next-auth/react', () => ({
  SessionProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="session-provider">{children}</div>
  ),
}));

// Mock next-themes
jest.mock('next-themes', () => ({
  ThemeProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="theme-provider">{children}</div>
  ),
}));

// Mock ErrorBoundary
jest.mock('@/components/ErrorBoundary', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="error-boundary">{children}</div>
  ),
}));

// Mock console filters
jest.mock('@/lib/console-filters', () => ({
  setupConsoleFilters: jest.fn(() => jest.fn()),
}));

describe('Providers', () => {
  beforeEach(() => {
    // Mock MutationObserver
    global.MutationObserver = jest.fn().mockImplementation(() => ({
      observe: jest.fn(),
      disconnect: jest.fn(),
      takeRecords: jest.fn(),
    }));

    // Mock document.querySelectorAll
    document.querySelectorAll = jest.fn().mockReturnValue([]);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render children', () => {
    const { getByText } = render(
      <Providers>
        <div>Test Child</div>
      </Providers>
    );

    expect(getByText('Test Child')).toBeInTheDocument();
  });

  it('should wrap children with SessionProvider', () => {
    const { getByTestId } = render(
      <Providers>
        <div>Test Child</div>
      </Providers>
    );

    expect(getByTestId('session-provider')).toBeInTheDocument();
  });

  it('should wrap children with ThemeProvider', () => {
    const { getByTestId } = render(
      <Providers>
        <div>Test Child</div>
      </Providers>
    );

    expect(getByTestId('theme-provider')).toBeInTheDocument();
  });

  it('should wrap children with ErrorBoundary', () => {
    const { getByTestId } = render(
      <Providers>
        <div>Test Child</div>
      </Providers>
    );

    expect(getByTestId('error-boundary')).toBeInTheDocument();
  });

  it('should setup console filters on mount', () => {
    const { setupConsoleFilters } = require('@/lib/console-filters');

    render(
      <Providers>
        <div>Test Child</div>
      </Providers>
    );

    expect(setupConsoleFilters).toHaveBeenCalled();
  });

  it('should setup MutationObserver for bis_skin_checked attributes', () => {
    render(
      <Providers>
        <div>Test Child</div>
      </Providers>
    );

    expect(global.MutationObserver).toHaveBeenCalled();
  });
});
