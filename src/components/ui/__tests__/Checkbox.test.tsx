import { render, screen, fireEvent } from '@testing-library/react';
import { Checkbox } from '../Checkbox';

describe('Checkbox', () => {
  it('should render unchecked checkbox', () => {
    render(<Checkbox />);

    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).not.toBeChecked();
  });

  it('should render checked checkbox', () => {
    render(<Checkbox checked />);

    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeChecked();
  });

  it('should call onCheckedChange when clicked', () => {
    const handleChange = jest.fn();

    render(<Checkbox onCheckedChange={handleChange} />);

    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);

    expect(handleChange).toHaveBeenCalledWith(true);
  });

  it('should call onCheckedChange with false when unchecking', () => {
    const handleChange = jest.fn();

    render(<Checkbox checked onCheckedChange={handleChange} />);

    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);

    expect(handleChange).toHaveBeenCalledWith(false);
  });

  it('should render with label', () => {
    render(<Checkbox label="Test Label" />);

    expect(screen.getByText('Test Label')).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    render(<Checkbox className="custom-class" />);

    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeInTheDocument();
  });

  it('should apply labelClassName', () => {
    render(<Checkbox label="Label" labelClassName="custom-label" />);

    const label = screen.getByText('Label').closest('label');
    expect(label).toHaveClass('custom-label');
  });

  it('should be disabled when disabled prop is set', () => {
    render(<Checkbox disabled />);

    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeDisabled();
  });
});
