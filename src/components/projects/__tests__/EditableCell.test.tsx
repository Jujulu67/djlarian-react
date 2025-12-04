import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { EditableCell } from '../EditableCell';

describe('EditableCell', () => {
  const mockOnSave = jest.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render text value', () => {
    render(<EditableCell value="Test Value" field="name" type="text" onSave={mockOnSave} />);

    expect(screen.getByText('Test Value')).toBeInTheDocument();
  });

  it('should render number value', () => {
    render(<EditableCell value={1000} field="streams" type="number" onSave={mockOnSave} />);

    // Numbers are formatted with toLocaleString('fr-FR'), so 1000 becomes "1 000"
    expect(screen.getByText(/1[\s\u00A0]000|1000/)).toBeInTheDocument();
  });

  it('should enter edit mode on click', () => {
    render(<EditableCell value="Test" field="name" type="text" onSave={mockOnSave} />);

    const cell = screen.getByText('Test');
    fireEvent.click(cell);

    const input = screen.getByDisplayValue('Test');
    expect(input).toBeInTheDocument();
  });

  it('should save on blur', async () => {
    render(<EditableCell value="Test" field="name" type="text" onSave={mockOnSave} />);

    const cell = screen.getByText('Test');
    fireEvent.click(cell);

    const input = screen.getByDisplayValue('Test');
    fireEvent.change(input, { target: { value: 'New Value' } });
    fireEvent.blur(input);

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith('name', 'New Value');
    });
  });

  it('should save on Enter key', async () => {
    render(<EditableCell value="Test" field="name" type="text" onSave={mockOnSave} />);

    const cell = screen.getByText('Test');
    fireEvent.click(cell);

    const input = screen.getByDisplayValue('Test');
    fireEvent.change(input, { target: { value: 'New Value' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalled();
    });
  });

  it('should cancel on Escape key', () => {
    render(<EditableCell value="Test" field="name" type="text" onSave={mockOnSave} />);

    const cell = screen.getByText('Test');
    fireEvent.click(cell);

    const input = screen.getByDisplayValue('Test');
    fireEvent.keyDown(input, { key: 'Escape' });

    expect(screen.getByText('Test')).toBeInTheDocument();
  });

  it('should render select type', () => {
    render(<EditableCell value="EN_COURS" field="status" type="select" onSave={mockOnSave} />);

    // Select renders as a select element, check that it exists and has the value
    const select = document.querySelector('select');
    expect(select).toBeInTheDocument();
    expect(select).toHaveValue('EN_COURS');
  });

  it('should render date type', () => {
    render(<EditableCell value="2024-01-01" field="releaseDate" type="date" onSave={mockOnSave} />);

    // Date is formatted as DD/MM/YY in French locale
    // So "2024-01-01" becomes "01/01/24"
    expect(screen.getByText(/01\/01\/24|01\/01\/2024/i)).toBeInTheDocument();
  });

  it('should handle null value', () => {
    render(<EditableCell value={null} field="name" type="text" onSave={mockOnSave} />);

    // When value is null, it shows the placeholder which defaults to "-"
    expect(screen.getByText(/-/)).toBeInTheDocument();
  });
});
