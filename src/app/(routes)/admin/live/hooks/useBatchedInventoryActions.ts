import { useCallback } from 'react';
import { useBatchedActions } from '@/hooks/useBatchedActions';

type AdminAction =
  | { type: 'activate'; userItemId: string }
  | { type: 'deactivate'; userItemId: string }
  | { type: 'addItem'; userId: string; itemId: string; quantity?: number }
  | { type: 'removeItem'; userId: string; itemId: string; quantity?: number };

type BatchResult = {
  results: Array<{
    type: 'activate' | 'deactivate' | 'addItem' | 'removeItem';
    userItemId?: string;
    userId?: string;
    itemId?: string;
    success: boolean;
    error?: string;
  }>;
  summary: {
    total: number;
    success: number;
    errors: number;
  };
};

/**
 * Optimise les actions admin en annulant les opposés
 * - activate + deactivate pour le même userItemId → annule
 * - addItem + removeItem pour le même userId:itemId → annule
 *
 * IMPORTANT: Les actions sont envoyées une par une (pas cumulées en quantité)
 * pour permettre un traitement individuel côté serveur, tout en conservant
 * les optimistic updates batch côté client.
 */
function optimizeAdminActions(actions: AdminAction[]): AdminAction[] {
  const optimizedActions: AdminAction[] = [];

  // Grouper par type et identifier pour optimiser
  const activateList: string[] = []; // Liste des userItemId à activer
  const deactivateList: string[] = []; // Liste des userItemId à désactiver
  const addItemList: Array<{ userId: string; itemId: string; quantity: number }> = []; // Liste des items à ajouter
  const removeItemList: Array<{ userId: string; itemId: string; quantity: number }> = []; // Liste des items à retirer

  // Collecter toutes les actions
  for (const action of actions) {
    if (action.type === 'activate') {
      activateList.push(action.userItemId);
    } else if (action.type === 'deactivate') {
      deactivateList.push(action.userItemId);
    } else if (action.type === 'addItem') {
      addItemList.push({
        userId: action.userId,
        itemId: action.itemId,
        quantity: action.quantity || 1,
      });
    } else if (action.type === 'removeItem') {
      removeItemList.push({
        userId: action.userId,
        itemId: action.itemId,
        quantity: action.quantity || 1,
      });
    }
  }

  // Optimiser activate/deactivate (annuler les opposés)
  const activateMap = new Map<string, number>();
  const deactivateMap = new Map<string, number>();

  // Compter les activations
  for (const userItemId of activateList) {
    activateMap.set(userItemId, (activateMap.get(userItemId) || 0) + 1);
  }

  // Compter les désactivations
  for (const userItemId of deactivateList) {
    deactivateMap.set(userItemId, (deactivateMap.get(userItemId) || 0) + 1);
  }

  // Calculer les actions nettes (une par une, pas cumulées)
  for (const [userItemId, activateCount] of activateMap.entries()) {
    const deactivateCount = deactivateMap.get(userItemId) || 0;
    const netCount = activateCount - deactivateCount;

    if (netCount > 0) {
      // Plus d'activations que de désactivations : envoyer les activations une par une
      for (let i = 0; i < netCount; i++) {
        optimizedActions.push({ type: 'activate', userItemId });
      }
    } else if (netCount < 0) {
      // Plus de désactivations que d'activations : envoyer les désactivations une par une
      for (let i = 0; i < -netCount; i++) {
        optimizedActions.push({ type: 'deactivate', userItemId });
      }
    }
    // Si netCount === 0, on annule tout (pas d'action)
  }

  // Pour les userItemIds qui n'ont que des deactivates
  for (const [userItemId, deactivateCount] of deactivateMap.entries()) {
    if (!activateMap.has(userItemId)) {
      for (let i = 0; i < deactivateCount; i++) {
        optimizedActions.push({ type: 'deactivate', userItemId });
      }
    }
  }

  // Optimiser addItem/removeItem (une par une, pas cumulées)
  const addItemMap = new Map<string, Array<{ userId: string; itemId: string; quantity: number }>>();
  const removeItemMap = new Map<
    string,
    Array<{ userId: string; itemId: string; quantity: number }>
  >();

  // Grouper les ajouts par clé
  for (const item of addItemList) {
    const key = `${item.userId}:${item.itemId}`;
    if (!addItemMap.has(key)) {
      addItemMap.set(key, []);
    }
    // Ajouter chaque action individuellement (pas cumuler les quantités)
    for (let i = 0; i < item.quantity; i++) {
      addItemMap.get(key)!.push({ userId: item.userId, itemId: item.itemId, quantity: 1 });
    }
  }

  // Grouper les retraits par clé
  for (const item of removeItemList) {
    const key = `${item.userId}:${item.itemId}`;
    if (!removeItemMap.has(key)) {
      removeItemMap.set(key, []);
    }
    // Ajouter chaque action individuellement (pas cumuler les quantités)
    for (let i = 0; i < item.quantity; i++) {
      removeItemMap.get(key)!.push({ userId: item.userId, itemId: item.itemId, quantity: 1 });
    }
  }

  // Calculer les actions nettes (une par une)
  for (const [key, addItems] of addItemMap.entries()) {
    const removeItems = removeItemMap.get(key) || [];
    const netCount = addItems.length - removeItems.length;

    if (netCount > 0) {
      // Plus d'ajouts que de retraits : envoyer les ajouts un par un
      for (let i = 0; i < netCount; i++) {
        optimizedActions.push({
          type: 'addItem',
          userId: addItems[0].userId,
          itemId: addItems[0].itemId,
          quantity: 1, // Toujours 1, pas de cumul
        });
      }
    } else if (netCount < 0) {
      // Plus de retraits que d'ajouts : envoyer les retraits un par un
      for (let i = 0; i < -netCount; i++) {
        optimizedActions.push({
          type: 'removeItem',
          userId: removeItems[0].userId,
          itemId: removeItems[0].itemId,
          quantity: 1, // Toujours 1, pas de cumul
        });
      }
    }
    // Si netCount === 0, on annule tout (pas d'action)
  }

  // Pour les items qui n'ont que des removes
  for (const [key, removeItems] of removeItemMap.entries()) {
    if (!addItemMap.has(key)) {
      // Envoyer chaque retrait un par un
      for (const item of removeItems) {
        optimizedActions.push({
          type: 'removeItem',
          userId: item.userId,
          itemId: item.itemId,
          quantity: 1, // Toujours 1, pas de cumul
        });
      }
    }
  }

  return optimizedActions;
}

export function useBatchedInventoryActions() {
  return useBatchedActions<AdminAction, AdminAction, BatchResult>({
    batchEndpoint: '/api/admin/inventory/batch',
    optimizeActions: optimizeAdminActions,
    debounceDelay: 300,
  });
}
