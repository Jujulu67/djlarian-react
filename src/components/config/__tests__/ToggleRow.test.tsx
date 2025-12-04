import { render, screen, fireEvent } from '@testing-library/react';
import ToggleRow from '../ToggleRow';

describe('ToggleRow', () => {
  const mockOnChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render with label', () => {
    render(<ToggleRow label="Test Label" value={false} onChange={mockOnChange} />);

    expect(screen.getByText('Test Label')).toBeInTheDocument();
  });

  it('should render with description', () => {
    render(
      <ToggleRow label="Test Label" desc="Test Description" value={false} onChange={mockOnChange} />
    );

    expect(screen.getByText('Test Description')).toBeInTheDocument();
  });

  it('should call onChange when switch is toggled', () => {
    render(<ToggleRow label="Test Label" value={false} onChange={mockOnChange} />);

    const switchElement = screen.getByRole('checkbox');
    fireEvent.click(switchElement);

    expect(mockOnChange).toHaveBeenCalledWith(true);
  });

  it('should show checked state', () => {
    render(<ToggleRow label="Test Label" value={true} onChange={mockOnChange} />);

    const switchElement = screen.getByRole('checkbox');
    expect(switchElement).toBeChecked();
  });

  it('should apply custom className', () => {
    const { container } = render(
      <ToggleRow
        label="Test Label"
        value={false}
        onChange={mockOnChange}
        className="custom-class"
      />
    );

    const row = container.firstChild;
    expect(row).toHaveClass('custom-class');
  });

  it('should be disabled when disabled prop is set', () => {
    render(<ToggleRow label="Test Label" value={false} onChange={mockOnChange} disabled />);

    const switchElement = screen.getByRole('checkbox');
    expect(switchElement).toBeDisabled();
  });

  it('should show disabled styling when disabled', () => {
    const { container } = render(
      <ToggleRow label="Test Label" value={false} onChange={mockOnChange} disabled />
    );

    const row = container.firstChild;
    expect(row).toHaveClass('opacity-50');
  });
});
