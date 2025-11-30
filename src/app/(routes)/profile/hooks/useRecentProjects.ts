import { useState, useCallback } from 'react';
import { fetchWithAuth } from '@/lib/api/fetchWithAuth';

export interface RecentProject {
  id: string;
  name: string;
  status: string;
  updatedAt: string;
  releaseDate?: string | null;
}

export function useRecentProjects() {
  const [recentProjects, setRecentProjects] = useState<RecentProject[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadRecentProjects = useCallback(async (totalProjects: number) => {
    if (totalProjects === 0) return; // Pas besoin de charger si aucun projet
    try {
      setIsLoading(true);
      const response = await fetchWithAuth('/api/projects?limit=3&includeUser=false');
      if (response.ok) {
        const data = await response.json();
        const projects = data.data || data;
        // Trier par updatedAt desc pour avoir les plus récents
        const sorted = Array.isArray(projects)
          ? projects
              .sort((a: RecentProject, b: RecentProject) => {
                const dateA = new Date(a.updatedAt || 0).getTime();
                const dateB = new Date(b.updatedAt || 0).getTime();
                return dateB - dateA;
              })
              .slice(0, 3)
          : [];
        setRecentProjects(sorted);
      }
    } catch (error) {
      // Erreur silencieuse, non bloquant
      console.error('Erreur lors du chargement des projets récents:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    recentProjects,
    isLoading,
    loadRecentProjects,
  };
}
