'use client';

import { useEffect } from 'react';
import { Project } from '@/components/projects';

interface UseScrollToNewProjectParams {
  filteredAndSortedProjects: Project[];
  lastCreatedProjectId: string | null;
  setLastCreatedProjectId: React.Dispatch<React.SetStateAction<string | null>>;
}

export function useScrollToNewProject({
  filteredAndSortedProjects,
  lastCreatedProjectId,
  setLastCreatedProjectId,
}: UseScrollToNewProjectParams) {
  // Scroll vers le nouveau projet après création et réinitialiser l'animation après 2s
  useEffect(() => {
    if (lastCreatedProjectId) {
      // Attendre que le DOM soit mis à jour
      const timer = setTimeout(() => {
        // Scroller jusqu'en bas de la fenêtre
        window.scrollTo({
          top: document.documentElement.scrollHeight,
          behavior: 'smooth',
        });
      }, 150);

      // Réinitialiser l'ID après l'animation (2 secondes)
      const resetTimer = setTimeout(() => {
        setLastCreatedProjectId(null);
      }, 2000);

      return () => {
        clearTimeout(timer);
        clearTimeout(resetTimer);
      };
    }
  }, [lastCreatedProjectId, filteredAndSortedProjects]);
}
