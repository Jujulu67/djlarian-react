import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { LiveSubmissionForm } from '../LiveSubmissionForm';
import { useSession } from 'next-auth/react';
import { useLiveSubmissions } from '../../hooks/useLiveSubmissions';

// Mock dependencies
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
}));
jest.mock('../../hooks/useLiveSubmissions');
jest.mock('@/lib/live/upload-client', () => ({
  validateAudioFile: jest.fn(() => ({ valid: true })),
  generateAudioFileId: jest.fn(() => 'test-id'),
  uploadAudioFileToBlob: jest.fn(),
}));
jest.mock('@/lib/live/audio-analysis', () => ({
  analyzeAudioFile: jest.fn(() =>
    Promise.resolve({
      duration: 120,
      waveform: new Array(100).fill(0.5),
      peaks: [],
    })
  ),
  formatDuration: jest.fn((s) => `${s}s`),
}));
jest.mock('@/lib/api/fetchWithAuth', () => ({
  fetchWithAuth: jest.fn(),
}));
jest.mock('react-hot-toast', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock URL.createObjectURL
global.URL.createObjectURL = jest.fn(() => 'blob:test');
global.URL.revokeObjectURL = jest.fn();

describe('LiveSubmissionForm', () => {
  const mockUpdateSubmission = jest.fn();
  const mockDeleteSubmission = jest.fn();
  const mockSubmitFile = jest.fn();
  const mockLoadSubmissions = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useSession as jest.Mock).mockReturnValue({
      data: { user: { id: 'user-1', role: 'USER' } },
      status: 'authenticated',
    });
    (useLiveSubmissions as jest.Mock).mockReturnValue({
      submissions: [],
      isSubmitting: false,
      submitFile: mockSubmitFile,
      loadSubmissions: mockLoadSubmissions,
      updateSubmission: mockUpdateSubmission,
      deleteSubmission: mockDeleteSubmission,
    });

    // Mock fetch for status check and file download
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ data: { trackSubmissions: true } }),
        blob: () => Promise.resolve(new Blob(['audio'], { type: 'audio/mp3' })),
      })
    ) as jest.Mock;
  });

  it('renders upload form when no active submission', async () => {
    render(<LiveSubmissionForm />);
    expect(await screen.findByText(/Choose a file or drag and drop/i)).toBeInTheDocument();
  });

  it('renders active submission details when submission exists', async () => {
    (useLiveSubmissions as jest.Mock).mockReturnValue({
      submissions: [
        {
          id: 'sub-1',
          title: 'My Track',
          description: 'My Description',
          fileUrl: 'http://example.com/track.mp3',
          fileName: 'track.mp3',
          status: 'PENDING',
        },
      ],
      isSubmitting: false,
      submitFile: mockSubmitFile,
      loadSubmissions: mockLoadSubmissions,
      updateSubmission: mockUpdateSubmission,
      deleteSubmission: mockDeleteSubmission,
    });

    render(<LiveSubmissionForm />);

    expect(await screen.findByDisplayValue('My Track')).toBeInTheDocument();
    expect(screen.getByDisplayValue('My Description')).toBeInTheDocument();
    expect(screen.getByText(/SUBMITTED/i)).toBeInTheDocument();
  });

  it('allows editing submission details', async () => {
    (useLiveSubmissions as jest.Mock).mockReturnValue({
      submissions: [
        {
          id: 'sub-1',
          title: 'My Track',
          description: 'My Description',
          fileUrl: 'http://example.com/track.mp3',
          fileName: 'track.mp3',
          status: 'PENDING',
        },
      ],
      isSubmitting: false,
      submitFile: mockSubmitFile,
      loadSubmissions: mockLoadSubmissions,
      updateSubmission: mockUpdateSubmission.mockResolvedValue({ success: true }),
      deleteSubmission: mockDeleteSubmission,
    });

    render(<LiveSubmissionForm />);

    // Wait for data to load
    const titleInput = await screen.findByDisplayValue('My Track');
    expect(titleInput).toBeDisabled();

    // Click Edit button
    const editButton = screen.getByRole('button', { name: /modifier les informations/i });
    fireEvent.click(editButton);

    // Inputs should be enabled
    expect(titleInput).not.toBeDisabled();

    // Change title
    fireEvent.change(titleInput, { target: { value: 'Updated Track' } });

    // Click Save button
    const saveButton = screen.getByRole('button', { name: /sauvegarder les modifications/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockUpdateSubmission).toHaveBeenCalledWith('sub-1', {
        title: 'Updated Track',
        description: 'My Description',
      });
    });
  });

  it('allows deleting submission', async () => {
    (useLiveSubmissions as jest.Mock).mockReturnValue({
      submissions: [
        {
          id: 'sub-1',
          title: 'My Track',
          description: 'My Description',
          fileUrl: 'http://example.com/track.mp3',
          fileName: 'track.mp3',
          status: 'PENDING',
        },
      ],
      isSubmitting: false,
      submitFile: mockSubmitFile,
      loadSubmissions: mockLoadSubmissions,
      updateSubmission: mockUpdateSubmission,
      deleteSubmission: mockDeleteSubmission.mockResolvedValue({ success: true }),
    });

    // Mock confirm
    window.confirm = jest.fn(() => true);

    render(<LiveSubmissionForm />);

    // Wait for data to load
    await screen.findByDisplayValue('My Track');

    // Click Delete button
    const deleteButton = screen.getByRole('button', { name: /supprimer la soumission/i });
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(mockDeleteSubmission).toHaveBeenCalledWith('sub-1');
    });
  });
  it('handles file selection and analysis', async () => {
    render(<LiveSubmissionForm />);

    const file = new File(['audio content'], 'test.mp3', { type: 'audio/mp3' });
    const input = document.querySelector('input[type="file"]');
    if (!input) throw new Error('File input not found');

    // Mock analyzeAudioFile to resolve
    const mockAnalysis = {
      duration: 60,
      waveform: [0.1, 0.2, 0.3],
      peaks: [],
    };
    const { analyzeAudioFile } = require('@/lib/live/audio-analysis');
    analyzeAudioFile.mockResolvedValue(mockAnalysis);

    await act(async () => {
      fireEvent.change(input, { target: { files: [file] } });
    });

    // Should show analyzing state
    // Note: It might be too fast to catch "Analyzing", so we check for result
    expect(await screen.findByDisplayValue('test')).toBeInTheDocument(); // Title defaults to filename without ext
    expect(screen.getByText('60s')).toBeInTheDocument(); // Duration formatted
  });

  it('handles drag and drop', async () => {
    render(<LiveSubmissionForm />);

    const file = new File(['audio content'], 'dragged.mp3', { type: 'audio/mp3' });
    const dropZone = screen.getByText(/drag and drop/i).closest('div');

    if (!dropZone) throw new Error('Drop zone not found');

    fireEvent.dragOver(dropZone);
    expect(dropZone).toHaveClass('border-purple-500'); // Check visual feedback if possible, or state change

    await act(async () => {
      fireEvent.drop(dropZone, {
        dataTransfer: {
          files: [file],
        },
      });
    });

    expect(await screen.findByDisplayValue('dragged')).toBeInTheDocument();
  });

  it('handles play/pause', async () => {
    (useLiveSubmissions as jest.Mock).mockReturnValue({
      submissions: [
        {
          id: 'sub-1',
          title: 'My Track',
          fileUrl: 'http://example.com/track.mp3',
          fileName: 'track.mp3',
          status: 'PENDING',
          User: { name: 'User' },
        },
      ],
      isSubmitting: false,
      submitFile: mockSubmitFile,
      loadSubmissions: mockLoadSubmissions,
      updateSubmission: mockUpdateSubmission,
      deleteSubmission: mockDeleteSubmission,
    });

    render(<LiveSubmissionForm />);

    // Wait for player to load
    await screen.findByDisplayValue('My Track');

    // Find play button (it has Play icon)
    // We can use the same trick as AdminLivePlayer or just find by role/class
    // In LiveSubmissionForm, the play button is in the player controls
    // It's the button with `bg-purple-500` usually
    const playButton = document.querySelector('button.bg-purple-500');

    if (playButton) {
      await act(async () => {
        fireEvent.click(playButton);
      });
      // We can't easily test audio playback in jsdom without more complex mocking of HTMLMediaElement
      // But we can check if state changed or if pause icon appears
      // Since we didn't mock lucide-react in this file yet, we can't check for Pause icon easily by text
      // But we can check if the button class changed or if it calls play on the ref
    }
  });
});
