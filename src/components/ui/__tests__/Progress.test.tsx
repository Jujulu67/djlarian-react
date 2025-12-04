import { render, screen } from '@testing-library/react';
import { Progress } from '../progress';

describe('Progress', () => {
  it('should render progress bar', () => {
    render(<Progress value={50} />);

    const progress = screen.getByRole('progressbar');
    expect(progress).toBeInTheDocument();
  });

  it('should display correct value', () => {
    const { container } = render(<Progress value={75} />);

    const indicator =
      container.querySelector('[data-radix-progress-indicator]') ||
      container.querySelector('div[style*="translateX"]');
    expect(indicator).toBeInTheDocument();
    if (indicator) {
      expect(indicator).toHaveStyle({ transform: 'translateX(-25%)' });
    }
  });

  it('should handle zero value', () => {
    const { container } = render(<Progress value={0} />);

    const indicator =
      container.querySelector('[data-radix-progress-indicator]') ||
      container.querySelector('div[style*="translateX"]');
    expect(indicator).toBeInTheDocument();
    if (indicator) {
      expect(indicator).toHaveStyle({ transform: 'translateX(-100%)' });
    }
  });

  it('should handle 100% value', () => {
    const { container } = render(<Progress value={100} />);

    const indicator =
      container.querySelector('[data-radix-progress-indicator]') ||
      container.querySelector('div[style*="translateX"]');
    expect(indicator).toBeInTheDocument();
    if (indicator) {
      expect(indicator).toHaveStyle({ transform: 'translateX(-0%)' });
    }
  });

  it('should apply custom className', () => {
    render(<Progress value={50} className="custom-class" />);

    const progress = screen.getByRole('progressbar');
    expect(progress).toHaveClass('custom-class');
  });

  it('should handle undefined value', () => {
    const { container } = render(<Progress />);

    const indicator =
      container.querySelector('[data-radix-progress-indicator]') ||
      container.querySelector('div[style*="translateX"]');
    expect(indicator).toBeInTheDocument();
    if (indicator) {
      expect(indicator).toHaveStyle({ transform: 'translateX(-100%)' });
    }
  });
});
