import { useCallback, useRef, useEffect } from 'react';
import { fetchWithAuth } from '@/lib/api/fetchWithAuth';

/**
 * Hook générique pour gérer les actions batch avec debounce
 * Utilisé pour les actions d'inventaire (activate/deactivate/addItem/removeItem)
 *
 * @template TAction - Type de l'action (ex: { type: 'activate', userItemId: string })
 * @template TBatchAction - Type de l'action pour le batch API (peut être différent de TAction)
 * @param config - Configuration du hook
 * @param config.batchEndpoint - Endpoint API pour envoyer le batch
 * @param config.optimizeActions - Fonction optionnelle pour optimiser les actions (annuler les opposés, etc.)
 * @param config.debounceDelay - Délai de debounce en ms (défaut: 300ms)
 */
export function useBatchedActions<
  TAction,
  TBatchAction,
  TBatchResult extends {
    results: Array<{ success: boolean; error?: string }>;
    summary: { total: number; success: number; errors: number };
  },
>(config: {
  batchEndpoint: string;
  optimizeActions?: (actions: TAction[]) => TBatchAction[];
  debounceDelay?: number;
}) {
  const { batchEndpoint, optimizeActions, debounceDelay = 300 } = config;

  type QueuedAction = {
    action: TAction;
    timestamp: number;
    resolve: (result: { success: boolean; error?: string }) => void;
    reject: (error: Error) => void;
  };

  const queueRef = useRef<QueuedAction[]>([]);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isProcessingRef = useRef(false);

  // Fonction pour envoyer le batch
  const processBatch = useCallback(async () => {
    // Si déjà en cours de traitement, ne rien faire
    // Les nouvelles actions seront traitées après la fin du batch en cours
    if (isProcessingRef.current) {
      return;
    }

    // Si queue vide, ne rien faire
    if (queueRef.current.length === 0) {
      return;
    }

    // Marquer comme en cours de traitement
    isProcessingRef.current = true;

    // Copier et vider la queue immédiatement pour éviter les doublons
    const currentQueue = [...queueRef.current];
    queueRef.current = [];

    // Extraire les actions
    const actions = currentQueue.map((queuedAction) => queuedAction.action);

    // Optimiser les actions si une fonction d'optimisation est fournie
    const batchActions = optimizeActions
      ? optimizeActions(actions)
      : (actions as unknown as TBatchAction[]);

    if (batchActions.length === 0) {
      // Aucune action à envoyer (toutes annulées par l'optimisation), résoudre toutes les promesses comme succès
      for (const promise of currentQueue) {
        promise.resolve({ success: true });
      }
      isProcessingRef.current = false;
      // Vérifier s'il y a de nouvelles actions en attente
      if (queueRef.current.length > 0) {
        timeoutRef.current = setTimeout(() => {
          timeoutRef.current = null;
          processBatch();
        }, 50);
      }
      return;
    }

    try {
      const response = await fetchWithAuth(batchEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ actions: batchActions }),
      });

      if (response.ok) {
        const data = await response.json();
        const batchResult: TBatchResult = data.data;

        // Résoudre les promesses avec les résultats
        // Si toutes les actions ont réussi, résoudre toutes les promesses comme succès
        const errorResults = batchResult.results.filter((r) => !r.success);
        if (errorResults.length > 0) {
          // Si certaines actions ont échoué, rejeter toutes les promesses avec la première erreur
          const firstError = errorResults[0];
          for (const promise of currentQueue) {
            promise.reject(new Error(firstError.error || 'Erreur lors du traitement du batch'));
          }
        } else {
          // Toutes les actions ont réussi
          for (const promise of currentQueue) {
            promise.resolve({ success: true });
          }
        }
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Erreur inconnue' }));
        const errorMessage = errorData.error || 'Erreur lors du traitement du batch';

        // Rejeter toutes les promesses avec l'erreur
        for (const promise of currentQueue) {
          promise.reject(new Error(errorMessage));
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur de connexion';
      // Rejeter toutes les promesses avec l'erreur
      for (const promise of currentQueue) {
        promise.reject(new Error(errorMessage));
      }
    } finally {
      isProcessingRef.current = false;

      // Vérifier s'il y a de nouvelles actions en attente après le traitement
      if (queueRef.current.length > 0) {
        timeoutRef.current = setTimeout(() => {
          timeoutRef.current = null;
          processBatch();
        }, 50);
      }
    }
  }, [batchEndpoint, optimizeActions]);

  // Fonction pour ajouter une action à la queue
  const queueAction = useCallback(
    (action: TAction): Promise<{ success: boolean; error?: string }> => {
      return new Promise((resolve, reject) => {
        // Si un batch est en cours, ajouter l'action à la queue et programmer un nouveau batch après
        if (isProcessingRef.current) {
          const queuedAction: QueuedAction = {
            action,
            timestamp: Date.now(),
            resolve,
            reject,
          };
          queueRef.current.push(queuedAction);
          // Le batch en cours traitera les nouvelles actions après sa fin
          return;
        }

        const queuedAction: QueuedAction = {
          action,
          timestamp: Date.now(),
          resolve,
          reject,
        };

        queueRef.current.push(queuedAction);

        // Annuler le timeout précédent pour reset le debounce
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }

        // Programmer l'envoi du batch après le délai de debounce
        // Chaque nouveau clic reset le timer, donc on attend 300ms après le DERNIER clic
        timeoutRef.current = setTimeout(() => {
          timeoutRef.current = null;
          processBatch();
        }, debounceDelay);
      });
    },
    [processBatch, debounceDelay]
  );

  // Nettoyer le timeout au démontage
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Fonction pour forcer l'envoi immédiat du batch
  const flushBatch = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    return processBatch();
  }, [processBatch]);

  return {
    queueAction,
    flushBatch,
  };
}
