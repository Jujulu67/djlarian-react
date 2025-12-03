import { useBatchedActions } from '@/hooks/useBatchedActions';
import type { UpdateInventoryInput } from '@/types/live';

type LiveBatchAction = {
  itemId: string;
  action: 'activate' | 'deactivate';
};

type BatchResult = {
  results: Array<{
    itemId: string;
    action: 'activate' | 'deactivate';
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
 * Optimise les actions live en annulant les opposés
 * - activate + deactivate pour le même itemId → annule
 */
function optimizeLiveActions(actions: UpdateInventoryInput[]): LiveBatchAction[] {
  // Grouper les actions par itemId et action
  const actionMap = new Map<string, UpdateInventoryInput[]>();

  for (const action of actions) {
    const key = `${action.itemId}:${action.action}`;
    if (!actionMap.has(key)) {
      actionMap.set(key, []);
    }
    actionMap.get(key)!.push(action);
  }

  // Compter les activations/désactivations nettes pour chaque item
  const netActions = new Map<string, { action: 'activate' | 'deactivate'; count: number }>();

  for (const [key, keyActions] of actionMap.entries()) {
    const [itemId, action] = key.split(':') as [string, 'activate' | 'deactivate'];
    const oppositeAction = action === 'activate' ? 'deactivate' : 'activate';
    const oppositeKey = `${itemId}:${oppositeAction}`;

    const oppositeCount = actionMap.get(oppositeKey)?.length || 0;
    const currentCount = keyActions.length;

    if (currentCount > oppositeCount) {
      const netCount = currentCount - oppositeCount;
      netActions.set(itemId, {
        action,
        count: netCount,
      });
    } else if (oppositeCount > currentCount) {
      netActions.set(itemId, {
        action: oppositeAction,
        count: oppositeCount - currentCount,
      });
    }
    // Si égal, on annule tout (pas d'action nette)
  }

  // Préparer les actions à envoyer
  const actionsToSend: LiveBatchAction[] = [];

  for (const [itemId, { action, count }] of netActions.entries()) {
    for (let i = 0; i < count; i++) {
      actionsToSend.push({ itemId, action });
    }
  }

  return actionsToSend;
}

export function useBatchedInventory() {
  const { queueAction, flushBatch } = useBatchedActions<
    UpdateInventoryInput,
    LiveBatchAction,
    BatchResult
  >({
    batchEndpoint: '/api/live/inventory/batch',
    optimizeActions: optimizeLiveActions,
    debounceDelay: 300,
  });

  return {
    queueAction,
    flushBatch,
  };
}
