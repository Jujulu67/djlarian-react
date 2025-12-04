/**
 * Tests for ImportStreamsDialog Component
 * @jest-environment jsdom
 */
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ImportStreamsDialog } from '../ImportStreamsDialog';
import { Project } from '../types';

// Mock dependencies
jest.mock('@/components/ui/Modal', () => ({ children, onClose }: any) => (
  <div role="dialog">
    <button onClick={onClose}>Close Modal</button>
    {children}
  </div>
));

jest.mock('@/lib/utils/parseStreamsCsv', () => ({
  parseStreamsCsv: jest.fn(),
}));

jest.mock('@/lib/utils/calculateStreamsMilestones', () => ({
  calculateStreamsMilestones: jest.fn(),
}));

jest.mock('@/lib/utils/findProjectCandidates', () => ({
  findProjectCandidates: jest.fn(),
}));

// Mock lucide-react
jest.mock('lucide-react', () => ({
  Upload: () => <span>UploadIcon</span>,
  Check: () => <span>CheckIcon</span>,
  AlertCircle: () => <span>AlertIcon</span>,
  Loader2: () => <span>LoaderIcon</span>,
  FileText: () => <span>FileIcon</span>,
  X: () => <span>XIcon</span>,
  BarChart3: () => <span>ChartIcon</span>,
  ChevronLeft: () => <span>LeftIcon</span>,
  ChevronRight: () => <span>RightIcon</span>,
  Clock: () => <span>ClockIcon</span>,
}));

import { parseStreamsCsv } from '@/lib/utils/parseStreamsCsv';
import { calculateStreamsMilestones } from '@/lib/utils/calculateStreamsMilestones';
import { findProjectCandidates } from '@/lib/utils/findProjectCandidates';

const mockProjects: Project[] = [
  {
    id: 'p1',
    name: 'Project 1',
    releaseDate: '2023-01-01',
    status: 'EN_COURS',
    artist: 'Artist 1',
    type: 'single',
    coverImage: 'img1.jpg',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'p2',
    name: 'Project 2',
    releaseDate: '2023-02-01',
    status: 'EN_COURS',
    artist: 'Artist 2',
    type: 'album',
    coverImage: 'img2.jpg',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const mockOnClose = jest.fn();
const mockOnImport = jest.fn();

const defaultProps = {
  isOpen: true,
  onClose: mockOnClose,
  onImport: mockOnImport,
  projects: mockProjects,
};

describe('ImportStreamsDialog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (parseStreamsCsv as jest.Mock).mockReturnValue({
      projectName: 'Project 1',
      streams: [{ date: '2023-01-02', streams: 1000 }],
      errors: [],
    });
    (findProjectCandidates as jest.Mock).mockReturnValue([
      { project: mockProjects[0], score: 100, reason: 'Exact match' },
    ]);
    (calculateStreamsMilestones as jest.Mock).mockReturnValue({
      streamsJ7: 1000,
      streamsJ14: 2000,
      streamsJ21: 3000,
      streamsJ28: 4000,
      streamsJ56: 5000,
      streamsJ84: 6000,
      streamsJ180: 10000,
      streamsJ365: 20000,
    });

    // Mock File.prototype.text
    File.prototype.text = jest.fn().mockResolvedValue('date,streams\n2023-01-01,100');
  });

  it('should render nothing when closed', () => {
    render(<ImportStreamsDialog {...defaultProps} isOpen={false} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('should render upload step initially', () => {
    render(<ImportStreamsDialog {...defaultProps} />);
    expect(screen.getByText('Importer des Streams CSV')).toBeInTheDocument();
    expect(screen.getByText('Glissez-déposez vos fichiers CSV ici')).toBeInTheDocument();
  });

  it('should handle file selection and process it', async () => {
    const user = userEvent.setup();
    render(<ImportStreamsDialog {...defaultProps} />);

    const file = new File(['date,streams\n2023-01-01,100'], 'test.csv', { type: 'text/csv' });
    // Input is hidden, select by type
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

    // Since the input is hidden and linked via ref, we might need to find it by selector if label doesn't work directly
    // The component has: <button onClick={() => fileInputRef.current?.click()}>Sélectionner...</button>
    // And <input type="file" className="hidden" ... />
    // userEvent.upload works on the input element.
    // Let's find the input directly
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(fileInput, file);

    await waitFor(() => {
      const elements = screen.getAllByText(/Project 1/);
      expect(elements.length).toBeGreaterThan(0);
    });

    expect(parseStreamsCsv).toHaveBeenCalled();
    expect(findProjectCandidates).toHaveBeenCalled();
  });

  it('should show candidates and allow selection', async () => {
    (findProjectCandidates as jest.Mock).mockReturnValue([
      { project: mockProjects[0], score: 90, reason: 'High match' },
      { project: mockProjects[1], score: 50, reason: 'Low match' },
    ]);

    const user = userEvent.setup();
    render(<ImportStreamsDialog {...defaultProps} />);

    const file = new File(['content'], 'test.csv', { type: 'text/csv' });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(fileInput, file);

    await waitFor(() => {
      expect(screen.getByText('Sélectionner un projet:')).toBeInTheDocument();
    });

    // Select first candidate
    const radio = screen.getAllByRole('radio')[0];
    await user.click(radio);

    // Should show validated status (since handleSelectProject auto-validates)
    await waitFor(() => {
      expect(screen.getByText('Validé')).toBeInTheDocument();
    });
  });

  it('should handle import execution', async () => {
    const user = userEvent.setup();
    render(<ImportStreamsDialog {...defaultProps} />);

    const file = new File(['content'], 'test.csv', { type: 'text/csv' });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(fileInput, file);

    await waitFor(() => {
      expect(screen.getByText('Match exact trouvé!')).toBeInTheDocument();
    });

    // Since it's an exact match (score 100), it might auto-validate or show "Match exact trouvé!"
    // The component logic: if score >= 80, it auto-selects.
    // And if auto-selected, it marks as validated?
    // Let's check the code:
    // "Si un fichier a été auto-sélectionné (score >= 80), le marquer comme validé" in handleFiles.

    // So it should be validated.
    // Check if "Importer (1)" button is enabled.
    const importButton = screen.getByText(/Importer \(1\)/i);
    expect(importButton).toBeEnabled();

    mockOnImport.mockResolvedValue({ success: true, updated: 1, failed: 0 });
    await user.click(importButton);

    expect(mockOnImport).toHaveBeenCalled();
    await waitFor(() => {
      expect(screen.getByText('Import réussi!')).toBeInTheDocument();
    });
  });

  it('should handle import errors', async () => {
    const user = userEvent.setup();
    render(<ImportStreamsDialog {...defaultProps} />);

    const file = new File(['content'], 'test.csv', { type: 'text/csv' });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(fileInput, file);

    await waitFor(() => {
      expect(screen.getByText('Match exact trouvé!')).toBeInTheDocument();
    });

    const importButton = screen.getByText(/Importer \(1\)/i);
    mockOnImport.mockRejectedValue(new Error('Import failed'));
    await user.click(importButton);

    await waitFor(() => {
      expect(screen.getByText("Erreur lors de l'import")).toBeInTheDocument();
    });
  });
});
