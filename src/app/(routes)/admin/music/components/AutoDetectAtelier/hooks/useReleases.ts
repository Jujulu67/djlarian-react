import { useState, useEffect } from 'react';

import { logger } from '@/lib/logger';
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
  const [filteredReleases, setFilteredReleases] = useState<DetectedRelease[]>([]);

  // Filtrage local
  useEffect(() => {
    logger.debug('[AUTO-DETECT] Filtrage - hideImported:', hideImported);
    logger.debug('[AUTO-DETECT] Filtrage - showScheduledOnly:', showScheduledOnly);
    logger.debug('[AUTO-DETECT] Filtrage - releases totales:', releases.length);
    logger.debug(
      '[AUTO-DETECT] Filtrage - releases avec exists=true:',
      releases.filter((r) => r.exists).length
    );
    logger.debug(
      '[AUTO-DETECT] Filtrage - releases scheduled:',
      releases.filter((r) => r.isScheduled).length
    );
    logger.debug('[AUTO-DETECT] Filtrage - searchTerm:', searchTerm);

    let filtered = [...releases];
    logger.debug('[AUTO-DETECT] Filtrage - après copie:', filtered.length);

    if (searchTerm) {
      filtered = filtered.filter(
        (r) =>
          r.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          r.artist.toLowerCase().includes(searchTerm.toLowerCase())
      );
      logger.debug('[AUTO-DETECT] Filtrage - après searchTerm:', filtered.length);
    }
    if (showScheduledOnly) {
      const beforeFilter = filtered.length;
      filtered = filtered.filter((r) => r.isScheduled === true);
      logger.debug('[AUTO-DETECT] Filtrage - avant showScheduledOnly:', beforeFilter);
      logger.debug('[AUTO-DETECT] Filtrage - après showScheduledOnly:', filtered.length);
    }
    if (hideImported) {
      const beforeFilter = filtered.length;
      filtered = filtered.filter((r) => !r.exists);
      logger.debug('[AUTO-DETECT] Filtrage - avant hideImported:', beforeFilter);
      logger.debug('[AUTO-DETECT] Filtrage - après hideImported:', filtered.length);
      logger.debug(
        '[AUTO-DETECT] Filtrage - releases filtrées (exists=true):',
        releases
          .filter((r) => r.exists)
          .map((r) => ({ id: r.id, title: r.title, exists: r.exists }))
      );
    }
    logger.debug('[AUTO-DETECT] Filtrage - résultat final:', filtered.length);
    setFilteredReleases(filtered);
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
