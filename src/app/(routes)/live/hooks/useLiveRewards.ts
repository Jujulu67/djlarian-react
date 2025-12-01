import { useState, useCallback } from 'react';
import { fetchWithAuth } from '@/lib/api/fetchWithAuth';
import type { LiveRewards, UpdateRewardsInput } from '@/types/live';

export function useLiveRewards() {
  const [rewards, setRewards] = useState<LiveRewards | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadRewards = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetchWithAuth('/api/live/rewards');
      if (response.ok) {
        const data = await response.json();
        setRewards(data.data);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Erreur lors du chargement des récompenses');
      }
    } catch (err) {
      setError('Erreur de connexion');
      console.error('[Live] Erreur chargement récompenses:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateRewards = useCallback(
    async (input: UpdateRewardsInput) => {
      try {
        setError(null);
        const response = await fetchWithAuth('/api/live/rewards', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(input),
        });

        if (response.ok) {
          // Recharger les récompenses
          await loadRewards();
          return { success: true };
        } else {
          const errorData = await response.json();
          setError(errorData.error || 'Erreur lors de la mise à jour');
          return { success: false, error: errorData.error };
        }
      } catch (err) {
        setError('Erreur de connexion');
        console.error('[Live] Erreur mise à jour récompenses:', err);
        return { success: false, error: 'Erreur de connexion' };
      }
    },
    [loadRewards]
  );

  return {
    rewards,
    isLoading,
    error,
    loadRewards,
    updateRewards,
  };
}
