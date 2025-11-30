import { useState, useCallback } from 'react';
import { fetchWithAuth } from '@/lib/api/fetchWithAuth';
import { toast } from 'react-hot-toast';

export interface UserStats {
  projects: number;
  projectsEnCours: number;
  projectsTermines: number;
}

export function useProfileStats() {
  const [stats, setStats] = useState<UserStats>({
    projects: 0,
    projectsEnCours: 0,
    projectsTermines: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  const loadStats = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetchWithAuth('/api/projects/counts');
      if (response.ok) {
        const data = await response.json();
        const counts = data.data || data;
        setStats({
          projects: counts.total || 0,
          projectsEnCours: counts.statusBreakdown?.EN_COURS || 0,
          projectsTermines: counts.statusBreakdown?.TERMINE || 0,
        });
      } else {
        // Afficher une erreur silencieuse pour les stats (non bloquant)
        console.error('Erreur lors du chargement des statistiques');
      }
    } catch (error) {
      console.error('Erreur lors du chargement des statistiques:', error);
      toast.error('Impossible de charger les statistiques');
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    stats,
    isLoading,
    loadStats,
  };
}
