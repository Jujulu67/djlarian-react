/**
 * Tests for ScrollToTop component
 */
import { render, screen, fireEvent } from '@testing-library/react';

import ScrollToTop from '../ScrollToTop';

// Mock window.scrollTo
const mockScrollTo = jest.fn();
Object.defineProperty(window, 'scrollTo', {
  writable: true,
  value: mockScrollTo,
});

// Mock requestAnimationFrame
global.requestAnimationFrame = jest.fn((cb) => {
  setTimeout(cb, 0);
  return 1;
});

describe('ScrollToTop', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(window, 'scrollY', {
      writable: true,
      configurable: true,
      value: 0,
    });
  });

  it('should not render when scrollY is less than 300', () => {
    Object.defineProperty(window, 'scrollY', { value: 100, writable: true });
    const { container } = render(<ScrollToTop />);
    expect(container.querySelector('button')).not.toBeInTheDocument();
  });

  it('should render when scrollY is greater than 300', () => {
    Object.defineProperty(window, 'scrollY', { value: 400, writable: true });
    render(<ScrollToTop />);

    // Trigger scroll event
    fireEvent.scroll(window);

    // Wait for state update
    setTimeout(() => {
      const button = screen.queryByLabelText('Retour en haut de la page');
      expect(button).toBeInTheDocument();
    }, 100);
  });

  it('should scroll to top when clicked', () => {
    Object.defineProperty(window, 'scrollY', { value: 400, writable: true });
    render(<ScrollToTop />);

    fireEvent.scroll(window);

    setTimeout(() => {
      const button = screen.getByLabelText('Retour en haut de la page');
      fireEvent.click(button);
      expect(mockScrollTo).toHaveBeenCalledWith({
        top: 0,
        behavior: 'smooth',
      });
    }, 100);
  });
});
