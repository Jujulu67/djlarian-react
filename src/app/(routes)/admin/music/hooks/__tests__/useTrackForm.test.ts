import { renderHook, act } from '@testing-library/react';
import { useTrackForm } from '../useTrackForm';
import { emptyTrackForm } from '@/lib/utils/music-helpers';
import type { Track } from '@/lib/utils/types';

// Mock des dépendances
jest.mock('@/lib/utils/music-helpers', () => ({
  emptyTrackForm: {
    title: '',
    artist: 'DJ Larian',
    imageId: null,
    releaseDate: new Date().toISOString().split('T')[0],
    genre: [],
    type: 'single',
    description: '',
    featured: false,
    platforms: {},
  },
}));

describe('useTrackForm', () => {
  it('should initialize with empty form', () => {
    const { result } = renderHook(() => useTrackForm());

    expect(result.current.currentForm.title).toBe('');
    expect(result.current.isEditing).toBe(false);
    expect(result.current.isSubmitting).toBe(false);
    expect(result.current.genreInput).toBe('');
    expect(result.current.coverPreview).toBe('');
  });

  it('should update currentForm when setCurrentForm is called', () => {
    const { result } = renderHook(() => useTrackForm());

    act(() => {
      result.current.setCurrentForm({
        ...emptyTrackForm,
        title: 'Test Track',
      });
    });

    expect(result.current.currentForm.title).toBe('Test Track');
  });

  it('should handle edit correctly', () => {
    const { result } = renderHook(() => useTrackForm());

    const mockTrack: Track = {
      id: 'test-id',
      title: 'Test Track',
      artist: 'Test Artist',
      imageId: 'img-123',
      releaseDate: new Date().toISOString(),
      genre: ['House'],
      type: 'single',
      description: 'Test description',
      featured: false,
      isPublished: true,
      platforms: {
        spotify: { url: 'https://spotify.com/track', embedId: '123' },
      },
    };

    act(() => {
      result.current.handleEdit(mockTrack);
    });

    expect(result.current.currentForm.title).toBe('Test Track');
    expect(result.current.isEditing).toBe(true);
    expect(result.current.coverPreview).toBe('/uploads/img-123.jpg');
  });

  it('should reset form correctly', () => {
    const { result } = renderHook(() => useTrackForm());

    // Set some values first
    act(() => {
      result.current.setCurrentForm({
        ...emptyTrackForm,
        title: 'Test Track',
      });
      result.current.setGenreInput('House');
      result.current.setCoverPreview('preview.jpg');
      result.current.setIsEditing(true);
    });

    // Reset
    act(() => {
      result.current.resetForm();
    });

    expect(result.current.currentForm.title).toBe('');
    expect(result.current.genreInput).toBe('');
    expect(result.current.coverPreview).toBe('');
    expect(result.current.isEditing).toBe(false);
  });
});

