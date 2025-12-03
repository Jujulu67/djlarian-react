import { useState, useCallback, useRef, useEffect } from 'react';
import { flushSync } from 'react-dom';
import { fetchWithAuth } from '@/lib/api/fetchWithAuth';
import type { LiveInventory, UpdateInventoryInput } from '@/types/live';
import { useBatchedInventory } from './useBatchedInventory';
import { calculateTicketWeightClient } from '@/lib/live/calculations';

export function useLiveInventory() {
  const [inventory, setInventory] = useState<LiveInventory | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { queueAction } = useBatchedInventory();
  const reloadTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

  // Cleanup du timeout au démontage
  useEffect(() => {
    return () => {
      if (reloadTimeoutRef.current) {
        clearTimeout(reloadTimeoutRef.current);
      }
    };
  }, []);

  const updateItem = useCallback(
    async (input: UpdateInventoryInput) => {
      if (!inventory) {
        return { success: false, error: 'Inventaire non chargé' };
      }

      // Optimistic update : mettre à jour l'UI immédiatement avec flushSync pour forcer le re-render synchrone
      flushSync(() => {
        setInventory((prev) => {
          if (!prev) return prev;

          const item = [...prev.activatedItems, ...prev.unactivatedItems].find(
            (i) => i.itemId === input.itemId
          );

          if (!item) return prev;

          const currentActivated = item.activatedQuantity || 0;
          const newActivatedQuantity = Math.max(
            0,
            Math.min(
              item.quantity,
              input.action === 'activate' ? currentActivated + 1 : currentActivated - 1
            )
          );

          // Vérifier les limites
          if (input.action === 'activate' && currentActivated >= item.quantity) {
            return prev; // Déjà au maximum
          }
          if (input.action === 'deactivate' && currentActivated <= 0) {
            return prev; // Déjà au minimum
          }

          const updatedItem = {
            ...item,
            activatedQuantity: newActivatedQuantity,
            isActivated: newActivatedQuantity > 0,
            activatedAt:
              newActivatedQuantity > 0 && currentActivated === 0
                ? new Date()
                : newActivatedQuantity === 0 && currentActivated > 0
                  ? null
                  : item.activatedAt,
          };

          // Recalculer les listes en préservant l'ordre
          // Un item peut être dans les deux listes s'il est partiellement activé
          // - Dans activatedItems si activatedQuantity > 0
          // - Dans unactivatedItems si activatedQuantity < quantity

          const wasInActivated = prev.activatedItems.some((i) => i.id === item.id);
          const wasInUnactivated = prev.unactivatedItems.some((i) => i.id === item.id);

          const isNowActivated = (updatedItem.activatedQuantity || 0) > 0;
          const isNowUnactivated = (updatedItem.activatedQuantity || 0) < updatedItem.quantity;

          let finalActivatedItems: typeof prev.activatedItems;
          let finalUnactivatedItems: typeof prev.unactivatedItems;

          // Gérer activatedItems : doit contenir l'item si isNowActivated
          if (isNowActivated) {
            // L'item doit être dans activatedItems
            if (wasInActivated) {
              // Mettre à jour l'item existant
              finalActivatedItems = prev.activatedItems.map((i) =>
                i.id === item.id ? updatedItem : i
              );
            } else {
              // Ajouter l'item en dernière position
              finalActivatedItems = [...prev.activatedItems, updatedItem];
            }
          } else {
            // L'item ne doit pas être dans activatedItems
            finalActivatedItems = prev.activatedItems.filter((i) => i.id !== item.id);
          }

          // Gérer unactivatedItems : doit contenir l'item si isNowUnactivated
          if (isNowUnactivated) {
            // L'item doit être dans unactivatedItems
            if (wasInUnactivated) {
              // Mettre à jour l'item existant
              finalUnactivatedItems = prev.unactivatedItems.map((i) =>
                i.id === item.id ? updatedItem : i
              );
            } else {
              // Ajouter l'item en dernière position (important pour la mise à jour instantanée)
              finalUnactivatedItems = [...prev.unactivatedItems, updatedItem];
            }
          } else {
            // L'item ne doit pas être dans unactivatedItems
            finalUnactivatedItems = prev.unactivatedItems.filter((i) => i.id !== item.id);
          }

          // Filtrer pour ne garder que les items qui correspondent aux critères
          // IMPORTANT: Utiliser finalActivatedItems/finalUnactivatedItems directement pour le calcul
          // car ils contiennent déjà l'item mis à jour, avant le filtrage
          const activatedItems = finalActivatedItems.filter((i) => (i.activatedQuantity || 0) > 0);
          const unactivatedItems = finalUnactivatedItems.filter(
            (i) => (i.activatedQuantity || 0) < i.quantity
          );

          // Calculer la contribution des items précédents (sans la base de 1)
          // Utiliser prev.activatedItems qui est l'état précédent
          const previousItemsContribution = calculateTicketWeightClient(
            prev.activatedItems,
            0 // Pas de base, juste la contribution des items
          );

          // Calculer la contribution des nouveaux items (sans la base de 1)
          // Utiliser activatedItems qui contient maintenant l'item mis à jour
          const newItemsContribution = calculateTicketWeightClient(
            activatedItems,
            0 // Pas de base, juste la contribution des items
          );

          // Calculer la différence de contribution
          const contributionDiff = newItemsContribution - previousItemsContribution;

          // Le totalTickets précédent incluait déjà la base (1) et la contribution des items précédents
          // On ajoute juste la différence de contribution des items
          // S'assurer que le résultat est toujours >= 1 (au minimum la base)
          const newTotalTickets = Math.max(1, prev.totalTickets + contributionDiff);

          return {
            activatedItems,
            unactivatedItems,
            totalTickets: newTotalTickets,
          };
        });
      });

      try {
        setError(null);

        // Utiliser le hook de batching au lieu d'un appel direct
        const result = await queueAction(input);

        if (result.success) {
          // Debounce le rechargement pour éviter plusieurs appels après un batch
          // Réduire le délai à 50ms pour rendre les mises à jour plus instantanées
          // Le batch a déjà un debounce de 300ms, donc on peut recharger rapidement après
          if (reloadTimeoutRef.current) {
            clearTimeout(reloadTimeoutRef.current);
          }
          reloadTimeoutRef.current = setTimeout(() => {
            reloadTimeoutRef.current = null;
            loadInventory();
          }, 50);
          return { success: true, data: null };
        } else {
          // En cas d'erreur, recharger immédiatement pour rollback
          if (reloadTimeoutRef.current) {
            clearTimeout(reloadTimeoutRef.current);
            reloadTimeoutRef.current = null;
          }
          await loadInventory();
          setError(result.error || 'Erreur lors de la mise à jour');
          return { success: false, error: result.error || 'Erreur lors de la mise à jour' };
        }
      } catch (err) {
        // En cas d'erreur, recharger immédiatement pour rollback
        if (reloadTimeoutRef.current) {
          clearTimeout(reloadTimeoutRef.current);
          reloadTimeoutRef.current = null;
        }
        await loadInventory();
        const errorMessage = err instanceof Error ? err.message : 'Erreur de connexion';
        setError(errorMessage);
        console.error('[Live] Erreur mise à jour item:', err);
        return { success: false, error: errorMessage };
      }
    },
    [inventory, loadInventory, queueAction]
  );

  return {
    inventory,
    isLoading,
    error,
    loadInventory,
    updateItem,
  };
}
