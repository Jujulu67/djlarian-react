/**
 * Tests for useFilteredTracks hook
 */
import { renderHook } from '@testing-library/react';

import { useFilteredTracks } from '../useFilteredTracks';
import type { Track } from '@/lib/utils/types';

const mockTracks: Track[] = [
  {
    id: '1',
    title: 'Track 1',
    artist: 'Artist 1',
    type: 'single',
    isPublished: true,
    featured: false,
    releaseDate: '2024-01-01',
    genre: ['Electronic'],
    publishAt: null,
  },
  {
    id: '2',
    title: 'Track 2',
    artist: 'Artist 2',
    type: 'album',
    isPublished: true,
    featured: true,
    releaseDate: '2024-02-01',
    genre: ['Rock'],
    publishAt: null,
  },
  {
    id: '3',
    title: 'Track 3',
    artist: 'Artist 1',
    type: 'single',
    isPublished: false,
    featured: false,
    releaseDate: '2024-03-01',
    genre: ['Pop'],
    publishAt: null,
  },
];

describe('useFilteredTracks', () => {
  it('should filter out unpublished tracks', () => {
    const { result } = renderHook(() =>
      useFilteredTracks({
        tracks: mockTracks,
        searchTerm: '',
        selectedType: 'all',
      })
    );

    expect(result.current).toHaveLength(2);
    expect(result.current.every((track) => track.isPublished)).toBe(true);
  });

  it('should filter by type', () => {
    const { result } = renderHook(() =>
      useFilteredTracks({
        tracks: mockTracks,
        searchTerm: '',
        selectedType: 'single',
      })
    );

    expect(result.current).toHaveLength(1);
    expect(result.current[0].type).toBe('single');
  });

  it('should filter by search term', () => {
    const { result } = renderHook(() =>
      useFilteredTracks({
        tracks: mockTracks,
        searchTerm: 'Artist 1',
        selectedType: 'all',
      })
    );

    expect(result.current).toHaveLength(1);
    expect(result.current[0].artist).toBe('Artist 1');
  });

  it('should sort by featured first, then by date', () => {
    const { result } = renderHook(() =>
      useFilteredTracks({
        tracks: mockTracks,
        searchTerm: '',
        selectedType: 'all',
      })
    );

    expect(result.current[0].featured).toBe(true);
    expect(result.current[0].id).toBe('2');
  });

  it('should filter by genre', () => {
    const { result } = renderHook(() =>
      useFilteredTracks({
        tracks: mockTracks,
        searchTerm: 'Rock',
        selectedType: 'all',
      })
    );

    expect(result.current).toHaveLength(1);
    expect(result.current[0].genre).toContain('Rock');
  });
});
