import React from 'react';
import { render, screen } from '@testing-library/react';
import ErrorBoundary from '../ErrorBoundary';
import { logger } from '@/lib/logger';

// Mock dependencies
jest.mock('@sentry/nextjs', () => ({
  captureException: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
  },
}));

// Import after mocks
import * as Sentry from '@sentry/nextjs';

// Component that throws an error
const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>No error</div>;
};

describe('ErrorBoundary', () => {
  const originalError = console.error;
  const mockLoggerError = logger.error as jest.MockedFunction<typeof logger.error>;
  const mockSentryCaptureException = Sentry.captureException as jest.MockedFunction<
    typeof Sentry.captureException
  >;

  beforeEach(() => {
    jest.clearAllMocks();
    // Suppress console.error for error boundary tests
    console.error = jest.fn();
    process.env.NEXT_PUBLIC_SENTRY_DSN = 'test-dsn';
  });

  afterEach(() => {
    console.error = originalError;
    delete process.env.NEXT_PUBLIC_SENTRY_DSN;
  });

  it('should render children when there is no error', () => {
    render(
      <ErrorBoundary>
        <div>Test Content</div>
      </ErrorBoundary>
    );

    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('should render fallback UI when error occurs', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText(/Une erreur s'est produite/i)).toBeInTheDocument();
    expect(screen.getByText('Réessayer')).toBeInTheDocument();
  });

  it('should render custom fallback when provided', () => {
    render(
      <ErrorBoundary fallback={<div>Custom Fallback</div>}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Custom Fallback')).toBeInTheDocument();
    expect(screen.queryByText(/Une erreur s'est produite/i)).not.toBeInTheDocument();
  });

  it('should log error when caught', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(mockLoggerError).toHaveBeenCalled();
  });

  it('should send error to Sentry when DSN is configured', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(mockSentryCaptureException).toHaveBeenCalled();
  });

  it('should not send to Sentry when DSN is not configured', () => {
    delete process.env.NEXT_PUBLIC_SENTRY_DSN;

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(mockSentryCaptureException).not.toHaveBeenCalled();
  });

  it('should allow retry when button is clicked', () => {
    const { rerender } = render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    const retryButton = screen.getByText('Réessayer');
    expect(retryButton).toBeInTheDocument();

    // Click retry - should reset error state
    retryButton.click();

    // Re-render with no error to test reset
    rerender(
      <ErrorBoundary>
        <div>No error</div>
      </ErrorBoundary>
    );

    expect(screen.getByText('No error')).toBeInTheDocument();
  });
});
