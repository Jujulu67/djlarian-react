import { useMemo } from 'react';

import { Track, MusicType } from '@/lib/utils/types';

interface UseFilteredTracksParams {
  tracks: Track[];
  searchTerm: string;
  selectedType: MusicType | 'all';
}

/**
 * Hook to filter and sort tracks based on search term and type
 * Memoized to avoid recalculating on every render
 */
export function useFilteredTracks({ tracks, searchTerm, selectedType }: UseFilteredTracksParams) {
  return useMemo(() => {
    let filtered = [...tracks];

    // Filter only published tracks (isPublished && (no publishAt or publishAt passed))
    const now = new Date();
    filtered = filtered.filter(
      (track) => track.isPublished && (!track.publishAt || new Date(track.publishAt) <= now)
    );

    // Filter by type
    if (selectedType !== 'all') {
      filtered = filtered.filter((track) => track.type === selectedType);
    }

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (track) =>
          track.title.toLowerCase().includes(term) ||
          track.artist.toLowerCase().includes(term) ||
          track.genre.some((g) => g.toLowerCase().includes(term))
      );
    }

    // Sort: featured first, then by date (newest to oldest)
    filtered.sort((a, b) => {
      if (a.featured && !b.featured) return -1;
      if (!a.featured && b.featured) return 1;

      const dateA = new Date(a.releaseDate);
      const dateB = new Date(b.releaseDate);
      return dateB.getTime() - dateA.getTime();
    });

    return filtered;
  }, [tracks, selectedType, searchTerm]);
}
