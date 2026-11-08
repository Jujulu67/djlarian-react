import { useState, useCallback, useRef, useEffect } from 'react';
import { flushSync } from 'react-dom';
import { fetchWithAuth } from '@/lib/api/fetchWithAuth';
import type { LiveInventory, UpdateInventoryInput } from '@/types/live';
import { useBatchedInventory } from './useBatchedInventory';
import { calculateTicketWeightClient } from '@/lib/live/calculations';
import { logger } from '@/lib/logger';

type InventoryItem = LiveInventory['activatedItems'][number];

function getNextActivatedQuantity(
  item: InventoryItem,
  action: UpdateInventoryInput['action'],
  currentActivated: number
): number {
  const delta = action === 'activate' ? currentActivated + 1 : currentActivated - 1;
  return Math.max(0, Math.min(item.quantity, delta));
}

function getNextActivatedAt(
  item: InventoryItem,
  newActivatedQuantity: number,
  currentActivated: number
): InventoryItem['activatedAt'] {
  if (newActivatedQuantity > 0 && currentActivated === 0) return new Date();
  if (newActivatedQuantity === 0 && currentActivated > 0) return null;
  return item.activatedAt;
}

/**
 * Recalcule une liste (activés ou non) : l'item y figure si `shouldContain`,
 * en gardant sa position s'il y était déjà, sinon en dernière position.
 */
function reconcileItemList(
  list: InventoryItem[],
  itemId: string,
  updatedItem: InventoryItem,
  shouldContain: boolean
): InventoryItem[] {
  if (!shouldContain) {
    return list.filter((i) => i.id !== itemId);
  }
  const wasIn = list.some((i) => i.id === itemId);
  return wasIn ? list.map((i) => (i.id === itemId ? updatedItem : i)) : [...list, updatedItem];
}

/** Mise à jour optimiste de l'inventaire pour une action activate / deactivate. */
function applyOptimisticInventoryUpdate(
  prev: LiveInventory,
  input: UpdateInventoryInput
): LiveInventory {
  const item = [...prev.activatedItems, ...prev.unactivatedItems].find(
    (i) => i.itemId === input.itemId
  );
  if (!item) return prev;

  const currentActivated = item.activatedQuantity || 0;
  // Vérifier les limites
  if (input.action === 'activate' && currentActivated >= item.quantity) return prev; // Déjà au maximum
  if (input.action === 'deactivate' && currentActivated <= 0) return prev; // Déjà au minimum

  const newActivatedQuantity = getNextActivatedQuantity(item, input.action, currentActivated);
  const updatedItem: InventoryItem = {
    ...item,
    activatedQuantity: newActivatedQuantity,
    isActivated: newActivatedQuantity > 0,
    activatedAt: getNextActivatedAt(item, newActivatedQuantity, currentActivated),
  };

  // Un item peut être dans les deux listes s'il est partiellement activé
  // - Dans activatedItems si activatedQuantity > 0
  // - Dans unactivatedItems si activatedQuantity < quantity
  const isNowActivated = newActivatedQuantity > 0;
  const isNowUnactivated = newActivatedQuantity < updatedItem.quantity;
  const finalActivatedItems = reconcileItemList(
    prev.activatedItems,
    item.id,
    updatedItem,
    isNowActivated
  );
  const finalUnactivatedItems = reconcileItemList(
    prev.unactivatedItems,
    item.id,
    updatedItem,
    isNowUnactivated
  );

  // Filtrer pour ne garder que les items qui correspondent aux critères
  const activatedItems = finalActivatedItems.filter((i) => (i.activatedQuantity || 0) > 0);
  const unactivatedItems = finalUnactivatedItems.filter(
    (i) => (i.activatedQuantity || 0) < i.quantity
  );

  // Contribution (sans la base de 1) de l'état précédent et de l'état mis à jour
  const previousItemsContribution = calculateTicketWeightClient(prev.activatedItems, 0);
  const newItemsContribution = calculateTicketWeightClient(activatedItems, 0);
  const contributionDiff = newItemsContribution - previousItemsContribution;

  // Le totalTickets précédent incluait déjà la base (1) : on ajoute la différence,
  // en gardant au minimum la base
  return {
    activatedItems,
    unactivatedItems,
    totalTickets: Math.max(1, prev.totalTickets + contributionDiff),
  };
}

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
      logger.error('[Live] Erreur chargement inventaire:', err);
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
        setInventory((prev) => (prev ? applyOptimisticInventoryUpdate(prev, input) : prev));
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
        logger.error('[Live] Erreur mise à jour item:', err);
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
