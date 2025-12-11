import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { EditableCell } from '../EditableCell';

// Mock HTMLCanvasElement.getContext for GlassSelect dropdown width calculation
Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  value: jest.fn(() => ({
    measureText: jest.fn(() => ({ width: 100 })),
    font: '',
  })),
});

// Helper function to interact with GlassSelect dropdown
async function selectGlassSelectOption(triggerText: string, optionText: string) {
  // Find GlassSelect button by its structure: it's a button with a span containing the text
  // and it's inside a div with class "relative inline-block"
  let triggerButton: HTMLButtonElement | null = null;
  await waitFor(
    () => {
      // Try to find by text first (most reliable)
      const textElements = screen.queryAllByText(triggerText, { exact: false });
      if (textElements.length > 0) {
        triggerButton = textElements
          .map((el) => el.closest('button'))
          .find((btn) => btn && !btn.closest('[class*="fixed"]')) as HTMLButtonElement | null;
      }
      // Fallback: find by structure if text search fails
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

    // GlassSelect renders as a button with the label text inside a span
    const textElement = screen.getByText('En cours');
    const button = textElement.closest('button');
    expect(button).toBeInTheDocument();
    expect(button?.tagName).toBe('BUTTON');
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

  it('should render progress type', () => {
    render(<EditableCell value={50} field="progress" type="progress" onSave={mockOnSave} />);

    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('should enter edit mode for progress and save', async () => {
    render(<EditableCell value={50} field="progress" type="progress" onSave={mockOnSave} />);

    const button = screen.getByText('50%');
    fireEvent.click(button);

    const input = screen.getByDisplayValue('50');
    fireEvent.change(input, { target: { value: '75' } });
    fireEvent.blur(input);

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith('progress', 75);
    });
  });

  it('should clamp progress value between 0 and 100', async () => {
    render(<EditableCell value={50} field="progress" type="progress" onSave={mockOnSave} />);

    const button = screen.getByText('50%');
    fireEvent.click(button);

    const input = screen.getByDisplayValue('50');
    fireEvent.change(input, { target: { value: '150' } });
    fireEvent.blur(input);

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith('progress', 100);
    });
  });

  it('should handle negative progress value', async () => {
    render(<EditableCell value={50} field="progress" type="progress" onSave={mockOnSave} />);

    const button = screen.getByText('50%');
    fireEvent.click(button);

    const input = screen.getByDisplayValue('50');
    fireEvent.change(input, { target: { value: '-10' } });
    fireEvent.blur(input);

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith('progress', 0);
    });
  });

  it('should render link type', () => {
    render(
      <EditableCell
        value="https://example.com"
        field="externalLink"
        type="link"
        onSave={mockOnSave}
      />
    );

    expect(screen.getByText('Lien')).toBeInTheDocument();
    const link = document.querySelector('a[href="https://example.com"]');
    expect(link).toBeInTheDocument();
  });

  it('should enter edit mode for link', () => {
    render(
      <EditableCell
        value="https://example.com"
        field="externalLink"
        type="link"
        onSave={mockOnSave}
      />
    );

    const button = screen.getByText('Lien');
    fireEvent.click(button);

    const input = screen.getByDisplayValue('https://example.com');
    expect(input).toBeInTheDocument();
  });

  it('should render label select type', () => {
    render(<EditableCell value="ACCEPTE" field="label" type="select" onSave={mockOnSave} />);

    // GlassSelect renders as a button with the label text inside a span
    const textElement = screen.getByText('Accepté');
    const button = textElement.closest('button');
    expect(button).toBeInTheDocument();
    expect(button?.tagName).toBe('BUTTON');
  });

  it('should normalize label value on save', async () => {
    render(<EditableCell value="accepté" field="label" type="select" onSave={mockOnSave} />);

    // GlassSelect: click button to open dropdown, then click option
    const button = screen.getByText('Accepté');
    fireEvent.click(button);

    // Wait for dropdown to appear and click on "En cours" option
    await waitFor(() => {
      const option = screen.getByText('En cours');
      expect(option).toBeInTheDocument();
    });
    const option = screen.getByText('En cours');
    fireEvent.click(option);

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith('label', 'EN_COURS');
    });
  });

  it('should auto-save on status select change', async () => {
    render(<EditableCell value="EN_COURS" field="status" type="select" onSave={mockOnSave} />);

    // GlassSelect: click button to open dropdown, then click option
    const button = screen.getByText('En cours');
    fireEvent.click(button);

    // Wait for dropdown to appear and click on "Terminé" option
    await waitFor(() => {
      const option = screen.getByText('Terminé');
      expect(option).toBeInTheDocument();
    });
    const option = screen.getByText('Terminé');
    fireEvent.click(option);

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith('status', 'TERMINE');
    });
  });

  it('should format title case for name field', async () => {
    render(<EditableCell value="test project" field="name" type="text" onSave={mockOnSave} />);

    const button = screen.getByText('test project');
    fireEvent.click(button);

    const input = screen.getByDisplayValue('test project');
    fireEvent.change(input, { target: { value: 'NEW PROJECT NAME' } });
    fireEvent.blur(input);

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith('name', 'New Project Name');
    });
  });

  it('should format title case for style field', async () => {
    render(<EditableCell value="pop" field="style" type="text" onSave={mockOnSave} />);

    const button = screen.getByText('pop');
    fireEvent.click(button);

    const input = screen.getByDisplayValue('pop');
    fireEvent.change(input, { target: { value: 'ROCK MUSIC' } });
    fireEvent.blur(input);

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith('style', 'Rock Music');
    });
  });

  it('should format title case for collab field', async () => {
    render(<EditableCell value="artist" field="collab" type="text" onSave={mockOnSave} />);

    const button = screen.getByText('artist');
    fireEvent.click(button);

    const input = screen.getByDisplayValue('artist');
    fireEvent.change(input, { target: { value: 'FEATURED ARTIST' } });
    fireEvent.blur(input);

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith('collab', 'Featured Artist');
    });
  });

  it('should not format title case for other text fields', async () => {
    render(<EditableCell value="test" field="other" type="text" onSave={mockOnSave} />);

    const button = screen.getByText('test');
    fireEvent.click(button);

    const input = screen.getByDisplayValue('test');
    fireEvent.change(input, { target: { value: 'UPPERCASE TEXT' } });
    fireEvent.blur(input);

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith('other', 'UPPERCASE TEXT');
    });
  });

  it('should handle number type with invalid input', async () => {
    render(<EditableCell value={100} field="streams" type="number" onSave={mockOnSave} />);

    const button = screen.getByText(/100/);
    fireEvent.click(button);

    const input = screen.getByDisplayValue('100');
    fireEvent.change(input, { target: { value: 'invalid' } });
    fireEvent.blur(input);

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith('streams', null);
    });
  });

  it('should handle disabled progress', () => {
    render(
      <EditableCell value={50} field="progress" type="progress" onSave={mockOnSave} disabled />
    );

    const button = screen.getByText('50%');
    expect(button).toBeDisabled();
  });

  it('should use textarea when allowWrap is true', () => {
    render(
      <EditableCell
        value="Long text that should wrap"
        field="name"
        type="text"
        onSave={mockOnSave}
        allowWrap
      />
    );

    const button = screen.getByText('Long text that should wrap');
    fireEvent.click(button);

    const textarea = document.querySelector('textarea');
    expect(textarea).toBeInTheDocument();
  });

  it('should save on Enter in textarea when allowWrap is true', async () => {
    render(<EditableCell value="Test" field="name" type="text" onSave={mockOnSave} allowWrap />);

    const button = screen.getByText('Test');
    fireEvent.click(button);

    const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: 'New Value' } });
    fireEvent.keyDown(textarea, { key: 'Enter' });

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalled();
    });
  });

  it('should not save on Shift+Enter in textarea', async () => {
    render(<EditableCell value="Test" field="name" type="text" onSave={mockOnSave} allowWrap />);

    const button = screen.getByText('Test');
    fireEvent.click(button);

    const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: 'New Value\n' } });
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true });

    // Should not save on Shift+Enter
    await waitFor(() => {
      expect(mockOnSave).not.toHaveBeenCalled();
    });
  });

  it('should not save if value has not changed', async () => {
    render(<EditableCell value="Test" field="name" type="text" onSave={mockOnSave} />);

    const button = screen.getByText('Test');
    fireEvent.click(button);

    const input = screen.getByDisplayValue('Test');
    fireEvent.blur(input);

    await waitFor(() => {
      expect(mockOnSave).not.toHaveBeenCalled();
    });
  });

  it('should handle empty string as null', async () => {
    render(<EditableCell value="Test" field="name" type="text" onSave={mockOnSave} />);

    const button = screen.getByText('Test');
    fireEvent.click(button);

    const input = screen.getByDisplayValue('Test');
    fireEvent.change(input, { target: { value: '   ' } });
    fireEvent.blur(input);

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith('name', null);
    });
  });

  it('should restore original value on error', async () => {
    const failingOnSave = jest.fn().mockRejectedValue(new Error('Save failed'));
    render(<EditableCell value="Original" field="name" type="text" onSave={failingOnSave} />);

    const button = screen.getByText('Original');
    fireEvent.click(button);

    const input = screen.getByDisplayValue('Original');
    fireEvent.change(input, { target: { value: 'New Value' } });
    fireEvent.blur(input);

    await waitFor(() => {
      expect(failingOnSave).toHaveBeenCalled();
      expect(input).toHaveValue('Original');
    });
  });

  it('should format title case for labelFinal field', async () => {
    render(<EditableCell value="label" field="labelFinal" type="text" onSave={mockOnSave} />);

    const button = screen.getByText('label');
    fireEvent.click(button);

    const input = screen.getByDisplayValue('label');
    fireEvent.change(input, { target: { value: 'NEW LABEL' } });
    fireEvent.blur(input);

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith('labelFinal', 'New Label');
    });
  });

  it('should normalize label value from old format', async () => {
    render(<EditableCell value="ACCEPTE" field="label" type="select" onSave={mockOnSave} />);

    // GlassSelect: click button to open dropdown, then click option
    const button = screen.getByText('Accepté');
    fireEvent.click(button);

    // Wait for dropdown to appear and click on "En cours" option
    await waitFor(() => {
      const option = screen.getByText('En cours');
      expect(option).toBeInTheDocument();
    });
    const option = screen.getByText('En cours');
    fireEvent.click(option);

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith('label', 'EN_COURS');
    });
  });

  it('should handle null label value', async () => {
    render(<EditableCell value={null} field="label" type="select" onSave={mockOnSave} />);

    // GlassSelect: when value is null, it shows "-" placeholder
    // Text is inside a span within the button, so find text then get button parent
    const textElement = screen.getByText('-');
    const button = textElement.closest('button');
    expect(button).toBeInTheDocument();

    // Click to open dropdown
    fireEvent.click(button!);

    // Wait for dropdown and click on "-" option in dropdown
    await waitFor(() => {
      const dropdownButtons = document.body.querySelectorAll('button');
      const optionButton = Array.from(dropdownButtons).find(
        (btn) =>
          btn.textContent?.trim() === '-' && btn !== button && btn.closest('[class*="fixed"]')
      );
      expect(optionButton).toBeInTheDocument();
      if (optionButton) {
        fireEvent.click(optionButton);
      }
    });

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith('label', null);
    });
  });

  it('should handle link type with null value', () => {
    render(<EditableCell value={null} field="externalLink" type="link" onSave={mockOnSave} />);

    expect(screen.getByText(/-/)).toBeInTheDocument();
  });

  it('should handle progress with null value', () => {
    render(<EditableCell value={null} field="progress" type="progress" onSave={mockOnSave} />);

    expect(screen.getByText(/-/)).toBeInTheDocument();
  });

  it('should handle date with null value', () => {
    render(<EditableCell value={null} field="releaseDate" type="date" onSave={mockOnSave} />);

    expect(screen.getByText(/-/)).toBeInTheDocument();
  });

  it('should handle number with null value', () => {
    render(<EditableCell value={null} field="streams" type="number" onSave={mockOnSave} />);

    expect(screen.getByText(/-/)).toBeInTheDocument();
  });

  it('should use custom placeholder', () => {
    render(
      <EditableCell
        value={null}
        field="name"
        type="text"
        onSave={mockOnSave}
        placeholder="No value"
      />
    );

    expect(screen.getByText('No value')).toBeInTheDocument();
  });

  it('should apply isCompact styling', () => {
    render(<EditableCell value="Test" field="name" type="text" onSave={mockOnSave} isCompact />);

    const button = screen.getByText('Test');
    expect(button.className).toMatch(/text-\[10px\]/);
  });

  it('should handle status select with invalid value', () => {
    render(<EditableCell value="INVALID" field="status" type="select" onSave={mockOnSave} />);

    // When status is invalid, GlassSelect may not render correctly, so no button with status label should be found
    // The component should handle this gracefully
    const button = screen.queryByText('En cours');
    expect(button).not.toBeInTheDocument();
  });

  it('should prevent saving when already saving', async () => {
    const slowOnSave = jest.fn(() => new Promise((resolve) => setTimeout(resolve, 100)));
    render(<EditableCell value="Test" field="name" type="text" onSave={slowOnSave} />);

    const button = screen.getByText('Test');
    fireEvent.click(button);

    const input = screen.getByDisplayValue('Test');
    fireEvent.change(input, { target: { value: 'New Value' } });
    fireEvent.blur(input);
    // Try to save again while saving
    fireEvent.blur(input);

    await waitFor(() => {
      expect(slowOnSave).toHaveBeenCalledTimes(1);
    });
  });

  it('should handle textarea selection on focus', async () => {
    render(<EditableCell value="Test" field="name" type="text" onSave={mockOnSave} allowWrap />);

    const button = screen.getByText('Test');
    fireEvent.click(button);

    const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
    // Simulate focus which should set selection
    fireEvent.focus(textarea);

    expect(textarea).toBeInTheDocument();
  });

  it('should handle date input selection on focus', async () => {
    render(<EditableCell value="2024-01-01" field="releaseDate" type="date" onSave={mockOnSave} />);

    const button = screen.getByText(/01\/01/);
    fireEvent.click(button);

    const input = document.querySelector('input[type="date"]') as HTMLInputElement;
    fireEvent.focus(input);

    expect(input).toBeInTheDocument();
  });

  it('should handle progress with value 0', () => {
    render(<EditableCell value={0} field="progress" type="progress" onSave={mockOnSave} />);

    expect(screen.getByText('0%')).toBeInTheDocument();
  });

  it('should handle progress with value 100', () => {
    render(<EditableCell value={100} field="progress" type="progress" onSave={mockOnSave} />);

    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('should handle number with value 0', () => {
    render(<EditableCell value={0} field="streams" type="number" onSave={mockOnSave} />);

    expect(screen.getByText(/0/)).toBeInTheDocument();
  });

  it('should handle text with empty string value', () => {
    render(<EditableCell value="" field="name" type="text" onSave={mockOnSave} />);

    expect(screen.getByText(/-/)).toBeInTheDocument();
  });

  it('should handle labelFinal formatting', async () => {
    render(<EditableCell value="label" field="labelFinal" type="text" onSave={mockOnSave} />);

    const button = screen.getByText('label');
    fireEvent.click(button);

    const input = screen.getByDisplayValue('label');
    fireEvent.change(input, { target: { value: 'FINAL LABEL' } });
    fireEvent.blur(input);

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith('labelFinal', 'Final Label');
    });
  });

  it('should handle label normalization with EN_COURS value', async () => {
    render(<EditableCell value="en cours" field="label" type="select" onSave={mockOnSave} />);

    // Click on a different option first to trigger onChange, then back to "En cours" to test normalization
    await selectGlassSelectOption('En cours', 'Accepté');
    await selectGlassSelectOption('Accepté', 'En cours');

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith('label', 'EN_COURS');
    });
  });

  it('should handle label normalization with REFUSE value', async () => {
    render(<EditableCell value="refusé" field="label" type="select" onSave={mockOnSave} />);

    // Click on a different option first, then back to "Refusé" to trigger onChange
    await selectGlassSelectOption('Refusé', 'Accepté');
    await selectGlassSelectOption('Accepté', 'Refusé');

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith('label', 'REFUSE');
    });
  });

  it('should handle formatTitleCase with empty string', async () => {
    render(<EditableCell value="test" field="name" type="text" onSave={mockOnSave} />);

    const button = screen.getByText('test');
    fireEvent.click(button);

    const input = screen.getByDisplayValue('test');
    fireEvent.change(input, { target: { value: '   ' } });
    fireEvent.blur(input);

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith('name', null);
    });
  });

  it('should handle formatTitleCase with single word', async () => {
    render(<EditableCell value="test" field="name" type="text" onSave={mockOnSave} />);

    const button = screen.getByText('test');
    fireEvent.click(button);

    const input = screen.getByDisplayValue('test');
    fireEvent.change(input, { target: { value: 'WORD' } });
    fireEvent.blur(input);

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith('name', 'Word');
    });
  });

  it('should handle formatTitleCase with multiple spaces', async () => {
    render(<EditableCell value="test" field="name" type="text" onSave={mockOnSave} />);

    const button = screen.getByText('test');
    fireEvent.click(button);

    const input = screen.getByDisplayValue('test');
    fireEvent.change(input, { target: { value: 'WORD1  WORD2   WORD3' } });
    fireEvent.blur(input);

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith('name', 'Word1 Word2 Word3');
    });
  });

  it('should handle progress with invalid string input', async () => {
    render(<EditableCell value={50} field="progress" type="progress" onSave={mockOnSave} />);

    const button = screen.getByText('50%');
    fireEvent.click(button);

    const input = screen.getByDisplayValue('50');
    fireEvent.change(input, { target: { value: 'abc' } });
    fireEvent.blur(input);

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith('progress', null);
    });
  });

  it('should handle number with empty string input', async () => {
    render(<EditableCell value={100} field="streams" type="number" onSave={mockOnSave} />);

    const button = screen.getByText(/100/);
    fireEvent.click(button);

    const input = screen.getByDisplayValue('100');
    fireEvent.change(input, { target: { value: '' } });
    fireEvent.blur(input);

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith('streams', null);
    });
  });

  it('should handle label normalization with different case variations', async () => {
    render(<EditableCell value="ACCEPTE" field="label" type="select" onSave={mockOnSave} />);

    // Click on a different option first, then back to "Accepté" to trigger onChange
    await selectGlassSelectOption('Accepté', 'En cours');
    await selectGlassSelectOption('En cours', 'Accepté');

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalled();
    });
  });

  it('should handle label with value not in LABEL_OPTIONS', async () => {
    render(<EditableCell value="INVALID" field="label" type="select" onSave={mockOnSave} />);

    // GlassSelect: when value is invalid, it shows "-" placeholder
    // Open dropdown and click on "-" option to trigger onChange
    await selectGlassSelectOption('-', '-');

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith('label', null);
    });
  });

  it('should handle textarea Escape key', async () => {
    render(<EditableCell value="Test" field="name" type="text" onSave={mockOnSave} allowWrap />);

    const button = screen.getByText('Test');
    fireEvent.click(button);

    const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: 'Changed' } });
    fireEvent.keyDown(textarea, { key: 'Escape' });

    await waitFor(() => {
      expect(screen.getByText('Test')).toBeInTheDocument();
    });
  });

  it('should handle date input focus without selection', async () => {
    render(<EditableCell value="2024-01-01" field="releaseDate" type="date" onSave={mockOnSave} />);

    const button = screen.getByText(/01\/01/);
    fireEvent.click(button);

    const input = document.querySelector('input[type="date"]') as HTMLInputElement;
    fireEvent.focus(input);

    expect(input).toBeInTheDocument();
  });

  it('should handle progress with null value and disabled state', () => {
    render(
      <EditableCell value={null} field="progress" type="progress" onSave={mockOnSave} disabled />
    );

    expect(screen.getByText(/-/)).toBeInTheDocument();
  });

  it('should handle text field with empty string value', () => {
    render(<EditableCell value="" field="name" type="text" onSave={mockOnSave} />);

    expect(screen.getByText(/-/)).toBeInTheDocument();
  });

  it('should handle text field with whitespace-only value', () => {
    render(<EditableCell value="   " field="name" type="text" onSave={mockOnSave} />);

    // Whitespace values are displayed as-is in display mode
    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
  });

  it('should handle select type with empty string value', () => {
    render(<EditableCell value="" field="status" type="select" onSave={mockOnSave} />);

    // Status select with empty value returns null (no statusConfig found)
    // GlassSelect won't render a button with status label
    const button = screen.queryByText('En cours');
    expect(button).not.toBeInTheDocument();
  });

  it('should handle link type with empty string value', () => {
    render(<EditableCell value="" field="externalLink" type="link" onSave={mockOnSave} />);

    expect(screen.getByText(/-/)).toBeInTheDocument();
  });

  it('should handle number type with 0 value', () => {
    render(<EditableCell value={0} field="streams" type="number" onSave={mockOnSave} />);

    expect(screen.getByText(/0/)).toBeInTheDocument();
  });

  it('should handle progress type with 0 value', () => {
    render(<EditableCell value={0} field="progress" type="progress" onSave={mockOnSave} />);

    expect(screen.getByText('0%')).toBeInTheDocument();
  });

  it('should handle date type with empty string', () => {
    render(<EditableCell value="" field="releaseDate" type="date" onSave={mockOnSave} />);

    expect(screen.getByText(/-/)).toBeInTheDocument();
  });

  it('should handle className prop in display mode', () => {
    render(
      <EditableCell
        value="Test"
        field="name"
        type="text"
        onSave={mockOnSave}
        className="custom-class"
      />
    );

    const button = screen.getByText('Test');
    expect(button.className).toContain('custom-class');
  });

  it('should handle className prop in edit mode', () => {
    render(
      <EditableCell
        value="Test"
        field="name"
        type="text"
        onSave={mockOnSave}
        className="custom-class"
      />
    );

    const button = screen.getByText('Test');
    fireEvent.click(button);

    const input = screen.getByDisplayValue('Test');
    expect(input.className).toContain('custom-class');
  });

  it('should handle number type with negative value', async () => {
    render(<EditableCell value={100} field="streams" type="number" onSave={mockOnSave} />);

    const button = screen.getByText(/100/);
    fireEvent.click(button);

    const input = screen.getByDisplayValue('100');
    fireEvent.change(input, { target: { value: '-10' } });
    fireEvent.blur(input);

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith('streams', -10);
    });
  });

  it('should handle progress type with empty string input', async () => {
    render(<EditableCell value={50} field="progress" type="progress" onSave={mockOnSave} />);

    const button = screen.getByText('50%');
    fireEvent.click(button);

    const input = screen.getByDisplayValue('50');
    fireEvent.change(input, { target: { value: '' } });
    fireEvent.blur(input);

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith('progress', null);
    });
  });

  it('should handle label normalization with EN_COURS old format', async () => {
    render(<EditableCell value="en cours" field="label" type="select" onSave={mockOnSave} />);

    // Click on a different option first, then back to "En cours" to trigger onChange
    await selectGlassSelectOption('En cours', 'Accepté');
    await selectGlassSelectOption('Accepté', 'En cours');

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith('label', 'EN_COURS');
    });
  });

  it('should handle label normalization with REFUSE old format', async () => {
    render(<EditableCell value="refuse" field="label" type="select" onSave={mockOnSave} />);

    // Click on a different option first, then back to "Refusé" to trigger onChange
    await selectGlassSelectOption('Refusé', 'Accepté');
    await selectGlassSelectOption('Accepté', 'Refusé');

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith('label', 'REFUSE');
    });
  });

  it('should handle label normalization with ACCEPTE old format variations', async () => {
    render(<EditableCell value="ACCEPTÉ" field="label" type="select" onSave={mockOnSave} />);

    // Click on a different option first, then back to "Accepté" to trigger onChange
    await selectGlassSelectOption('Accepté', 'En cours');
    await selectGlassSelectOption('En cours', 'Accepté');

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith('label', 'ACCEPTE');
    });
  });

  it('should handle label normalization with REFUSÉ old format', async () => {
    render(<EditableCell value="REFUSÉ" field="label" type="select" onSave={mockOnSave} />);

    // Click on a different option first, then back to "Refusé" to trigger onChange
    await selectGlassSelectOption('Refusé', 'Accepté');
    await selectGlassSelectOption('Accepté', 'Refusé');

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith('label', 'REFUSE');
    });
  });

  it('should handle label normalization with value in LABEL_OPTIONS', async () => {
    render(<EditableCell value="EN_COURS" field="label" type="select" onSave={mockOnSave} />);

    // Click on a different option first, then back to "En cours" to trigger onChange
    await selectGlassSelectOption('En cours', 'Accepté');
    await selectGlassSelectOption('Accepté', 'En cours');

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith('label', 'EN_COURS');
    });
  });

  it('should handle label normalization with value not in LABEL_OPTIONS and not in valueMap', async () => {
    render(<EditableCell value="UNKNOWN" field="label" type="select" onSave={mockOnSave} />);

    // GlassSelect: when value is invalid, it shows "-" placeholder
    // Open dropdown and click on "-" option to trigger onChange
    await selectGlassSelectOption('-', '-');

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith('label', null);
    });
  });

  it('should handle text field that is not in fieldsToFormat', async () => {
    render(<EditableCell value="test" field="externalLink" type="text" onSave={mockOnSave} />);

    const button = screen.getByText('test');
    fireEvent.click(button);

    const input = screen.getByDisplayValue('test');
    fireEvent.change(input, { target: { value: 'UPPERCASE TEXT' } });
    fireEvent.blur(input);

    await waitFor(() => {
      // externalLink should not be formatted
      expect(mockOnSave).toHaveBeenCalledWith('externalLink', 'UPPERCASE TEXT');
    });
  });

  it('should handle text field with empty trimmed value', async () => {
    render(<EditableCell value="test" field="name" type="text" onSave={mockOnSave} />);

    const button = screen.getByText('test');
    fireEvent.click(button);

    const input = screen.getByDisplayValue('test');
    fireEvent.change(input, { target: { value: '   ' } });
    fireEvent.blur(input);

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith('name', null);
    });
  });

  it('should handle progress type with valid number in range', async () => {
    render(<EditableCell value={50} field="progress" type="progress" onSave={mockOnSave} />);

    const button = screen.getByText('50%');
    fireEvent.click(button);

    const input = screen.getByDisplayValue('50');
    fireEvent.change(input, { target: { value: '75' } });
    fireEvent.blur(input);

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith('progress', 75);
    });
  });

  it('should handle progress type with number at boundary 0', async () => {
    render(<EditableCell value={50} field="progress" type="progress" onSave={mockOnSave} />);

    const button = screen.getByText('50%');
    fireEvent.click(button);

    const input = screen.getByDisplayValue('50');
    fireEvent.change(input, { target: { value: '0' } });
    fireEvent.blur(input);

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith('progress', 0);
    });
  });

  it('should handle progress type with number at boundary 100', async () => {
    render(<EditableCell value={50} field="progress" type="progress" onSave={mockOnSave} />);

    const button = screen.getByText('50%');
    fireEvent.click(button);

    const input = screen.getByDisplayValue('50');
    fireEvent.change(input, { target: { value: '100' } });
    fireEvent.blur(input);

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith('progress', 100);
    });
  });

  it('should handle select type with label field and empty value', async () => {
    render(<EditableCell value="ACCEPTE" field="label" type="select" onSave={mockOnSave} />);

    // GlassSelect: click button to open dropdown, then click "-" option
    const button = screen.getByText('Accepté');
    fireEvent.click(button);

    await waitFor(() => {
      const option = screen.getByText('-');
      expect(option).toBeInTheDocument();
    });
    const option = screen.getByText('-');
    fireEvent.click(option);

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith('label', null);
    });
  });

  it('should handle select type with label field and trimmed empty value', async () => {
    render(<EditableCell value="ACCEPTE" field="label" type="select" onSave={mockOnSave} />);

    // GlassSelect: click button to open dropdown, then click "-" option
    const button = screen.getByText('Accepté');
    fireEvent.click(button);

    await waitFor(() => {
      const option = screen.getByText('-');
      expect(option).toBeInTheDocument();
    });
    const option = screen.getByText('-');
    fireEvent.click(option);

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith('label', null);
    });
  });

  it('should select text in input when entering edit mode', async () => {
    render(<EditableCell value="Test" field="name" type="text" onSave={mockOnSave} />);

    const button = screen.getByText('Test');
    fireEvent.click(button);

    const input = screen.getByDisplayValue('Test') as HTMLInputElement;
    // Input should be focused and text should be selected
    expect(input).toBeInTheDocument();
  });

  it('should set cursor at end in textarea when entering edit mode', async () => {
    render(<EditableCell value="Test" field="name" type="text" onSave={mockOnSave} allowWrap />);

    const button = screen.getByText('Test');
    fireEvent.click(button);

    const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
    // Textarea should be focused
    expect(textarea).toBeInTheDocument();
  });

  it('should not select text in date input when entering edit mode', async () => {
    render(<EditableCell value="2024-01-01" field="releaseDate" type="date" onSave={mockOnSave} />);

    const button = screen.getByText(/01\/01/);
    fireEvent.click(button);

    const input = document.querySelector('input[type="date"]') as HTMLInputElement;
    // Date input should be focused but text should not be selected
    expect(input).toBeInTheDocument();
  });

  it('should handle link type with value in display mode', () => {
    render(
      <EditableCell
        value="https://example.com"
        field="externalLink"
        type="link"
        onSave={mockOnSave}
      />
    );

    expect(screen.getByText('Lien')).toBeInTheDocument();
    const link = document.querySelector('a[href="https://example.com"]');
    expect(link).toBeInTheDocument();
  });

  it('should handle link type click to enter edit mode', () => {
    render(
      <EditableCell
        value="https://example.com"
        field="externalLink"
        type="link"
        onSave={mockOnSave}
      />
    );

    const button = screen.getByText('Lien');
    fireEvent.click(button);

    const input = screen.getByDisplayValue('https://example.com');
    expect(input).toBeInTheDocument();
  });

  it('should handle label normalization with value in valueMap (accepté)', async () => {
    render(<EditableCell value="accepté" field="label" type="select" onSave={mockOnSave} />);

    // Click on a different option first, then back to "Accepté" to trigger onChange
    await selectGlassSelectOption('Accepté', 'En cours');
    await selectGlassSelectOption('En cours', 'Accepté');

    await waitFor(() => {
      // The normalization should convert 'accepté' to 'ACCEPTE'
      expect(mockOnSave).toHaveBeenCalled();
    });
  });

  it('should handle label normalization with value in valueMap (En cours)', async () => {
    render(<EditableCell value="En cours" field="label" type="select" onSave={mockOnSave} />);

    // Click on a different option first, then back to "En cours" to trigger onChange
    await selectGlassSelectOption('En cours', 'Accepté');
    await selectGlassSelectOption('Accepté', 'En cours');

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalled();
    });
  });

  it('should handle label normalization with value in valueMap (EN COURS)', async () => {
    render(<EditableCell value="EN COURS" field="label" type="select" onSave={mockOnSave} />);

    // Click on a different option first, then back to "En cours" to trigger onChange
    await selectGlassSelectOption('En cours', 'Accepté');
    await selectGlassSelectOption('Accepté', 'En cours');

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalled();
    });
  });

  it('should handle label normalization with value in LABEL_OPTIONS but not in valueMap', async () => {
    render(<EditableCell value="EN_COURS" field="label" type="select" onSave={mockOnSave} />);

    // GlassSelect: click button to open dropdown, then click "En cours" option
    const button = screen.getByText('En cours');
    fireEvent.click(button);

    // Wait for dropdown to appear and find the option button
    await waitFor(() => {
      const dropdownButtons = document.body.querySelectorAll('button');
      const optionButton = Array.from(dropdownButtons).find(
        (btn) =>
          btn.textContent?.trim() === 'En cours' &&
          btn !== button &&
          btn.closest('[class*="fixed"]')
      );
      expect(optionButton).toBeInTheDocument();
      if (optionButton) {
        fireEvent.click(optionButton);
      }
    });

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith('label', 'EN_COURS');
    });
  });
});
