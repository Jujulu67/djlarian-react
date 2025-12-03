import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { auth } from '@/auth';
import { logger } from '@/lib/logger';
import prisma from '@/lib/prisma';
import { createSuccessResponse, createUnauthorizedResponse } from '@/lib/api/responseHelpers';
import { handleApiError } from '@/lib/api/errorHandler';
import { createDbPerformanceLogger } from '@/lib/db-performance';

const batchActionSchema = z.object({
  itemId: z.string(),
  action: z.enum(['activate', 'deactivate']),
});

const batchInventorySchema = z.object({
  actions: z.array(batchActionSchema).min(1).max(50), // Limiter à 50 actions par batch
});

type BatchActionResult = {
  itemId: string;
  action: 'activate' | 'deactivate';
  success: boolean;
  error?: string;
  updatedItem?: {
    id: string;
    activatedQuantity: number;
    quantity: number;
  };
};

/**
 * POST /api/live/inventory/batch
 * Traite plusieurs actions d'inventaire en une seule transaction
 */
export async function POST(request: NextRequest) {
  const perf = createDbPerformanceLogger('POST /api/live/inventory/batch');
  const t0 = perf.start();
  try {
    const session = await auth();

    if (!session?.user?.id) {
      perf.end(t0, { metadata: { error: 'Unauthorized' } });
      return createUnauthorizedResponse('Non authentifié');
    }

    const body = await request.json();
    const validationResult = batchInventorySchema.safeParse(body);

    if (!validationResult.success) {
      perf.end(t0, { metadata: { error: 'Validation failed' } });
      return NextResponse.json(
        { error: 'Données invalides', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { actions } = validationResult.data;

    logger.debug('[Live Inventory Batch] Processing batch:', {
      userId: session.user.id,
      actionCount: actions.length,
      actions: actions.map((a) => `${a.itemId}:${a.action}`),
    });

    // Récupérer tous les items concernés en une seule requête
    const t1 = Date.now();
    const itemIds = [...new Set(actions.map((a) => a.itemId))];
    const userItems = await prisma.userLiveItem.findMany({
      where: {
        userId: session.user.id,
        itemId: { in: itemIds },
      },
      include: {
        LiveItem: true,
      },
    });
    const t2 = Date.now();
    perf.logQuery(t1, t2, 'userLiveItem.findMany (batch)');

    // Créer un map pour accès rapide
    const itemsMap = new Map(userItems.map((item) => [item.itemId, item]));

    // Vérifier que tous les items existent
    const missingItems = actions.filter((a) => !itemsMap.has(a.itemId));
    if (missingItems.length > 0) {
      perf.end(t0, { queryTime: t2 - t1 });
      return NextResponse.json(
        {
          error: 'Certains items ne sont pas trouvés',
          missingItems: missingItems.map((a) => a.itemId),
        },
        { status: 404 }
      );
    }

    // Compter les actions par item pour calculer le changement net
    const actionCounts = new Map<
      string,
      { activate: number; deactivate: number; userItem: (typeof userItems)[number] }
    >();

    for (const action of actions) {
      const userItem = itemsMap.get(action.itemId);
      if (!userItem) continue;

      if (!actionCounts.has(action.itemId)) {
        actionCounts.set(action.itemId, {
          activate: 0,
          deactivate: 0,
          userItem,
        });
      }

      const counts = actionCounts.get(action.itemId)!;
      if (action.action === 'activate') {
        counts.activate++;
      } else {
        counts.deactivate++;
      }
    }

    // Préparer les résultats et updates
    const results: BatchActionResult[] = [];
    const updates: Array<{
      id: string;
      newActivatedQuantity: number;
      becomesInactive: boolean;
      wasInactive: boolean;
    }> = [];

    // Traiter chaque item avec son changement net
    for (const [itemId, counts] of actionCounts.entries()) {
      const userItem = counts.userItem;
      const netChange = counts.activate - counts.deactivate;

      if (netChange === 0) {
        // Pas de changement net, toutes les actions sont annulées
        for (let i = 0; i < counts.activate; i++) {
          results.push({
            itemId,
            action: 'activate',
            success: true,
          });
        }
        for (let i = 0; i < counts.deactivate; i++) {
          results.push({
            itemId,
            action: 'deactivate',
            success: true,
          });
        }
        continue;
      }

      const itemType = userItem.LiveItem?.type || '';
      const itemName = userItem.LiveItem?.name || '';
      const isQueueSkip =
        itemType === 'SKIP_QUEUE' ||
        itemName.toLowerCase().includes('skip queue') ||
        itemName.toLowerCase().includes('queue skip');

      const currentActivated = userItem.activatedQuantity || 0;
      const newActivatedQuantity = Math.max(
        0,
        Math.min(userItem.quantity, currentActivated + netChange)
      );

      // Valider les limites
      if (netChange > 0) {
        // Activation
        if (currentActivated >= userItem.quantity) {
          // Tous déjà activés
          for (let i = 0; i < counts.activate; i++) {
            results.push({
              itemId,
              action: 'activate',
              success: false,
              error: 'Tous les items sont déjà activés',
            });
          }
          for (let i = 0; i < counts.deactivate; i++) {
            results.push({
              itemId,
              action: 'deactivate',
              success: true,
            });
          }
          continue;
        }

        // Pour Skip_Queue: vérifier qu'aucun autre n'est activé
        if (isQueueSkip) {
          if (currentActivated === 0) {
            const hasOtherQueueSkip = userItems.some((item) => {
              if (item.id === userItem.id) return false;
              if ((item.activatedQuantity || 0) <= 0) return false;
              const otherItemType = item.LiveItem?.type || '';
              const otherItemName = item.LiveItem?.name?.toLowerCase() || '';
              return (
                otherItemType === 'SKIP_QUEUE' ||
                otherItemName.includes('skip queue') ||
                otherItemName.includes('queue skip')
              );
            });

            if (hasOtherQueueSkip) {
              for (let i = 0; i < counts.activate; i++) {
                results.push({
                  itemId,
                  action: 'activate',
                  success: false,
                  error:
                    "Un Queue Skip est déjà activé. Désactivez-le d'abord avant d'en activer un autre.",
                });
              }
              for (let i = 0; i < counts.deactivate; i++) {
                results.push({
                  itemId,
                  action: 'deactivate',
                  success: true,
                });
              }
              continue;
            }
          }

          // Pour Skip_Queue, limiter activatedQuantity à 1 max
          // Même dans un batch, on ne peut activer qu'un seul queue skip
          if (currentActivated >= 1) {
            // Déjà activé, rejeter toutes les nouvelles activations
            for (let i = 0; i < counts.activate; i++) {
              results.push({
                itemId,
                action: 'activate',
                success: false,
                error: 'Un seul Queue Skip peut être activé à la fois',
              });
            }
            // Les désactivations peuvent toujours passer
            for (let i = 0; i < counts.deactivate; i++) {
              results.push({
                itemId,
                action: 'deactivate',
                success: true,
              });
            }
            continue;
          }

          // Si currentActivated === 0 et netChange > 1, on peut activer au moins 1
          // Limiter le netChange à 1 maximum pour les queue skip
          if (netChange > 1) {
            // On ne peut activer qu'un seul queue skip, donc limiter newActivatedQuantity à 1
            const limitedNewActivatedQuantity = 1;

            updates.push({
              id: userItem.id,
              newActivatedQuantity: limitedNewActivatedQuantity,
              becomesInactive: false,
              wasInactive: true,
            });

            // Générer les résultats : une activation réussie, les autres échouent
            results.push({
              itemId,
              action: 'activate',
              success: true,
            });
            for (let i = 1; i < counts.activate; i++) {
              results.push({
                itemId,
                action: 'activate',
                success: false,
                error: 'Un seul Queue Skip peut être activé à la fois',
              });
            }
            for (let i = 0; i < counts.deactivate; i++) {
              results.push({
                itemId,
                action: 'deactivate',
                success: true,
              });
            }
            continue;
          }
        }
      } else {
        // Désactivation
        if (currentActivated <= 0) {
          for (let i = 0; i < counts.deactivate; i++) {
            results.push({
              itemId,
              action: 'deactivate',
              success: false,
              error: "Aucun item n'est activé",
            });
          }
          for (let i = 0; i < counts.activate; i++) {
            results.push({
              itemId,
              action: 'activate',
              success: true,
            });
          }
          continue;
        }
      }

      // Appliquer le changement
      const wasInactive = currentActivated === 0;
      const becomesInactive = newActivatedQuantity === 0;

      updates.push({
        id: userItem.id,
        newActivatedQuantity,
        becomesInactive,
        wasInactive: wasInactive && netChange > 0,
      });

      // Créer les résultats pour toutes les actions
      for (let i = 0; i < counts.activate; i++) {
        results.push({
          itemId,
          action: 'activate',
          success: true,
          updatedItem: {
            id: userItem.id,
            activatedQuantity: newActivatedQuantity,
            quantity: userItem.quantity,
          },
        });
      }
      for (let i = 0; i < counts.deactivate; i++) {
        results.push({
          itemId,
          action: 'deactivate',
          success: true,
          updatedItem: {
            id: userItem.id,
            activatedQuantity: newActivatedQuantity,
            quantity: userItem.quantity,
          },
        });
      }
    }

    // Exécuter toutes les mises à jour en une seule transaction
    const t3 = Date.now();
    if (updates.length > 0) {
      await prisma.$transaction(
        updates.map((update) => {
          const userItem = userItems.find((item) => item.id === update.id)!;
          return prisma.userLiveItem.update({
            where: { id: update.id },
            data: {
              activatedQuantity: update.newActivatedQuantity,
              isActivated: update.newActivatedQuantity > 0,
              activatedAt:
                update.wasInactive && update.newActivatedQuantity > 0
                  ? new Date()
                  : update.becomesInactive
                    ? null
                    : userItem.activatedAt,
            },
          });
        })
      );
    }
    const t4 = Date.now();
    perf.logQuery(t3, t4, `userLiveItem.update (batch, ${updates.length} updates)`);

    // Pas besoin de revalidatePath ici car les optimistic updates côté client gèrent déjà l'UI
    // et le reload avec debounce synchronise avec le serveur
    // revalidatePath('/admin/live');

    const successCount = results.filter((r) => r.success).length;
    const errorCount = results.filter((r) => !r.success).length;

    logger.debug('[Live Inventory Batch] Batch completed:', {
      userId: session.user.id,
      totalActions: actions.length,
      successCount,
      errorCount,
    });

    perf.end(t0, {
      queryTime: t2 - t1 + (t4 - t3),
      query: `findMany + transaction (${updates.length} updates)`,
      operation: 'POST /api/live/inventory/batch',
    });

    return createSuccessResponse(
      {
        results,
        summary: {
          total: actions.length,
          success: successCount,
          errors: errorCount,
        },
      },
      200,
      `Batch traité: ${successCount} succès, ${errorCount} erreurs`
    );
  } catch (error) {
    perf.end(t0, { metadata: { error: error instanceof Error ? error.message : String(error) } });
    return handleApiError(error, 'POST /api/live/inventory/batch');
  }
}
