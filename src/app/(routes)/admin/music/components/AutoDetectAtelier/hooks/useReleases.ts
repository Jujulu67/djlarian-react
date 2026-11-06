import { useState, useMemo } from 'react';

import type { DetectedRelease } from '@/lib/services/types';

interface UseReleasesParams {
  searchTerm: string;
  hideImported: boolean;
  showScheduledOnly: boolean;
}

export function useReleases({ searchTerm, hideImported, showScheduledOnly }: UseReleasesParams) {
  const [releases, setReleases] = useState<DetectedRelease[]>([]);
  const [isLoadingReleases, setIsLoadingReleases] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filtrage local
  const filteredReleases = useMemo(() => {
    let filtered = [...releases];

    if (searchTerm) {
      filtered = filtered.filter(
        (r) =>
          r.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          r.artist.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    if (showScheduledOnly) {
      filtered = filtered.filter((r) => r.isScheduled === true);
    }
    if (hideImported) {
      filtered = filtered.filter((r) => !r.exists);
    }
    return filtered;
  }, [releases, searchTerm, hideImported, showScheduledOnly]);

  return {
    releases,
    setReleases,
    isLoadingReleases,
    setIsLoadingReleases,
    error,
    setError,
    filteredReleases,
  };
}
