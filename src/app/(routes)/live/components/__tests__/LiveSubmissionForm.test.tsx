import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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
});
