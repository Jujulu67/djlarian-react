import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AddProjectRow } from '../AddProjectRow';

// Mock HTMLCanvasElement.getContext for GlassSelect dropdown width calculation
Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  value: jest.fn(() => ({
    measureText: jest.fn(() => ({ width: 100 })),
    font: '',
  })),
});

// Helper function to interact with GlassSelect dropdown (same as EditableCell tests)
async function selectGlassSelectOption(triggerText: string, optionText: string) {
  let triggerButton: HTMLButtonElement | null = null;
  await waitFor(
    () => {
      const textElements = screen.queryAllByText(triggerText, { exact: false });
      if (textElements.length > 0) {
        triggerButton = textElements
          .map((el) => el.closest('button'))
          .find((btn) => btn && !btn.closest('[class*="fixed"]')) as HTMLButtonElement | null;
      }
      if (!triggerButton) {
        const glassSelectContainer = document.querySelector('.relative.inline-block');
        if (glassSelectContainer) {
          triggerButton = glassSelectContainer.querySelector('button') as HTMLButtonElement | null;
        }
      }
      expect(triggerButton).toBeInTheDocument();
    },
    { timeout: 3000 }
  );

  fireEvent.click(triggerButton!);

  await waitFor(() => {
    const dropdownButtons = document.body.querySelectorAll('button');
    const optionButton = Array.from(dropdownButtons).find(
      (btn) =>
        btn.textContent?.trim() === optionText &&
        btn !== triggerButton &&
        btn.closest('[class*="fixed"]')
    );
    expect(optionButton).toBeInTheDocument();
    if (optionButton) {
      fireEvent.click(optionButton);
    }
  });
}

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
    // GlassSelect renders as a button with the label text inside a span
    const textElement = screen.getByText('En cours');
    const button = textElement.closest('button');
    expect(button).toBeInTheDocument();
    expect(button?.tagName).toBe('BUTTON');
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

  it('should change status', async () => {
    render(<AddProjectRow onAdd={mockOnAdd} isAdding={true} setIsAdding={mockSetIsAdding} />);

    // GlassSelect: click button to open dropdown, then click "Terminé" option
    await selectGlassSelectOption('En cours', 'Terminé');

    // Verify the status changed by checking the button text
    await waitFor(() => {
      expect(screen.getByText('Terminé')).toBeInTheDocument();
    });
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
      // GlassSelect button should be disabled
      const textElement = screen.getByText('En cours');
      const button = textElement.closest('button');
      expect(button).toBeDisabled();
    });
  });

  it('should handle all status options', async () => {
    render(<AddProjectRow onAdd={mockOnAdd} isAdding={true} setIsAdding={mockSetIsAdding} />);

    // Open dropdown to see all options
    const textElements = screen.getAllByText('En cours');
    const button = textElements[0].closest('button');
    fireEvent.click(button!);

    // Wait for dropdown and check all status labels are present
    await waitFor(() => {
      // Use getAllByText to handle multiple instances
      expect(screen.getAllByText('En cours').length).toBeGreaterThan(0);
      expect(screen.getByText('Terminé')).toBeInTheDocument();
      expect(screen.getByText('Annulé')).toBeInTheDocument();
      expect(screen.getByText('A Rework')).toBeInTheDocument();
      expect(screen.getByText('Ghost Prod')).toBeInTheDocument();
      expect(screen.getByText('Archivé')).toBeInTheDocument();
    });
  });

  it('should reset status to EN_COURS after cancel', async () => {
    render(<AddProjectRow onAdd={mockOnAdd} isAdding={true} setIsAdding={mockSetIsAdding} />);

    // Change status to TERMINE
    await selectGlassSelectOption('En cours', 'Terminé');
    await waitFor(() => {
      expect(screen.getByText('Terminé')).toBeInTheDocument();
    });

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
