import { render } from '@testing-library/react';
import ParticleVisualizer from '../ParticleVisualizer';

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

describe('ParticleVisualizer', () => {
  beforeEach(() => {
    // Mock window.devicePixelRatio
    Object.defineProperty(window, 'devicePixelRatio', {
      writable: true,
      configurable: true,
      value: 1,
    });
  });

  it('should render particle visualizer', () => {
    const { container } = render(<ParticleVisualizer />);
    const canvas = container.querySelector('canvas');
    expect(canvas).toBeInTheDocument();
  });

  it('should render multiple canvases', () => {
    const { container } = render(<ParticleVisualizer />);
    const canvases = container.querySelectorAll('canvas');
    expect(canvases.length).toBeGreaterThan(0);
  });

  it('should handle mouse events', () => {
    const { container } = render(<ParticleVisualizer />);
    const canvas = container.querySelector('canvas');

    if (canvas) {
      const mouseEvent = new MouseEvent('mousemove', {
        clientX: 100,
        clientY: 200,
      });
      canvas.dispatchEvent(mouseEvent);
    }

    expect(canvas).toBeInTheDocument();
  });
});
