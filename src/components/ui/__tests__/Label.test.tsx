import { render, screen } from '@testing-library/react';
import { Label } from '../label';

describe('Label', () => {
  it('should render label with text', () => {
    render(<Label>Test Label</Label>);

    expect(screen.getByText('Test Label')).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    render(<Label className="custom-class">Test Label</Label>);

    const label = screen.getByText('Test Label');
    expect(label).toHaveClass('custom-class');
  });

  it('should forward htmlFor prop', () => {
    render(<Label htmlFor="test-input">Test Label</Label>);

    const label = screen.getByText('Test Label');
    expect(label).toHaveAttribute('for', 'test-input');
  });
});
