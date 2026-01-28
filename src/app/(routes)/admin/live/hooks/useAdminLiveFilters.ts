import { useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import type { SubmissionWithUser } from './useAdminLiveSubmissions';

export function useAdminLiveFilters(submissions: SubmissionWithUser[]) {
  const searchParams = useSearchParams();

  const searchUsername = searchParams.get('search') || '';
  const statusFilter = searchParams.get('status') || '';
  const showRolled = searchParams.get('showRolled') !== 'false'; // Par défaut true
  const onlyActive = searchParams.get('onlyActive') === 'true'; // Par défaut false

  const filteredSubmissions = useMemo(() => {
    let filtered = submissions;

    // Filtrer par username/title
    if (searchUsername) {
      const searchLower = searchUsername.toLowerCase();
      filtered = filtered.filter(
        (s) =>
          s.User.name?.toLowerCase().includes(searchLower) ||
          s.User.email?.toLowerCase().includes(searchLower) ||
          s.title.toLowerCase().includes(searchLower)
      );
    }

    // Filtrer par statut (depuis SubmissionsFilters)
    if (statusFilter) {
      filtered = filtered.filter((s) => s.status === statusFilter);
    }

    // Filtrer par rolled
    if (!showRolled) {
      filtered = filtered.filter((s) => !s.isRolled);
    }

    // TODO: Implémenter "Only Active"
    if (onlyActive) {
      // Pour l'instant, on garde tous les utilisateurs
    }

    return filtered;
  }, [submissions, searchUsername, statusFilter, showRolled, onlyActive]);

  return {
    searchUsername,
    showRolled,
    onlyActive,
    filteredSubmissions,
  };
}
