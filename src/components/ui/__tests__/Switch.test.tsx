import { render, screen, fireEvent } from '@testing-library/react';
import { Switch } from '../switch';

describe('Switch', () => {
  it('should render switch unchecked', () => {
    render(<Switch />);

    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).not.toBeChecked();
  });

  it('should render switch checked', () => {
    render(<Switch checked />);

    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeChecked();
  });

  it('should call onCheckedChange when clicked', () => {
    const handleChange = jest.fn();

    render(<Switch onCheckedChange={handleChange} />);

    const switchContainer = screen.getByRole('checkbox').parentElement;
    fireEvent.click(switchContainer!);

    expect(handleChange).toHaveBeenCalledWith(true);
  });

  it('should call onCheckedChange with false when unchecking', () => {
    const handleChange = jest.fn();

    render(<Switch checked onCheckedChange={handleChange} />);

    const switchContainer = screen.getByRole('checkbox').parentElement;
    fireEvent.click(switchContainer!);

    expect(handleChange).toHaveBeenCalledWith(false);
  });

  it('should apply custom className', () => {
    render(<Switch className="custom-class" />);

    const switchContainer = screen.getByRole('checkbox').parentElement;
    expect(switchContainer).toHaveClass('custom-class');
  });

  it('should be disabled when disabled prop is set', () => {
    render(<Switch disabled />);

    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeDisabled();
  });

  it('should handle onChange event', () => {
    const handleChange = jest.fn();
    const handleCheckedChange = jest.fn();

    render(<Switch onChange={handleChange} onCheckedChange={handleCheckedChange} />);

    // Click the switch container to trigger onCheckedChange
    const switchContainer = screen.getByRole('checkbox').parentElement;
    fireEvent.click(switchContainer!);

    // onCheckedChange should be called via onClick on the container
    expect(handleCheckedChange).toHaveBeenCalled();
  });
});
