import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { Button } from '../Button';

describe('Button', () => {
  it('renders correctly', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button')).toHaveTextContent('Click me');
  });

  it('renders with different variants', () => {
    const { rerender } = render(<Button variant="default">Default</Button>);
    expect(screen.getByRole('button', { name: /Default/i })).toHaveClass('bg-purple-600');

    rerender(<Button variant="outline">Outline</Button>);
    expect(screen.getByRole('button', { name: /Outline/i })).toHaveClass('border-gray-700');
  });

  it('renders as disabled', () => {
    render(<Button disabled>Click me</Button>);
    expect(screen.getByRole('button', { name: /Click me/i })).toBeDisabled();
  });

  it('handles click events', async () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);

    await userEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
