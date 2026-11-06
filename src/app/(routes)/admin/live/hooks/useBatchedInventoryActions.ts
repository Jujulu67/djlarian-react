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
  // Les ajouts passent avant les retraits, et les activations avant les désactivations,
  // pour garder cet ordre dans le lot envoyé
  const activations = new Map<string, number>();
  const stock = new Map<string, { userId: string; itemId: string; net: number }>();
  const sign = { activate: 1, deactivate: -1, addItem: 1, removeItem: -1 };

  for (const type of ['activate', 'deactivate'] as const) {
    for (const action of actions) {
      if (action.type === type) {
        const net = (activations.get(action.userItemId) || 0) + sign[type];
        activations.set(action.userItemId, net);
      }
    }
  }

  for (const type of ['addItem', 'removeItem'] as const) {
    for (const action of actions) {
      if (action.type === type) {
        const { userId, itemId } = action;
        const key = `${userId}:${itemId}`;
        const net = (stock.get(key)?.net || 0) + sign[type] * (action.quantity || 1);
        stock.set(key, { userId, itemId, net });
      }
    }
  }

  // Les opposés s'annulent ; le reste part une action à la fois, sans cumuler les quantités
  return [
    ...[...activations].flatMap(([userItemId, net]) =>
      Array.from(
        { length: Math.abs(net) },
        (): AdminAction =>
          net > 0 ? { type: 'activate', userItemId } : { type: 'deactivate', userItemId }
      )
    ),
    ...[...stock.values()].flatMap(({ userId, itemId, net }) =>
      Array.from(
        { length: Math.abs(net) },
        (): AdminAction => ({
          type: net > 0 ? 'addItem' : 'removeItem',
          userId,
          itemId,
          quantity: 1,
        })
      )
    ),
  ];
}

export function useBatchedInventoryActions() {
  return useBatchedActions<AdminAction, AdminAction, BatchResult>({
    batchEndpoint: '/api/admin/inventory/batch',
    optimizeActions: optimizeAdminActions,
    debounceDelay: 300,
  });
}
