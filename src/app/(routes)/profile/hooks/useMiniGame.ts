import { useState, useCallback } from 'react';
import { fetchWithAuth } from '@/lib/api/fetchWithAuth';
import { toast } from 'react-hot-toast';
import { RewardType } from '@/types/slot-machine';

export interface GameResult {
  rewardType: RewardType | null;
  rewardAmount: number;
  isWin: boolean;
  message: string;
  newBalance: number;
  cost: number;
}

export function useMiniGame(onTokenUpdate?: () => Promise<void>) {
  const [isLoading, setIsLoading] = useState(false);

  const play = useCallback(
    async (gameType: 'roulette' | 'scratch' | 'mystery'): Promise<GameResult | null> => {
      try {
        setIsLoading(true);
        const response = await fetchWithAuth('/api/minigames/play', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ gameType }),
        });

        if (response.ok) {
          const data = await response.json();
          const result = data.data || data;

          // Refresh global token status if callback provided
          if (onTokenUpdate) {
            await onTokenUpdate();
          }

          return result;
        } else {
          const errorData = await response.json().catch(() => ({}));
          const errorMessage = errorData.error || 'Erreur lors de la partie';
          toast.error(errorMessage);
          return null;
        }
      } catch (error) {
        console.error('Erreur lors du jeu:', error);
        toast.error('Une erreur est survenue');
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [onTokenUpdate]
  );

  const resetTokens = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetchWithAuth('/api/minigames/reset-tokens', {
        method: 'POST',
      });

      if (response.ok) {
        toast.success('Jetons réinitialisés !');
        if (onTokenUpdate) {
          await onTokenUpdate();
        }
      } else {
        toast.error('Erreur lors de la réinitialisation');
      }
    } catch (error) {
      console.error('Erreur reset:', error);
      toast.error('Erreur reset');
    } finally {
      setIsLoading(false);
    }
  }, [onTokenUpdate]);

  return {
    play,
    resetTokens,
    isLoading,
  };
}
