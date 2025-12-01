import { useState, useCallback, useEffect } from 'react';
import { fetchWithAuth } from '@/lib/api/fetchWithAuth';
import type { TwitchSubscriptionStatus } from '@/types/live';

export function useTwitchSubscription() {
  const [subscriptionStatus, setSubscriptionStatus] = useState<TwitchSubscriptionStatus | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkSubscription = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetchWithAuth('/api/live/twitch-subscription');
      if (response.ok) {
        const data = await response.json();
        setSubscriptionStatus(data.data);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Erreur lors de la vérification de la subscription');
      }
    } catch (err) {
      setError('Erreur de connexion');
      console.error('[Live] Erreur vérification subscription:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Vérifier au montage et toutes les 5 minutes
  useEffect(() => {
    checkSubscription();
    const interval = setInterval(checkSubscription, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [checkSubscription]);

  return {
    subscriptionStatus,
    isLoading,
    error,
    checkSubscription,
  };
}
