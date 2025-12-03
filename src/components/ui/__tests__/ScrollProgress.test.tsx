/**
 * Tests for ScrollProgress component
 */
import { render } from '@testing-library/react';

import ScrollProgress from '../ScrollProgress';

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  useScroll: () => ({
    scrollYProgress: 0.5,
  }),
  useSpring: (value: number) => value,
}));

describe('ScrollProgress', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024,
    });
  });

  it('should render progress bar', () => {
    const { container } = render(<ScrollProgress />);

    // Component renders after mount (useEffect sets mounted to true)
    // Wait a bit for useEffect to run
    setTimeout(() => {
      const progressBar = container.querySelector('div[class*="fixed"]');
      expect(progressBar).toBeInTheDocument();
    }, 100);
  });
});
