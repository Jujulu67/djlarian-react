import { useState, useCallback, useEffect } from 'react';
import { fetchWithAuth } from '@/lib/api/fetchWithAuth';
import type { LiveChances } from '@/types/live';

export function useLiveChances() {
  const [chances, setChances] = useState<LiveChances | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadChances = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetchWithAuth('/api/live/chances');
      if (response.ok) {
        const data = await response.json();
        setChances(data.data);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Erreur lors du calcul des chances');
      }
    } catch (err) {
      setError('Erreur de connexion');
      console.error('[Live] Erreur calcul chances:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Recharger automatiquement toutes les minutes
  useEffect(() => {
    loadChances();
    const interval = setInterval(loadChances, 60000); // 1 minute
    return () => clearInterval(interval);
  }, [loadChances]);

  return {
    chances,
    isLoading,
    error,
    loadChances,
  };
}
