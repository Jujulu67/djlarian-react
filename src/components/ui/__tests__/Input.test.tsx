import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { Input } from '../Input';

describe('Input Component', () => {
  it('renders correctly with default props', () => {
    render(<Input placeholder="Enter username" />);
    const inputElement = screen.getByPlaceholderText('Enter username');
    expect(inputElement).toBeInTheDocument();
    expect(inputElement).toHaveClass('border-gray-700'); // Vérifie la classe par défaut
  });

  it('handles user input', async () => {
    render(<Input />);
    const input = screen.getByRole('textbox');
    await userEvent.type(input, 'Hello World');
    expect(input).toHaveValue('Hello World');
  });

  it('forwards ref correctly', () => {
    const ref = jest.fn();
    render(<Input ref={ref} />);
    expect(ref).toHaveBeenCalled();
  });
});
