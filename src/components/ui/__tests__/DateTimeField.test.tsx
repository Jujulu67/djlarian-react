import { render, screen, fireEvent } from '@testing-library/react';
import { DateTimeField } from '../DateTimeField';

describe('DateTimeField', () => {
  const mockOnChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render datetime field', () => {
    render(<DateTimeField value="" onChange={mockOnChange} />);

    const input = document.querySelector('input[type="datetime-local"]');
    expect(input).toBeInTheDocument();
  });

  it('should display value', () => {
    render(<DateTimeField value="2024-01-01T12:00" onChange={mockOnChange} />);

    const input = document.querySelector('input[type="datetime-local"]') as HTMLInputElement;
    expect(input.value).toBe('2024-01-01T12:00');
  });

  it('should call onChange when value changes', () => {
    render(<DateTimeField value="" onChange={mockOnChange} />);

    const input = document.querySelector('input[type="datetime-local"]') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '2024-01-01T12:00' } });

    expect(mockOnChange).toHaveBeenCalled();
  });

  it('should apply custom className', () => {
    render(<DateTimeField value="" onChange={mockOnChange} className="custom-class" />);

    const input = document.querySelector('input[type="datetime-local"]') as HTMLInputElement;
    expect(input).toHaveClass('custom-class');
  });

  it('should show error styling when error prop is true', () => {
    render(<DateTimeField value="" onChange={mockOnChange} error />);

    const input = document.querySelector('input[type="datetime-local"]') as HTMLInputElement;
    expect(input).toHaveClass('border-red-500');
  });

  it('should be required when required prop is set', () => {
    render(<DateTimeField value="" onChange={mockOnChange} required />);

    const input = document.querySelector('input[type="datetime-local"]') as HTMLInputElement;
    expect(input).toBeRequired();
  });

  it('should have min attribute when min prop is provided', () => {
    render(<DateTimeField value="" onChange={mockOnChange} min="2024-01-01" />);

    const input = document.querySelector('input[type="datetime-local"]') as HTMLInputElement;
    expect(input).toHaveAttribute('min', '2024-01-01');
  });

  it('should use date type when type prop is date', () => {
    render(<DateTimeField value="" onChange={mockOnChange} type="date" />);

    const input = document.querySelector('input[type="date"]') as HTMLInputElement;
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('type', 'date');
  });
});
