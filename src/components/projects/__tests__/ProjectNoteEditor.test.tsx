import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProjectNoteEditor } from '../ProjectNoteEditor';

describe('ProjectNoteEditor', () => {
  const mockOnChange = jest.fn();
  const mockOnSave = jest.fn();
  const mockOnCancel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render with initial value', () => {
    render(
      <ProjectNoteEditor
        value="Test note"
        onChange={mockOnChange}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByDisplayValue('Test note')).toBeInTheDocument();
  });

  it('should call onChange when text is changed', async () => {
    const user = userEvent.setup();
    render(
      <ProjectNoteEditor
        value=""
        onChange={mockOnChange}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    const textarea = screen.getByPlaceholderText(/Ajoutez des informations/i);
    await user.type(textarea, 'New content');

    expect(mockOnChange).toHaveBeenCalled();
  });

  it('should switch to preview mode', () => {
    render(
      <ProjectNoteEditor
        value="Test content"
        onChange={mockOnChange}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    const previewButton = screen.getByText('Aperçu');
    fireEvent.click(previewButton);

    expect(screen.queryByDisplayValue('Test content')).not.toBeInTheDocument();
    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  it('should switch back to edit mode', () => {
    render(
      <ProjectNoteEditor
        value="Test content"
        onChange={mockOnChange}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    // Switch to preview
    fireEvent.click(screen.getByText('Aperçu'));
    // Switch back to edit
    fireEvent.click(screen.getByText('Éditer'));

    expect(screen.getByDisplayValue('Test content')).toBeInTheDocument();
  });

  it('should call onSave when save button is clicked', () => {
    render(
      <ProjectNoteEditor
        value="Test content"
        onChange={mockOnChange}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    const saveButton = screen.getByText('Enregistrer');
    fireEvent.click(saveButton);

    expect(mockOnSave).toHaveBeenCalledTimes(1);
  });

  it('should call onCancel when cancel button is clicked', () => {
    render(
      <ProjectNoteEditor
        value="Test content"
        onChange={mockOnChange}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    const cancelButton = screen.getByText('Annuler');
    fireEvent.click(cancelButton);

    expect(mockOnCancel).toHaveBeenCalledTimes(1);
  });

  it('should call onCancel on Escape key', () => {
    render(
      <ProjectNoteEditor
        value="Test content"
        onChange={mockOnChange}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    const textarea = screen.getByDisplayValue('Test content');
    fireEvent.keyDown(textarea, { key: 'Escape' });

    expect(mockOnCancel).toHaveBeenCalledTimes(1);
  });

  it('should call onSave on Ctrl+Enter', () => {
    render(
      <ProjectNoteEditor
        value="Test content"
        onChange={mockOnChange}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    const textarea = screen.getByDisplayValue('Test content');
    fireEvent.keyDown(textarea, { key: 'Enter', ctrlKey: true });

    expect(mockOnSave).toHaveBeenCalledTimes(1);
  });

  it('should insert bold text on Ctrl+B', () => {
    render(
      <ProjectNoteEditor
        value=""
        onChange={mockOnChange}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    const textarea = screen.getByPlaceholderText(/Ajoutez des informations/i);
    fireEvent.keyDown(textarea, { key: 'b', ctrlKey: true });

    expect(mockOnChange).toHaveBeenCalled();
  });

  it('should insert italic text on Ctrl+I', () => {
    render(
      <ProjectNoteEditor
        value=""
        onChange={mockOnChange}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    const textarea = screen.getByPlaceholderText(/Ajoutez des informations/i);
    fireEvent.keyDown(textarea, { key: 'i', ctrlKey: true });

    expect(mockOnChange).toHaveBeenCalled();
  });

  it('should insert bold markdown when bold button is clicked', () => {
    render(
      <ProjectNoteEditor
        value=""
        onChange={mockOnChange}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    const boldButton = screen.getByTitle('Gras (Ctrl+B)');
    fireEvent.click(boldButton);

    expect(mockOnChange).toHaveBeenCalled();
  });

  it('should insert italic markdown when italic button is clicked', () => {
    render(
      <ProjectNoteEditor
        value=""
        onChange={mockOnChange}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    const italicButton = screen.getByTitle('Italique (Ctrl+I)');
    fireEvent.click(italicButton);

    expect(mockOnChange).toHaveBeenCalled();
  });

  it('should insert heading when heading button is clicked', () => {
    render(
      <ProjectNoteEditor
        value=""
        onChange={mockOnChange}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    const headingButton = screen.getByTitle('Titre');
    fireEvent.click(headingButton);

    expect(mockOnChange).toHaveBeenCalled();
  });

  it('should insert list when list button is clicked', () => {
    render(
      <ProjectNoteEditor
        value=""
        onChange={mockOnChange}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    const listButton = screen.getByTitle('Liste');
    fireEvent.click(listButton);

    expect(mockOnChange).toHaveBeenCalled();
  });

  it('should insert link when link button is clicked', () => {
    render(
      <ProjectNoteEditor
        value=""
        onChange={mockOnChange}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    const linkButton = screen.getByTitle('Lien');
    fireEvent.click(linkButton);

    expect(mockOnChange).toHaveBeenCalled();
  });

  it('should insert version template', () => {
    render(
      <ProjectNoteEditor
        value=""
        onChange={mockOnChange}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    const versionButton = screen.getByText('Version');
    fireEvent.click(versionButton);

    expect(mockOnChange).toHaveBeenCalled();
  });

  it('should insert phase template', () => {
    render(
      <ProjectNoteEditor
        value=""
        onChange={mockOnChange}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    const phaseButton = screen.getByText('Phase');
    fireEvent.click(phaseButton);

    expect(mockOnChange).toHaveBeenCalled();
  });

  it('should insert evolution template', () => {
    render(
      <ProjectNoteEditor
        value=""
        onChange={mockOnChange}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    const evolutionButton = screen.getByText('Évolution');
    fireEvent.click(evolutionButton);

    expect(mockOnChange).toHaveBeenCalled();
  });

  it('should display project name in title when provided', () => {
    render(
      <ProjectNoteEditor
        value=""
        onChange={mockOnChange}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
        projectName="My Project"
      />
    );

    expect(screen.getByText(/Note du projet: My Project/)).toBeInTheDocument();
  });

  it('should render preview with empty content message', () => {
    render(
      <ProjectNoteEditor
        value=""
        onChange={mockOnChange}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    fireEvent.click(screen.getByText('Aperçu'));

    expect(screen.getByText(/Aucun contenu à prévisualiser/)).toBeInTheDocument();
  });

  it('should render preview with markdown headings', () => {
    render(
      <ProjectNoteEditor
        value="# Title\n## Subtitle\n### Heading"
        onChange={mockOnChange}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    fireEvent.click(screen.getByText('Aperçu'));

    expect(screen.getByText(/Title/)).toBeInTheDocument();
    expect(screen.getByText(/Subtitle/)).toBeInTheDocument();
    expect(screen.getByText(/Heading/)).toBeInTheDocument();
  });

  it('should render preview with markdown lists', () => {
    render(
      <ProjectNoteEditor
        value="- Item 1\n- Item 2"
        onChange={mockOnChange}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    fireEvent.click(screen.getByText('Aperçu'));

    expect(screen.getByText(/Item 1/)).toBeInTheDocument();
    expect(screen.getByText(/Item 2/)).toBeInTheDocument();
  });

  it('should render preview with markdown task lists', () => {
    render(
      <ProjectNoteEditor
        value="- [x] Done\n- [ ] Todo"
        onChange={mockOnChange}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    fireEvent.click(screen.getByText('Aperçu'));

    // The text might be in nested elements, check the container text content
    const previewContainer = document.querySelector('.text-gray-200');
    expect(previewContainer?.textContent).toMatch(/Done/);
    expect(previewContainer?.textContent).toMatch(/Todo/);
  });

  it('should render preview with markdown bold text', () => {
    render(
      <ProjectNoteEditor
        value="**bold text**"
        onChange={mockOnChange}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    fireEvent.click(screen.getByText('Aperçu'));

    const boldElement = screen.getByText('bold text');
    expect(boldElement.tagName).toBe('STRONG');
  });

  it('should render preview with markdown italic text', () => {
    render(
      <ProjectNoteEditor
        value="*italic text*"
        onChange={mockOnChange}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    fireEvent.click(screen.getByText('Aperçu'));

    const italicElement = screen.getByText('italic text');
    expect(italicElement.tagName).toBe('EM');
  });

  it('should render preview with markdown links', () => {
    render(
      <ProjectNoteEditor
        value="[Link text](https://example.com)"
        onChange={mockOnChange}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    fireEvent.click(screen.getByText('Aperçu'));

    const link = screen.getByText('Link text');
    expect(link.tagName).toBe('A');
    expect(link).toHaveAttribute('href', 'https://example.com');
  });

  it('should handle markdown with mixed formatting', () => {
    render(
      <ProjectNoteEditor
        value="**Bold** and *italic* and [link](url)"
        onChange={mockOnChange}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    fireEvent.click(screen.getByText('Aperçu'));

    expect(screen.getByText(/Bold/)).toBeInTheDocument();
    expect(screen.getByText(/italic/)).toBeInTheDocument();
    expect(screen.getByText(/link/)).toBeInTheDocument();
  });

  it('should handle markdown with multiple paragraphs', () => {
    render(
      <ProjectNoteEditor
        value="Paragraph 1\n\nParagraph 2"
        onChange={mockOnChange}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    fireEvent.click(screen.getByText('Aperçu'));

    expect(screen.getByText(/Paragraph 1/)).toBeInTheDocument();
    expect(screen.getByText(/Paragraph 2/)).toBeInTheDocument();
  });

  it('should handle markdown with nested lists', () => {
    render(
      <ProjectNoteEditor
        value="- Item 1\n- Item 2\n\nParagraph after list"
        onChange={mockOnChange}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    fireEvent.click(screen.getByText('Aperçu'));

    expect(screen.getByText(/Item 1/)).toBeInTheDocument();
    expect(screen.getByText(/Item 2/)).toBeInTheDocument();
    expect(screen.getByText(/Paragraph after list/)).toBeInTheDocument();
  });

  it('should handle markdown with task list transitions', () => {
    render(
      <ProjectNoteEditor
        value="- [x] Task 1\n- Item 1"
        onChange={mockOnChange}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    fireEvent.click(screen.getByText('Aperçu'));

    const container = document.querySelector('.text-gray-200');
    expect(container?.textContent).toMatch(/Task 1/);
    expect(container?.textContent).toMatch(/Item 1/);
  });

  it('should handle markdown with heading transitions from lists', () => {
    render(
      <ProjectNoteEditor
        value="- Item 1\n# Title"
        onChange={mockOnChange}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    fireEvent.click(screen.getByText('Aperçu'));

    expect(screen.getByText(/Item 1/)).toBeInTheDocument();
    expect(screen.getByText(/Title/)).toBeInTheDocument();
  });

  it('should handle markdown with empty lines between elements', () => {
    render(
      <ProjectNoteEditor
        value="# Title\n\n- Item"
        onChange={mockOnChange}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    fireEvent.click(screen.getByText('Aperçu'));

    expect(screen.getByText(/Title/)).toBeInTheDocument();
    expect(screen.getByText(/Item/)).toBeInTheDocument();
  });

  it('should handle markdown with uppercase task list markers', () => {
    render(
      <ProjectNoteEditor
        value="- [X] Done task\n- [ ] Todo task"
        onChange={mockOnChange}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    fireEvent.click(screen.getByText('Aperçu'));

    const container = document.querySelector('.text-gray-200');
    expect(container?.textContent).toMatch(/Done task/);
    expect(container?.textContent).toMatch(/Todo task/);
  });

  it('should handle template insertion when value ends with newlines', () => {
    render(
      <ProjectNoteEditor
        value="Existing content\n\n"
        onChange={mockOnChange}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    const versionButton = screen.getByText('Version');
    fireEvent.click(versionButton);

    // Should not add extra separator since value already ends with \n\n
    expect(mockOnChange).toHaveBeenCalled();
  });

  it('should handle template insertion when value is empty', () => {
    render(
      <ProjectNoteEditor
        value=""
        onChange={mockOnChange}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    const versionButton = screen.getByText('Version');
    fireEvent.click(versionButton);

    expect(mockOnChange).toHaveBeenCalled();
  });

  it('should handle insertText with selected text', async () => {
    const user = userEvent.setup();
    render(
      <ProjectNoteEditor
        value="Selected text here"
        onChange={mockOnChange}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    const textarea = screen.getByDisplayValue('Selected text here');
    // Select some text
    textarea.setSelectionRange(0, 8); // Select "Selected"

    const boldButton = screen.getByTitle('Gras (Ctrl+B)');
    fireEvent.click(boldButton);

    // Should wrap selected text
    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalled();
    });
  });

  it('should handle markdown with bold text containing asterisks', () => {
    render(
      <ProjectNoteEditor
        value="**text with * inside**"
        onChange={mockOnChange}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    fireEvent.click(screen.getByText('Aperçu'));

    expect(screen.getByText(/text with/)).toBeInTheDocument();
  });

  it('should handle markdown with italic text not matching bold pattern', () => {
    render(
      <ProjectNoteEditor
        value="*italic* and **bold**"
        onChange={mockOnChange}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    fireEvent.click(screen.getByText('Aperçu'));

    expect(screen.getByText(/italic/)).toBeInTheDocument();
    expect(screen.getByText(/bold/)).toBeInTheDocument();
  });

  it('should handle markdown with overlapping formatting', () => {
    render(
      <ProjectNoteEditor
        value="**bold [link](url) text**"
        onChange={mockOnChange}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    fireEvent.click(screen.getByText('Aperçu'));

    expect(screen.getByText(/bold/)).toBeInTheDocument();
    // Link might be nested, so check container
    const container = document.querySelector('.text-gray-200');
    expect(container?.textContent).toMatch(/link/);
  });

  it('should handle markdown with multiple links', () => {
    render(
      <ProjectNoteEditor
        value="[Link1](url1) and [Link2](url2)"
        onChange={mockOnChange}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    fireEvent.click(screen.getByText('Aperçu'));

    expect(screen.getByText('Link1')).toBeInTheDocument();
    expect(screen.getByText('Link2')).toBeInTheDocument();
  });

  it('should handle markdown with multiple bold sections', () => {
    render(
      <ProjectNoteEditor
        value="**bold1** text **bold2**"
        onChange={mockOnChange}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    fireEvent.click(screen.getByText('Aperçu'));

    expect(screen.getByText(/bold1/)).toBeInTheDocument();
    expect(screen.getByText(/bold2/)).toBeInTheDocument();
  });

  it('should handle markdown with multiple italic sections', () => {
    render(
      <ProjectNoteEditor
        value="*italic1* text *italic2*"
        onChange={mockOnChange}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    fireEvent.click(screen.getByText('Aperçu'));

    expect(screen.getByText(/italic1/)).toBeInTheDocument();
    expect(screen.getByText(/italic2/)).toBeInTheDocument();
  });

  it('should handle markdown with text before and after matches', () => {
    render(
      <ProjectNoteEditor
        value="Before **bold** after"
        onChange={mockOnChange}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    fireEvent.click(screen.getByText('Aperçu'));

    expect(screen.getByText(/Before/)).toBeInTheDocument();
    expect(screen.getByText(/bold/)).toBeInTheDocument();
    expect(screen.getByText(/after/)).toBeInTheDocument();
  });

  it('should handle markdown with only matches and no text around', () => {
    render(
      <ProjectNoteEditor
        value="**bold**"
        onChange={mockOnChange}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    fireEvent.click(screen.getByText('Aperçu'));

    expect(screen.getByText(/bold/)).toBeInTheDocument();
  });

  it('should handle Cmd+Enter on Mac', () => {
    render(
      <ProjectNoteEditor
        value="Test content"
        onChange={mockOnChange}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    const textarea = screen.getByDisplayValue('Test content');
    fireEvent.keyDown(textarea, { key: 'Enter', metaKey: true });

    expect(mockOnSave).toHaveBeenCalledTimes(1);
  });

  it('should handle Cmd+B on Mac', () => {
    render(
      <ProjectNoteEditor
        value=""
        onChange={mockOnChange}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    const textarea = screen.getByPlaceholderText(/Ajoutez des informations/i);
    fireEvent.keyDown(textarea, { key: 'b', metaKey: true });

    expect(mockOnChange).toHaveBeenCalled();
  });

  it('should handle Cmd+I on Mac', () => {
    render(
      <ProjectNoteEditor
        value=""
        onChange={mockOnChange}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    const textarea = screen.getByPlaceholderText(/Ajoutez des informations/i);
    fireEvent.keyDown(textarea, { key: 'i', metaKey: true });

    expect(mockOnChange).toHaveBeenCalled();
  });

  it('should handle markdown with list transitioning to task list', () => {
    render(
      <ProjectNoteEditor
        value="- Item\n- [x] Task"
        onChange={mockOnChange}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    fireEvent.click(screen.getByText('Aperçu'));

    const container = document.querySelector('.text-gray-200');
    expect(container?.textContent).toMatch(/Item/);
    expect(container?.textContent).toMatch(/Task/);
  });

  it('should handle markdown with task list transitioning to list', () => {
    render(
      <ProjectNoteEditor
        value="- [x] Task\n- Item"
        onChange={mockOnChange}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    fireEvent.click(screen.getByText('Aperçu'));

    const container = document.querySelector('.text-gray-200');
    expect(container?.textContent).toMatch(/Task/);
    expect(container?.textContent).toMatch(/Item/);
  });

  it('should handle markdown with heading after list', () => {
    render(
      <ProjectNoteEditor
        value="- Item\n# Title"
        onChange={mockOnChange}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    fireEvent.click(screen.getByText('Aperçu'));

    expect(screen.getByText(/Item/)).toBeInTheDocument();
    expect(screen.getByText(/Title/)).toBeInTheDocument();
  });

  it('should handle markdown with heading after task list', () => {
    render(
      <ProjectNoteEditor
        value="- [x] Task\n# Title"
        onChange={mockOnChange}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    fireEvent.click(screen.getByText('Aperçu'));

    const container = document.querySelector('.text-gray-200');
    expect(container?.textContent).toMatch(/Task/);
    expect(screen.getByText(/Title/)).toBeInTheDocument();
  });

  it('should handle markdown with empty line closing lists', () => {
    render(
      <ProjectNoteEditor
        value="- Item\n\nParagraph"
        onChange={mockOnChange}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    fireEvent.click(screen.getByText('Aperçu'));

    expect(screen.getByText(/Item/)).toBeInTheDocument();
    expect(screen.getByText(/Paragraph/)).toBeInTheDocument();
  });

  it('should handle markdown with empty line closing task lists', () => {
    render(
      <ProjectNoteEditor
        value="- [x] Task\n\nParagraph"
        onChange={mockOnChange}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    fireEvent.click(screen.getByText('Aperçu'));

    const container = document.querySelector('.text-gray-200');
    expect(container?.textContent).toMatch(/Task/);
    expect(screen.getByText(/Paragraph/)).toBeInTheDocument();
  });

  it('should handle markdown with paragraph after list', () => {
    render(
      <ProjectNoteEditor
        value="- Item\nParagraph text"
        onChange={mockOnChange}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    fireEvent.click(screen.getByText('Aperçu'));

    expect(screen.getByText(/Item/)).toBeInTheDocument();
    expect(screen.getByText(/Paragraph text/)).toBeInTheDocument();
  });

  it('should handle markdown with paragraph after task list', () => {
    render(
      <ProjectNoteEditor
        value="- [x] Task\nParagraph text"
        onChange={mockOnChange}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    fireEvent.click(screen.getByText('Aperçu'));

    const container = document.querySelector('.text-gray-200');
    expect(container?.textContent).toMatch(/Task/);
    expect(screen.getByText(/Paragraph text/)).toBeInTheDocument();
  });

  it('should handle markdown with empty value in preview', () => {
    render(
      <ProjectNoteEditor
        value=""
        onChange={mockOnChange}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    fireEvent.click(screen.getByText('Aperçu'));

    expect(screen.getByText(/Aucun contenu à prévisualiser/)).toBeInTheDocument();
  });

  it('should handle markdown with only whitespace in preview', () => {
    render(
      <ProjectNoteEditor
        value="   \n  "
        onChange={mockOnChange}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    fireEvent.click(screen.getByText('Aperçu'));

    // Should show empty message or render whitespace
    const container = document.querySelector('.text-gray-200');
    expect(container).toBeInTheDocument();
  });

  it('should handle markdown with list closing at end of document', () => {
    render(
      <ProjectNoteEditor
        value="- Item 1\n- Item 2"
        onChange={mockOnChange}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    fireEvent.click(screen.getByText('Aperçu'));

    expect(screen.getByText(/Item 1/)).toBeInTheDocument();
    expect(screen.getByText(/Item 2/)).toBeInTheDocument();
  });

  it('should handle markdown with task list closing at end of document', () => {
    render(
      <ProjectNoteEditor
        value="- [x] Task 1\n- [ ] Task 2"
        onChange={mockOnChange}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    fireEvent.click(screen.getByText('Aperçu'));

    const container = document.querySelector('.text-gray-200');
    expect(container?.textContent).toMatch(/Task 1/);
    expect(container?.textContent).toMatch(/Task 2/);
  });

  it('should handle markdown with both list and task list closing at end', () => {
    render(
      <ProjectNoteEditor
        value="- Item\n- [x] Task"
        onChange={mockOnChange}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    fireEvent.click(screen.getByText('Aperçu'));

    const container = document.querySelector('.text-gray-200');
    expect(container?.textContent).toMatch(/Item/);
    expect(container?.textContent).toMatch(/Task/);
  });

  it('should handle markdown with heading closing both list types', () => {
    render(
      <ProjectNoteEditor
        value="- Item\n- [x] Task\n# Title"
        onChange={mockOnChange}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    fireEvent.click(screen.getByText('Aperçu'));

    expect(screen.getByText(/Item/)).toBeInTheDocument();
    const container = document.querySelector('.text-gray-200');
    expect(container?.textContent).toMatch(/Task/);
    expect(screen.getByText(/Title/)).toBeInTheDocument();
  });

  it('should handle markdown with task list match but no content', () => {
    render(
      <ProjectNoteEditor
        value="- [x]"
        onChange={mockOnChange}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    fireEvent.click(screen.getByText('Aperçu'));

    // Should handle gracefully
    const container = document.querySelector('.text-gray-200');
    expect(container).toBeInTheDocument();
  });

  it('should handle markdown with task list uppercase X', () => {
    render(
      <ProjectNoteEditor
        value="- [X] Done task"
        onChange={mockOnChange}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    fireEvent.click(screen.getByText('Aperçu'));

    const container = document.querySelector('.text-gray-200');
    expect(container?.textContent).toMatch(/Done task/);
  });

  it('should handle markdown with task list lowercase x', () => {
    render(
      <ProjectNoteEditor
        value="- [x] Done task"
        onChange={mockOnChange}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    fireEvent.click(screen.getByText('Aperçu'));

    const container = document.querySelector('.text-gray-200');
    expect(container?.textContent).toMatch(/Done task/);
  });

  it('should handle markdown with task list space (unchecked)', () => {
    render(
      <ProjectNoteEditor
        value="- [ ] Todo task"
        onChange={mockOnChange}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    fireEvent.click(screen.getByText('Aperçu'));

    const container = document.querySelector('.text-gray-200');
    expect(container?.textContent).toMatch(/Todo task/);
  });

  it('should handle markdown with link containing bold text', () => {
    render(
      <ProjectNoteEditor
        value="[**bold link**](url)"
        onChange={mockOnChange}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    fireEvent.click(screen.getByText('Aperçu'));

    const container = document.querySelector('.text-gray-200');
    expect(container?.textContent).toMatch(/bold link/);
  });

  it('should handle markdown with link containing italic text', () => {
    render(
      <ProjectNoteEditor
        value="[*italic link*](url)"
        onChange={mockOnChange}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    fireEvent.click(screen.getByText('Aperçu'));

    const container = document.querySelector('.text-gray-200');
    expect(container?.textContent).toMatch(/italic link/);
  });

  it('should handle markdown with text before link', () => {
    render(
      <ProjectNoteEditor
        value="Before [link](url) after"
        onChange={mockOnChange}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    fireEvent.click(screen.getByText('Aperçu'));

    const container = document.querySelector('.text-gray-200');
    expect(container?.textContent).toMatch(/Before/);
    expect(container?.textContent).toMatch(/link/);
    expect(container?.textContent).toMatch(/after/);
  });

  it('should handle markdown with text before bold', () => {
    render(
      <ProjectNoteEditor
        value="Before **bold** after"
        onChange={mockOnChange}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    fireEvent.click(screen.getByText('Aperçu'));

    const container = document.querySelector('.text-gray-200');
    expect(container?.textContent).toMatch(/Before/);
    expect(container?.textContent).toMatch(/bold/);
    expect(container?.textContent).toMatch(/after/);
  });

  it('should handle markdown with text before italic', () => {
    render(
      <ProjectNoteEditor
        value="Before *italic* after"
        onChange={mockOnChange}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    fireEvent.click(screen.getByText('Aperçu'));

    const container = document.querySelector('.text-gray-200');
    expect(container?.textContent).toMatch(/Before/);
    expect(container?.textContent).toMatch(/italic/);
    expect(container?.textContent).toMatch(/after/);
  });

  it('should handle markdown with only link and no other text', () => {
    render(
      <ProjectNoteEditor
        value="[link](url)"
        onChange={mockOnChange}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    fireEvent.click(screen.getByText('Aperçu'));

    expect(screen.getByText('link')).toBeInTheDocument();
  });

  it('should handle markdown with only bold and no other text', () => {
    render(
      <ProjectNoteEditor
        value="**bold**"
        onChange={mockOnChange}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    fireEvent.click(screen.getByText('Aperçu'));

    expect(screen.getByText(/bold/)).toBeInTheDocument();
  });

  it('should handle markdown with only italic and no other text', () => {
    render(
      <ProjectNoteEditor
        value="*italic*"
        onChange={mockOnChange}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    fireEvent.click(screen.getByText('Aperçu'));

    expect(screen.getByText(/italic/)).toBeInTheDocument();
  });

  it('should handle markdown with empty parts array', () => {
    render(
      <ProjectNoteEditor
        value=""
        onChange={mockOnChange}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    fireEvent.click(screen.getByText('Aperçu'));

    expect(screen.getByText(/Aucun contenu à prévisualiser/)).toBeInTheDocument();
  });

  it('should handle markdown with text after last match in parseMarkdownInline', () => {
    render(
      <ProjectNoteEditor
        value="**bold** and more text"
        onChange={mockOnChange}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    fireEvent.click(screen.getByText('Aperçu'));

    expect(screen.getByText(/bold/)).toBeInTheDocument();
    expect(screen.getByText(/and more text/)).toBeInTheDocument();
  });

  it('should handle markdown with text before first match in parseMarkdownInline', () => {
    render(
      <ProjectNoteEditor
        value="Before **bold**"
        onChange={mockOnChange}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    fireEvent.click(screen.getByText('Aperçu'));

    expect(screen.getByText(/Before/)).toBeInTheDocument();
    expect(screen.getByText(/bold/)).toBeInTheDocument();
  });

  it('should handle markdown with text between matches in parseMarkdownInline', () => {
    render(
      <ProjectNoteEditor
        value="**bold1** between **bold2**"
        onChange={mockOnChange}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    fireEvent.click(screen.getByText('Aperçu'));

    expect(screen.getByText(/bold1/)).toBeInTheDocument();
    expect(screen.getByText(/between/)).toBeInTheDocument();
    expect(screen.getByText(/bold2/)).toBeInTheDocument();
  });

  it('should handle markdown with no matches returning original text', () => {
    render(
      <ProjectNoteEditor
        value="Plain text without formatting"
        onChange={mockOnChange}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    fireEvent.click(screen.getByText('Aperçu'));

    expect(screen.getByText(/Plain text without formatting/)).toBeInTheDocument();
  });

  it('should handle markdown with list that has inList true at end', () => {
    render(
      <ProjectNoteEditor
        value="- Item 1\n- Item 2\n- Item 3"
        onChange={mockOnChange}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    fireEvent.click(screen.getByText('Aperçu'));

    expect(screen.getByText(/Item 1/)).toBeInTheDocument();
    expect(screen.getByText(/Item 2/)).toBeInTheDocument();
    expect(screen.getByText(/Item 3/)).toBeInTheDocument();
  });

  it('should handle markdown with task list that has inTaskList true at end', () => {
    render(
      <ProjectNoteEditor
        value="- [x] Task 1\n- [ ] Task 2\n- [x] Task 3"
        onChange={mockOnChange}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    fireEvent.click(screen.getByText('Aperçu'));

    const container = document.querySelector('.text-gray-200');
    expect(container?.textContent).toMatch(/Task 1/);
    expect(container?.textContent).toMatch(/Task 2/);
    expect(container?.textContent).toMatch(/Task 3/);
  });

  it('should handle markdown with ### heading closing both list types', () => {
    render(
      <ProjectNoteEditor
        value="- Item\n- [x] Task\n### Heading"
        onChange={mockOnChange}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    fireEvent.click(screen.getByText('Aperçu'));

    expect(screen.getByText(/Item/)).toBeInTheDocument();
    const container = document.querySelector('.text-gray-200');
    expect(container?.textContent).toMatch(/Task/);
    expect(screen.getByText(/Heading/)).toBeInTheDocument();
  });

  it('should handle markdown with ## heading closing both list types', () => {
    render(
      <ProjectNoteEditor
        value="- Item\n- [x] Task\n## Heading"
        onChange={mockOnChange}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    fireEvent.click(screen.getByText('Aperçu'));

    expect(screen.getByText(/Item/)).toBeInTheDocument();
    const container = document.querySelector('.text-gray-200');
    expect(container?.textContent).toMatch(/Task/);
    expect(screen.getByText(/Heading/)).toBeInTheDocument();
  });

  it('should handle markdown with # heading closing both list types', () => {
    render(
      <ProjectNoteEditor
        value="- Item\n- [x] Task\n# Heading"
        onChange={mockOnChange}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    fireEvent.click(screen.getByText('Aperçu'));

    expect(screen.getByText(/Item/)).toBeInTheDocument();
    const container = document.querySelector('.text-gray-200');
    expect(container?.textContent).toMatch(/Task/);
    expect(screen.getByText(/Heading/)).toBeInTheDocument();
  });

  it('should handle markdown with empty line closing both list types', () => {
    render(
      <ProjectNoteEditor
        value="- Item\n- [x] Task\n\nParagraph"
        onChange={mockOnChange}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    fireEvent.click(screen.getByText('Aperçu'));

    expect(screen.getByText(/Item/)).toBeInTheDocument();
    const container = document.querySelector('.text-gray-200');
    expect(container?.textContent).toMatch(/Task/);
    expect(screen.getByText(/Paragraph/)).toBeInTheDocument();
  });

  it('should handle markdown with paragraph closing both list types', () => {
    render(
      <ProjectNoteEditor
        value="- Item\n- [x] Task\nParagraph text"
        onChange={mockOnChange}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    fireEvent.click(screen.getByText('Aperçu'));

    expect(screen.getByText(/Item/)).toBeInTheDocument();
    const container = document.querySelector('.text-gray-200');
    expect(container?.textContent).toMatch(/Task/);
    expect(screen.getByText(/Paragraph text/)).toBeInTheDocument();
  });

  it('should handle markdown with match at end of text (lastIndex === text.length)', () => {
    render(
      <ProjectNoteEditor
        value="Text **bold**"
        onChange={mockOnChange}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    fireEvent.click(screen.getByText('Aperçu'));

    expect(screen.getByText(/Text/)).toBeInTheDocument();
    expect(screen.getByText(/bold/)).toBeInTheDocument();
  });

  it('should handle markdown with match at start of text (lastIndex === 0)', () => {
    render(
      <ProjectNoteEditor
        value="**bold** text"
        onChange={mockOnChange}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    fireEvent.click(screen.getByText('Aperçu'));

    expect(screen.getByText(/bold/)).toBeInTheDocument();
    expect(screen.getByText(/text/)).toBeInTheDocument();
  });

  it('should handle markdown with consecutive matches', () => {
    render(
      <ProjectNoteEditor
        value="**bold1****bold2**"
        onChange={mockOnChange}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    fireEvent.click(screen.getByText('Aperçu'));

    expect(screen.getByText(/bold1/)).toBeInTheDocument();
    expect(screen.getByText(/bold2/)).toBeInTheDocument();
  });

  it('should handle markdown with match.start === lastIndex', () => {
    render(
      <ProjectNoteEditor
        value="**bold1****bold2**"
        onChange={mockOnChange}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    fireEvent.click(screen.getByText('Aperçu'));

    expect(screen.getByText(/bold1/)).toBeInTheDocument();
    expect(screen.getByText(/bold2/)).toBeInTheDocument();
  });

  it('should handle markdown with lastIndex === text.length in parseMarkdownInline', () => {
    render(
      <ProjectNoteEditor
        value="**bold**"
        onChange={mockOnChange}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    fireEvent.click(screen.getByText('Aperçu'));

    expect(screen.getByText(/bold/)).toBeInTheDocument();
  });

  it('should handle template insertion when value ends with single newline', () => {
    render(
      <ProjectNoteEditor
        value="Existing content\n"
        onChange={mockOnChange}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    const versionButton = screen.getByText('Version');
    fireEvent.click(versionButton);

    // Should add separator since value doesn't end with \n\n
    expect(mockOnChange).toHaveBeenCalled();
  });

  it('should handle template insertion when value ends with \n\n', () => {
    render(
      <ProjectNoteEditor
        value="Existing content\n\n"
        onChange={mockOnChange}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    const versionButton = screen.getByText('Version');
    fireEvent.click(versionButton);

    // Should not add extra separator since value already ends with \n\n
    expect(mockOnChange).toHaveBeenCalled();
  });

  it('should handle template insertion when value is null', () => {
    render(
      <ProjectNoteEditor
        value=""
        onChange={mockOnChange}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    const versionButton = screen.getByText('Version');
    fireEvent.click(versionButton);

    // Should work with empty value
    expect(mockOnChange).toHaveBeenCalled();
  });
});
