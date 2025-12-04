import { render, screen, fireEvent } from '@testing-library/react';
import NumberInput from '../NumberInput';

describe('NumberInput', () => {
  const mockOnChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render with label', () => {
    render(<NumberInput id="test" label="Test Label" value={0} onChange={mockOnChange} />);

    expect(screen.getByText('Test Label')).toBeInTheDocument();
  });

  it('should render input with value', () => {
    render(<NumberInput id="test" label="Test Label" value={42} onChange={mockOnChange} />);

    const input = screen.getByRole('spinbutton');
    expect(input).toHaveValue(42);
  });

  it('should call onChange when value changes', () => {
    render(<NumberInput id="test" label="Test Label" value={0} onChange={mockOnChange} />);

    const input = screen.getByRole('spinbutton');
    fireEvent.change(input, { target: { value: '10' } });

    expect(mockOnChange).toHaveBeenCalledWith(10);
  });

  it('should clamp value to min when provided', () => {
    render(<NumberInput id="test" label="Test Label" value={0} onChange={mockOnChange} min={5} />);

    const input = screen.getByRole('spinbutton');
    fireEvent.change(input, { target: { value: '3' } });

    expect(mockOnChange).toHaveBeenCalledWith(5);
  });

  it('should clamp value to max when provided', () => {
    render(<NumberInput id="test" label="Test Label" value={0} onChange={mockOnChange} max={10} />);

    const input = screen.getByRole('spinbutton');
    fireEvent.change(input, { target: { value: '15' } });

    expect(mockOnChange).toHaveBeenCalledWith(10);
  });

  it('should display unit when provided', () => {
    render(
      <NumberInput id="test" label="Test Label" value={0} onChange={mockOnChange} unit="px" />
    );

    expect(screen.getByText('px')).toBeInTheDocument();
  });

  it('should display description when provided', () => {
    render(
      <NumberInput
        id="test"
        label="Test Label"
        value={0}
        onChange={mockOnChange}
        desc="Test description"
      />
    );

    expect(screen.getByText('Test description')).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    const { container } = render(
      <NumberInput
        id="test"
        label="Test Label"
        value={0}
        onChange={mockOnChange}
        className="custom-class"
      />
    );

    const wrapper = container.firstChild;
    expect(wrapper).toHaveClass('custom-class');
  });

  it('should be disabled when disabled prop is set', () => {
    render(<NumberInput id="test" label="Test Label" value={0} onChange={mockOnChange} disabled />);

    const input = screen.getByRole('spinbutton');
    expect(input).toBeDisabled();
  });

  it('should handle empty input', () => {
    render(<NumberInput id="test" label="Test Label" value={10} onChange={mockOnChange} min={0} />);

    const input = screen.getByRole('spinbutton');
    fireEvent.change(input, { target: { value: '' } });

    expect(mockOnChange).toHaveBeenCalledWith(0);
  });
});
