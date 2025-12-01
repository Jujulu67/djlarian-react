import { useState, useMemo, useCallback } from 'react';
import type { SubmissionWithUser } from './useAdminLiveSubmissions';

export function useAdminLiveFilters(submissions: SubmissionWithUser[]) {
  const [searchUsername, setSearchUsername] = useState('');
  const [showRolled, setShowRolled] = useState(true);
  const [onlyActive, setOnlyActive] = useState(false);

  const filteredSubmissions = useMemo(() => {
    let filtered = submissions;

    // Filtrer par username
    if (searchUsername) {
      const searchLower = searchUsername.toLowerCase();
      filtered = filtered.filter(
        (s) =>
          s.User.name?.toLowerCase().includes(searchLower) ||
          s.User.email?.toLowerCase().includes(searchLower)
      );
    }

    // Filtrer par rolled
    if (!showRolled) {
      filtered = filtered.filter((s) => !s.isRolled);
    }

    // TODO: Implémenter "Only Active" (utilisateurs actifs dans le chat Twitch < 10 min)
    if (onlyActive) {
      // Pour l'instant, on garde tous les utilisateurs
      // filtered = filtered.filter((s) => isUserActiveInTwitchChat(s.User.id));
    }

    return filtered;
  }, [submissions, searchUsername, showRolled, onlyActive]);

  const resetFilters = useCallback(() => {
    setSearchUsername('');
    setShowRolled(true);
    setOnlyActive(false);
  }, []);

  return {
    searchUsername,
    setSearchUsername,
    showRolled,
    setShowRolled,
    onlyActive,
    setOnlyActive,
    filteredSubmissions,
    resetFilters,
  };
}
