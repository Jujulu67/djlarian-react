/**
 * Tests for LoadingSpinner component
 */
import { render, screen } from '@testing-library/react';

import LoadingSpinner from '../LoadingSpinner';

describe('LoadingSpinner', () => {
  it('should render with default props', () => {
    const { container } = render(<LoadingSpinner />);
    const spinner = container.querySelector('svg');
    expect(spinner).toBeInTheDocument();
  });

  it('should render with small size', () => {
    render(<LoadingSpinner size="sm" />);
    const container = document.querySelector('.w-4.h-4');
    expect(container).toBeInTheDocument();
  });

  it('should render with large size', () => {
    render(<LoadingSpinner size="lg" />);
    const container = document.querySelector('.w-12.h-12');
    expect(container).toBeInTheDocument();
  });

  it('should render with custom color', () => {
    render(<LoadingSpinner color="text-blue-500" />);
    const spinner = document.querySelector('.text-blue-500');
    expect(spinner).toBeInTheDocument();
  });
});
