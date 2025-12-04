import { render, screen, fireEvent } from '@testing-library/react';
import { Select } from '../Select';

describe('Select', () => {
  const mockOptions = [
    { value: 'option1', label: 'Option 1' },
    { value: 'option2', label: 'Option 2' },
    { value: 'option3', label: 'Option 3' },
  ];

  it('should render select with options', () => {
    render(<Select options={mockOptions} />);

    expect(screen.getByRole('combobox')).toBeInTheDocument();
    expect(screen.getByText('Option 1')).toBeInTheDocument();
    expect(screen.getByText('Option 2')).toBeInTheDocument();
    expect(screen.getByText('Option 3')).toBeInTheDocument();
  });

  it('should handle value change', () => {
    const handleChange = jest.fn();
    render(<Select options={mockOptions} onChange={handleChange} />);

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'option2' } });

    expect(handleChange).toHaveBeenCalled();
  });

  it('should apply custom className', () => {
    render(<Select options={mockOptions} className="custom-class" />);

    const select = screen.getByRole('combobox');
    expect(select).toHaveClass('custom-class');
  });

  it('should be disabled when disabled prop is set', () => {
    render(<Select options={mockOptions} disabled />);

    const select = screen.getByRole('combobox');
    expect(select).toBeDisabled();
  });

  it('should have default value', () => {
    render(<Select options={mockOptions} defaultValue="option2" />);

    const select = screen.getByRole('combobox') as HTMLSelectElement;
    expect(select.value).toBe('option2');
  });
});
