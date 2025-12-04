/**
 * Tests for ImportProjectsDialog component
 * @jest-environment jsdom
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ImportProjectsDialog } from '../ImportProjectsDialog';
import { ParsedProjectRow } from '@/lib/utils/parseExcelData';

// Mock dependencies
jest.mock('@/lib/utils/parseExcelData', () => ({
  parseExcelData: jest.fn(),
}));

// Mock fetch
global.fetch = jest.fn();

// Mock window.alert
window.alert = jest.fn();

const mockOnImport = jest.fn();
const mockOnClose = jest.fn();

const mockParsedRows: ParsedProjectRow[] = [
  {
    name: 'Project 1',
    status: 'EN_COURS',
    style: 'Techno',
    rowIndex: 1,
  },
  {
    name: 'Project 2',
    status: 'TERMINE',
    style: 'House',
    rowIndex: 2,
  },
];

describe('ImportProjectsDialog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ data: [] }), // No existing projects
    });
    // Setup default mock for parseExcelData
    const { parseExcelData } = require('@/lib/utils/parseExcelData');
    parseExcelData.mockReturnValue(mockParsedRows);
  });

  it('should not render when isOpen is false', () => {
    render(<ImportProjectsDialog isOpen={false} onClose={mockOnClose} onImport={mockOnImport} />);
    expect(screen.queryByText('Importer des projets depuis Excel/CSV')).not.toBeInTheDocument();
  });

  it('should render correctly when open', () => {
    render(<ImportProjectsDialog isOpen={true} onClose={mockOnClose} onImport={mockOnImport} />);
    expect(screen.getByText('Importer des projets depuis Excel/CSV')).toBeInTheDocument();
    expect(screen.getByText(/Collez les données depuis Excel/i)).toBeInTheDocument();
  });

  it('should handle text paste and analysis', async () => {
    const user = userEvent.setup();
    render(<ImportProjectsDialog isOpen={true} onClose={mockOnClose} onImport={mockOnImport} />);

    // Paste text
    const textarea = screen.getByRole('textbox');
    await user.type(textarea, 'Project 1,Techno,EN_COURS');

    // Click Analyser
    const analyzeButton = screen.getByText('Analyser les données');
    await user.click(analyzeButton);

    // Should call parseExcelData
    const { parseExcelData } = require('@/lib/utils/parseExcelData');
    expect(parseExcelData).toHaveBeenCalled();

    // Should show preview
    await waitFor(() => {
      expect(screen.getByText('Aperçu des données')).toBeInTheDocument();
    });
    expect(screen.getByDisplayValue('Project 1')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Project 2')).toBeInTheDocument();
  });

  it('should handle import execution', async () => {
    const user = userEvent.setup();
    mockOnImport.mockResolvedValue({ success: true, created: 2, failed: 0 });

    render(<ImportProjectsDialog isOpen={true} onClose={mockOnClose} onImport={mockOnImport} />);

    // Go to preview
    const textarea = screen.getByRole('textbox');
    await user.type(textarea, 'data');
    await user.click(screen.getByText('Analyser les données'));

    // Wait for preview
    await waitFor(() => {
      expect(screen.getByText(/Importer 2 projet\(s\)/)).toBeInTheDocument();
    });

    // Click Import
    await user.click(screen.getByText(/Importer 2 projet\(s\)/));

    // Should call onImport
    expect(mockOnImport).toHaveBeenCalledWith(mockParsedRows, false);

    // Should show result
    await waitFor(() => {
      expect(screen.getByText('Import réussi !')).toBeInTheDocument();
    });
    expect(screen.getByText('2 projet(s) créé(s)')).toBeInTheDocument();
  });

  it('should handle errors during import', async () => {
    const user = userEvent.setup();
    mockOnImport.mockRejectedValue(new Error('Import failed'));

    render(<ImportProjectsDialog isOpen={true} onClose={mockOnClose} onImport={mockOnImport} />);

    // Go to preview
    const textarea = screen.getByRole('textbox');
    await user.type(textarea, 'data');
    await user.click(screen.getByText('Analyser les données'));

    // Wait for preview
    await waitFor(() => {
      expect(screen.getByText(/Importer 2 projet\(s\)/)).toBeInTheDocument();
    });

    // Click Import
    await user.click(screen.getByText(/Importer 2 projet\(s\)/));

    // Should show error result
    await waitFor(() => {
      expect(screen.getByText("Erreur lors de l'import")).toBeInTheDocument();
    });
  });

  it('should detect duplicates', async () => {
    // Mock existing projects to cause duplicate detection
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [{ name: 'Project 1', status: 'EN_COURS' }],
      }),
    });

    const user = userEvent.setup();
    render(<ImportProjectsDialog isOpen={true} onClose={mockOnClose} onImport={mockOnImport} />);

    // Go to preview
    const textarea = screen.getByRole('textbox');
    await user.type(textarea, 'data');
    await user.click(screen.getByText('Analyser les données'));

    // Wait for preview and duplicate warning
    await waitFor(() => {
      expect(screen.getByText(/1 doublon\(s\)/)).toBeInTheDocument();
    });
  });
});
