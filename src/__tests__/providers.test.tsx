import { render, screen } from '@testing-library/react';
import { Providers } from '../providers';

// Mock dependencies
jest.mock('next-auth/react', () => ({
  SessionProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="session-provider">{children}</div>
  ),
}));

jest.mock('next-themes', () => ({
  ThemeProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="theme-provider">{children}</div>
  ),
}));

jest.mock('@/components/ErrorBoundary', () => {
  return {
    __esModule: true,
    default: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="error-boundary">{children}</div>
    ),
  };
});

jest.mock('@/lib/console-filters', () => ({
  setupConsoleFilters: jest.fn(() => jest.fn()),
}));

describe('Providers', () => {
  beforeEach(() => {
    // Mock document methods
    document.querySelectorAll = jest.fn(() => [] as any);
    if (!document.body) {
      document.body = document.createElement('body');
    }

    // Mock MutationObserver
    global.MutationObserver = jest.fn().mockImplementation(() => ({
      observe: jest.fn(),
      disconnect: jest.fn(),
    })) as any;
  });

  it('should render children with all providers', () => {
    render(
      <Providers>
        <div>Test Content</div>
      </Providers>
    );

    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('should setup console filters on mount', () => {
    const { setupConsoleFilters } = require('@/lib/console-filters');
    render(
      <Providers>
        <div>Test</div>
      </Providers>
    );

    expect(setupConsoleFilters).toHaveBeenCalled();
  });

  it('should setup MutationObserver for bis_skin_checked attributes', () => {
    render(
      <Providers>
        <div>Test</div>
      </Providers>
    );

    expect(MutationObserver).toHaveBeenCalled();
  });
});
