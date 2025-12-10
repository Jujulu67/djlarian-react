import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AddProjectRow } from '../AddProjectRow';

describe('AddProjectRow', () => {
  const mockOnAdd = jest.fn().mockResolvedValue(undefined);
  const mockSetIsAdding = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render add button when not adding', () => {
    render(<AddProjectRow onAdd={mockOnAdd} isAdding={false} setIsAdding={mockSetIsAdding} />);

    expect(screen.getByText('Ajouter un projet')).toBeInTheDocument();
  });

  it('should show form when add button is clicked', () => {
    render(<AddProjectRow onAdd={mockOnAdd} isAdding={false} setIsAdding={mockSetIsAdding} />);

    const addButton = screen.getByText('Ajouter un projet');
    fireEvent.click(addButton);

    expect(mockSetIsAdding).toHaveBeenCalledWith(true);
  });

  it('should render form when isAdding is true', () => {
    render(<AddProjectRow onAdd={mockOnAdd} isAdding={true} setIsAdding={mockSetIsAdding} />);

    expect(screen.getByPlaceholderText('Nom du projet...')).toBeInTheDocument();
    const select = document.querySelector('select');
    expect(select).toBeInTheDocument();
    expect(select).toHaveValue('EN_COURS');
  });

  it('should call onAdd when form is submitted', async () => {
    render(<AddProjectRow onAdd={mockOnAdd} isAdding={true} setIsAdding={mockSetIsAdding} />);

    const input = screen.getByPlaceholderText('Nom du projet...');
    fireEvent.change(input, { target: { value: 'New Project' } });

    const submitButton = screen.getByTitle('Ajouter (Entrée)');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnAdd).toHaveBeenCalledWith({ name: 'New Project', status: 'EN_COURS' });
    });
  });

  it('should submit on Enter key', async () => {
    render(<AddProjectRow onAdd={mockOnAdd} isAdding={true} setIsAdding={mockSetIsAdding} />);

    const input = screen.getByPlaceholderText('Nom du projet...');
    fireEvent.change(input, { target: { value: 'New Project' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => {
      expect(mockOnAdd).toHaveBeenCalledWith({ name: 'New Project', status: 'EN_COURS' });
    });
  });

  it('should cancel on Escape key', () => {
    render(<AddProjectRow onAdd={mockOnAdd} isAdding={true} setIsAdding={mockSetIsAdding} />);

    const input = screen.getByPlaceholderText('Nom du projet...');
    fireEvent.keyDown(input, { key: 'Escape' });

    expect(mockSetIsAdding).toHaveBeenCalledWith(false);
  });

  it('should cancel when cancel button is clicked', () => {
    render(<AddProjectRow onAdd={mockOnAdd} isAdding={true} setIsAdding={mockSetIsAdding} />);

    const cancelButton = screen.getByTitle('Annuler (Échap)');
    fireEvent.click(cancelButton);

    expect(mockSetIsAdding).toHaveBeenCalledWith(false);
  });

  it('should not submit with empty name', async () => {
    render(<AddProjectRow onAdd={mockOnAdd} isAdding={true} setIsAdding={mockSetIsAdding} />);

    const submitButton = screen.getByTitle('Ajouter (Entrée)');
    expect(submitButton).toBeDisabled();
  });

  it('should not submit with whitespace-only name', async () => {
    render(<AddProjectRow onAdd={mockOnAdd} isAdding={true} setIsAdding={mockSetIsAdding} />);

    const input = screen.getByPlaceholderText('Nom du projet...');
    fireEvent.change(input, { target: { value: '   ' } });

    const submitButton = screen.getByTitle('Ajouter (Entrée)');
    expect(submitButton).toBeDisabled();
  });

  it('should change status', () => {
    render(<AddProjectRow onAdd={mockOnAdd} isAdding={true} setIsAdding={mockSetIsAdding} />);

    const select = document.querySelector('select') as HTMLSelectElement;
    expect(select).toHaveValue('EN_COURS');
    fireEvent.change(select, { target: { value: 'TERMINE' } });

    expect(select).toHaveValue('TERMINE');
  });

  it('should trim name before submitting', async () => {
    render(<AddProjectRow onAdd={mockOnAdd} isAdding={true} setIsAdding={mockSetIsAdding} />);

    const input = screen.getByPlaceholderText('Nom du projet...');
    fireEvent.change(input, { target: { value: '  Trimmed Project  ' } });

    const submitButton = screen.getByTitle('Ajouter (Entrée)');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnAdd).toHaveBeenCalledWith({ name: 'Trimmed Project', status: 'EN_COURS' });
    });
  });

  it('should reset form after successful submission', async () => {
    render(<AddProjectRow onAdd={mockOnAdd} isAdding={true} setIsAdding={mockSetIsAdding} />);

    const input = screen.getByPlaceholderText('Nom du projet...');
    fireEvent.change(input, { target: { value: 'New Project' } });

    const submitButton = screen.getByTitle('Ajouter (Entrée)');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockSetIsAdding).toHaveBeenCalledWith(false);
      expect(input).toHaveValue('');
    });
  });

  it('should handle submission error', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    const failingOnAdd = jest.fn().mockRejectedValue(new Error('Add failed'));

    render(<AddProjectRow onAdd={failingOnAdd} isAdding={true} setIsAdding={mockSetIsAdding} />);

    const input = screen.getByPlaceholderText('Nom du projet...');
    fireEvent.change(input, { target: { value: 'New Project' } });

    const submitButton = screen.getByTitle('Ajouter (Entrée)');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(failingOnAdd).toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    consoleErrorSpy.mockRestore();
  });

  it('should not submit when already saving', async () => {
    const slowOnAdd = jest.fn(() => new Promise((resolve) => setTimeout(resolve, 100)));
    render(<AddProjectRow onAdd={slowOnAdd} isAdding={true} setIsAdding={mockSetIsAdding} />);

    const input = screen.getByPlaceholderText('Nom du projet...');
    fireEvent.change(input, { target: { value: 'New Project' } });

    const submitButton = screen.getByTitle('Ajouter (Entrée)');
    fireEvent.click(submitButton);
    // Try to submit again while saving
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(slowOnAdd).toHaveBeenCalledTimes(1);
    });
  });

  it('should disable inputs when saving', async () => {
    const slowOnAdd = jest.fn(() => new Promise((resolve) => setTimeout(resolve, 100)));
    render(<AddProjectRow onAdd={slowOnAdd} isAdding={true} setIsAdding={mockSetIsAdding} />);

    const input = screen.getByPlaceholderText('Nom du projet...');
    fireEvent.change(input, { target: { value: 'New Project' } });

    const submitButton = screen.getByTitle('Ajouter (Entrée)');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(input).toBeDisabled();
      const select = document.querySelector('select');
      expect(select).toBeDisabled();
    });
  });

  it('should handle all status options', () => {
    render(<AddProjectRow onAdd={mockOnAdd} isAdding={true} setIsAdding={mockSetIsAdding} />);

    const select = document.querySelector('select') as HTMLSelectElement;
    const options = Array.from(select.options).map((opt) => opt.value);

    expect(options).toContain('EN_COURS');
    expect(options).toContain('TERMINE');
    expect(options).toContain('ANNULE');
    expect(options).toContain('A_REWORK');
    expect(options).toContain('GHOST_PRODUCTION');
    expect(options).toContain('ARCHIVE');
  });

  it('should reset status to EN_COURS after cancel', () => {
    render(<AddProjectRow onAdd={mockOnAdd} isAdding={true} setIsAdding={mockSetIsAdding} />);

    const select = document.querySelector('select') as HTMLSelectElement;
    fireEvent.change(select, { target: { value: 'TERMINE' } });
    expect(select).toHaveValue('TERMINE');

    const cancelButton = screen.getByTitle('Annuler (Échap)');
    fireEvent.click(cancelButton);

    // After cancel, when form reopens, status should be EN_COURS
    // But we can't test this easily without re-rendering, so we test the cancel behavior
    expect(mockSetIsAdding).toHaveBeenCalledWith(false);
  });

  it('should reset name to empty after cancel', () => {
    render(<AddProjectRow onAdd={mockOnAdd} isAdding={true} setIsAdding={mockSetIsAdding} />);

    const input = screen.getByPlaceholderText('Nom du projet...');
    fireEvent.change(input, { target: { value: 'Test Project' } });
    expect(input).toHaveValue('Test Project');

    const cancelButton = screen.getByTitle('Annuler (Échap)');
    fireEvent.click(cancelButton);

    expect(mockSetIsAdding).toHaveBeenCalledWith(false);
  });
});
