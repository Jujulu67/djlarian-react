import { useState, useCallback } from 'react';
import { fetchWithAuth } from '@/lib/api/fetchWithAuth';
import type { LiveInventory, UpdateInventoryInput } from '@/types/live';

export function useLiveInventory() {
  const [inventory, setInventory] = useState<LiveInventory | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadInventory = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetchWithAuth('/api/live/inventory');
      if (response.ok) {
        const data = await response.json();
        setInventory(data.data);
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Erreur lors du chargement de l'inventaire");
      }
    } catch (err) {
      setError('Erreur de connexion');
      console.error('[Live] Erreur chargement inventaire:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateItem = useCallback(
    async (input: UpdateInventoryInput) => {
      try {
        setError(null);
        const response = await fetchWithAuth('/api/live/inventory', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(input),
        });

        if (response.ok) {
          const data = await response.json();
          // Recharger l'inventaire pour avoir les données à jour
          await loadInventory();
          return { success: true, data: data.data };
        } else {
          let errorMessage = 'Erreur lors de la mise à jour';
          try {
            const errorData = await response.json();
            errorMessage = errorData.error || errorMessage;
          } catch (e) {
            // Si le parsing JSON échoue, utiliser le statusText
            errorMessage = response.statusText || errorMessage;
          }
          setError(errorMessage);
          return { success: false, error: errorMessage };
        }
      } catch (err) {
        setError('Erreur de connexion');
        console.error('[Live] Erreur mise à jour item:', err);
        return { success: false, error: 'Erreur de connexion' };
      }
    },
    [loadInventory]
  );

  return {
    inventory,
    isLoading,
    error,
    loadInventory,
    updateItem,
  };
}
