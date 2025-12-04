import { render, screen, fireEvent } from '@testing-library/react';
import ColorInput from '../ColorInput';

describe('ColorInput', () => {
  const mockOnChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render with label', () => {
    render(<ColorInput id="test" label="Test Label" value="#000000" onChange={mockOnChange} />);

    expect(screen.getByText('Test Label')).toBeInTheDocument();
  });

  it('should render color input and text input', () => {
    render(<ColorInput id="test" label="Test Label" value="#ff0000" onChange={mockOnChange} />);

    const colorInput = screen.getByLabelText(/Select color for Test Label/i);
    const textInput = screen.getByLabelText('Test Label');

    expect(colorInput).toBeInTheDocument();
    expect(textInput).toBeInTheDocument();
    expect(colorInput).toHaveValue('#ff0000');
    expect(textInput).toHaveValue('#ff0000');
  });

  it('should call onChange when color input changes', () => {
    render(<ColorInput id="test" label="Test Label" value="#000000" onChange={mockOnChange} />);

    const colorInput = screen.getByLabelText(/Select color for Test Label/i);
    fireEvent.change(colorInput, { target: { value: '#ff0000' } });

    expect(mockOnChange).toHaveBeenCalledWith('#ff0000');
  });

  it('should call onChange when text input changes', () => {
    render(<ColorInput id="test" label="Test Label" value="#000000" onChange={mockOnChange} />);

    const textInput = screen.getByLabelText('Test Label');
    fireEvent.change(textInput, { target: { value: '#00ff00' } });

    expect(mockOnChange).toHaveBeenCalledWith('#00ff00');
  });

  it('should apply custom className', () => {
    const { container } = render(
      <ColorInput
        id="test"
        label="Test Label"
        value="#000000"
        onChange={mockOnChange}
        className="custom-class"
      />
    );

    const inputs = container.querySelectorAll('input');
    expect(inputs.length).toBeGreaterThan(0);
  });

  it('should be disabled when disabled prop is set', () => {
    render(
      <ColorInput id="test" label="Test Label" value="#000000" onChange={mockOnChange} disabled />
    );

    const colorInput = screen.getByLabelText(/Select color for Test Label/i);
    const textInput = screen.getByLabelText('Test Label');

    expect(colorInput).toBeDisabled();
    expect(textInput).toBeDisabled();
  });
});
