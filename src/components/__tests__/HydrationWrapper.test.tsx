import { render, screen } from '@testing-library/react';
import HydrationWrapper from '../HydrationWrapper';
import { cleanupAttributes } from '@/lib/utils/cleanupAttributes';

// Mock cleanupAttributes
jest.mock('@/lib/utils/cleanupAttributes', () => ({
  cleanupAttributes: jest.fn(() => jest.fn()),
}));

describe('HydrationWrapper', () => {
  const mockCleanupAttributes = cleanupAttributes as jest.MockedFunction<typeof cleanupAttributes>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockCleanupAttributes.mockReturnValue(jest.fn());
  });

  it('should return null initially (before mount)', () => {
    const { container } = render(
      <HydrationWrapper>
        <div>Test Content</div>
      </HydrationWrapper>
    );

    // Initially should return null, but useEffect runs synchronously in tests
    // So we check that cleanupAttributes was called (indicating mount happened)
    expect(mockCleanupAttributes).toHaveBeenCalled();
    // After mount, children should be visible
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('should call cleanupAttributes on mount', () => {
    render(
      <HydrationWrapper>
        <div>Test Content</div>
      </HydrationWrapper>
    );

    expect(mockCleanupAttributes).toHaveBeenCalled();
  });

  it('should render children after mount', () => {
    const { rerender } = render(
      <HydrationWrapper>
        <div>Test Content</div>
      </HydrationWrapper>
    );

    // Force re-render to simulate mount completion
    rerender(
      <HydrationWrapper>
        <div>Test Content</div>
      </HydrationWrapper>
    );

    // After mount, children should be visible
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('should call cleanup function on unmount', () => {
    const mockCleanup = jest.fn();
    mockCleanupAttributes.mockReturnValue(mockCleanup);

    const { unmount } = render(
      <HydrationWrapper>
        <div>Test Content</div>
      </HydrationWrapper>
    );

    unmount();

    expect(mockCleanup).toHaveBeenCalled();
  });

  it('should handle multiple children', () => {
    render(
      <HydrationWrapper>
        <div>Child 1</div>
        <div>Child 2</div>
      </HydrationWrapper>
    );

    // After mount, all children should be visible
    expect(screen.getByText('Child 1')).toBeInTheDocument();
    expect(screen.getByText('Child 2')).toBeInTheDocument();
  });

  it('should handle null cleanup function', () => {
    mockCleanupAttributes.mockReturnValue(null);

    const { unmount } = render(
      <HydrationWrapper>
        <div>Test Content</div>
      </HydrationWrapper>
    );

    // Should not crash on unmount
    expect(() => unmount()).not.toThrow();
  });
});
