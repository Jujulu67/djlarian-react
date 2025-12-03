import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { auth } from '@/auth';
import { logger } from '@/lib/logger';
import prisma from '@/lib/prisma';
import { createSuccessResponse, createUnauthorizedResponse } from '@/lib/api/responseHelpers';
import { handleApiError } from '@/lib/api/errorHandler';
import { createDbPerformanceLogger } from '@/lib/db-performance';

const batchActionSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('activate'),
    userItemId: z.string(),
  }),
  z.object({
    type: z.literal('deactivate'),
    userItemId: z.string(),
  }),
  z.object({
    type: z.literal('addItem'),
    userId: z.string(),
    itemId: z.string(),
    quantity: z.number().int().positive().optional().default(1),
  }),
  z.object({
    type: z.literal('removeItem'),
    userId: z.string(),
    itemId: z.string(),
    quantity: z.number().int().positive().optional().default(1),
  }),
]);

const batchInventorySchema = z.object({
  actions: z.array(batchActionSchema).min(1).max(50), // Limiter à 50 actions par batch
});

type BatchActionResult = {
  type: 'activate' | 'deactivate' | 'addItem' | 'removeItem';
  userItemId?: string;
  userId?: string;
  itemId?: string;
  success: boolean;
  error?: string;
  updatedItem?: {
    id: string;
    quantity?: number;
    activatedQuantity?: number;
  };
};

/**
 * POST /api/admin/inventory/batch
 * Traite plusieurs actions d'inventaire admin en une seule transaction
 */
export async function POST(request: NextRequest) {
  const perf = createDbPerformanceLogger('POST /api/admin/inventory/batch');
  const t0 = perf.start();
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== 'ADMIN') {
      perf.end(t0, { metadata: { error: 'Unauthorized' } });
      return createUnauthorizedResponse('Non autorisé');
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

    logger.debug('[Admin Inventory Batch] Processing batch:', {
      adminId: session.user.id,
      actionCount: actions.length,
      actions: actions.map((a) => {
        if (a.type === 'activate' || a.type === 'deactivate') {
          return `${a.type}:${a.userItemId}`;
        }
        return `${a.type}:${a.itemId}`;
      }),
    });

    // Séparer les actions par type
    const activateActions = actions.filter((a) => a.type === 'activate') as Array<
      Extract<(typeof actions)[number], { type: 'activate' }>
    >;
    const deactivateActions = actions.filter((a) => a.type === 'deactivate') as Array<
      Extract<(typeof actions)[number], { type: 'deactivate' }>
    >;
    const addItemActions = actions.filter((a) => a.type === 'addItem') as Array<
      Extract<(typeof actions)[number], { type: 'addItem' }>
    >;
    const removeItemActions = actions.filter((a) => a.type === 'removeItem') as Array<
      Extract<(typeof actions)[number], { type: 'removeItem' }>
    >;

    const results: BatchActionResult[] = [];
    const updates: Array<{
      type: 'activate' | 'deactivate' | 'addItem' | 'removeItem';
      id: string;
      data: any;
    }> = [];
    const creates: Array<{
      userId: string;
      itemId: string;
      quantity: number;
    }> = [];

    // Traiter les actions activate/deactivate
    if (activateActions.length > 0 || deactivateActions.length > 0) {
      const userItemIds = [
        ...activateActions.map((a) => a.userItemId),
        ...deactivateActions.map((a) => a.userItemId),
      ];
      const uniqueUserItemIds = [...new Set(userItemIds)];

      const t1 = Date.now();
      const userItems = await prisma.userLiveItem.findMany({
        where: {
          id: { in: uniqueUserItemIds },
        },
        include: {
          LiveItem: true,
        },
      });
      const t2 = Date.now();
      perf.logQuery(t1, t2, 'userLiveItem.findMany (activate/deactivate)');

      const itemsMap = new Map(userItems.map((item) => [item.id, item]));

      // Tracker l'état des items pendant le batch pour les validations
      const batchState = new Map<string, number>();
      for (const item of userItems) {
        batchState.set(item.id, item.activatedQuantity || 0);
      }

      // Traiter les activations
      for (const action of activateActions) {
        const userItem = itemsMap.get(action.userItemId);
        if (!userItem) {
          results.push({
            type: 'activate',
            userItemId: action.userItemId,
            success: false,
            error: 'Item not found',
          });
          continue;
        }

        // Utiliser l'état actuel du batch (mis à jour après chaque action)
        const currentActivatedQuantity = batchState.get(userItem.id) || 0;

        // Vérifier qu'on peut encore activer
        if (currentActivatedQuantity >= userItem.quantity) {
          results.push({
            type: 'activate',
            userItemId: action.userItemId,
            itemId: userItem.itemId,
            success: false,
            error: 'Tous les items sont déjà activés',
          });
          continue;
        }

        const itemType = userItem.LiveItem?.type || '';
        const itemName = userItem.LiveItem?.name || '';
        const isQueueSkip =
          itemType === 'SKIP_QUEUE' ||
          itemName.toLowerCase().includes('skip queue') ||
          itemName.toLowerCase().includes('queue skip');

        // Pour Skip_Queue: vérifier qu'aucun autre n'est activé
        if (isQueueSkip) {
          if (currentActivatedQuantity === 0) {
            // Vérifier qu'aucun autre Queue Skip n'a activatedQuantity > 0
            // Vérifier aussi dans le batchState pour prendre en compte les activations du batch
            const hasOtherQueueSkip = userItems.some((item) => {
              if (item.id === userItem.id) return false;
              if (item.userId !== userItem.userId) return false;
              const otherActivatedQuantity = batchState.get(item.id) || item.activatedQuantity || 0;
              if (otherActivatedQuantity <= 0) return false;
              const otherItemType = item.LiveItem?.type || '';
              const otherItemName = item.LiveItem?.name?.toLowerCase() || '';
              return (
                otherItemType === 'SKIP_QUEUE' ||
                otherItemName.includes('skip queue') ||
                otherItemName.includes('queue skip')
              );
            });

            if (hasOtherQueueSkip) {
              results.push({
                type: 'activate',
                userItemId: action.userItemId,
                itemId: userItem.itemId,
                success: false,
                error:
                  "Un Queue Skip est déjà activé. Désactivez-le d'abord avant d'en activer un autre.",
              });
              continue;
            }
          }

          // Pour Skip_Queue, limiter activatedQuantity à 1 max
          if (currentActivatedQuantity >= 1) {
            results.push({
              type: 'activate',
              userItemId: action.userItemId,
              itemId: userItem.itemId,
              success: false,
              error: 'Un seul Queue Skip peut être activé à la fois',
            });
            continue;
          }
        }

        const wasInactive = currentActivatedQuantity === 0;
        const newActivatedQuantity = currentActivatedQuantity + 1;

        // Mettre à jour l'état du batch pour les prochaines actions
        batchState.set(userItem.id, newActivatedQuantity);

        updates.push({
          type: 'activate',
          id: userItem.id,
          data: {
            activatedQuantity: newActivatedQuantity,
            isActivated: true,
            activatedAt: wasInactive ? new Date() : userItem.activatedAt,
          },
        });

        results.push({
          type: 'activate',
          userItemId: action.userItemId,
          itemId: userItem.itemId,
          success: true,
          updatedItem: {
            id: userItem.id,
            activatedQuantity: newActivatedQuantity,
            quantity: userItem.quantity,
          },
        });
      }

      // Traiter les désactivations
      for (const action of deactivateActions) {
        const userItem = itemsMap.get(action.userItemId);
        if (!userItem) {
          results.push({
            type: 'deactivate',
            userItemId: action.userItemId,
            success: false,
            error: 'Item not found',
          });
          continue;
        }

        if (userItem.activatedQuantity <= 0) {
          results.push({
            type: 'deactivate',
            userItemId: action.userItemId,
            itemId: userItem.itemId,
            success: false,
            error: "Aucun item n'est activé",
          });
          continue;
        }

        const newActivatedQuantity = userItem.activatedQuantity - 1;
        const becomesInactive = newActivatedQuantity === 0;

        updates.push({
          type: 'deactivate',
          id: userItem.id,
          data: {
            activatedQuantity: newActivatedQuantity,
            isActivated: newActivatedQuantity > 0,
            activatedAt: becomesInactive ? null : userItem.activatedAt,
          },
        });

        results.push({
          type: 'deactivate',
          userItemId: action.userItemId,
          itemId: userItem.itemId,
          success: true,
          updatedItem: {
            id: userItem.id,
            activatedQuantity: newActivatedQuantity,
            quantity: userItem.quantity,
          },
        });
      }
    }

    // Traiter les actions addItem/removeItem
    if (addItemActions.length > 0 || removeItemActions.length > 0) {
      const allItemActions = [...addItemActions, ...removeItemActions];
      const userIds = [...new Set(allItemActions.map((a) => a.userId))];
      const itemIds = [...new Set(allItemActions.map((a) => a.itemId))];

      const t3 = Date.now();
      const existingItems = await prisma.userLiveItem.findMany({
        where: {
          userId: { in: userIds },
          itemId: { in: itemIds },
        },
      });
      const t4 = Date.now();
      perf.logQuery(t3, t4, 'userLiveItem.findMany (add/remove)');

      const existingItemsMap = new Map(
        existingItems.map((item) => [`${item.userId}:${item.itemId}`, item])
      );

      // Traiter les ajouts
      // Regrouper les actions par userId:itemId pour éviter les doublons de création
      const addItemMap = new Map<
        string,
        { userId: string; itemId: string; totalQuantity: number; actions: typeof addItemActions }
      >();

      for (const action of addItemActions) {
        const key = `${action.userId}:${action.itemId}`;
        const existingItem = existingItemsMap.get(key);

        if (existingItem) {
          // Item existe déjà, on peut traiter chaque action individuellement
          updates.push({
            type: 'addItem',
            id: existingItem.id,
            data: {
              quantity: { increment: action.quantity },
            },
          });

          results.push({
            type: 'addItem',
            userId: action.userId,
            itemId: action.itemId,
            success: true,
            updatedItem: {
              id: existingItem.id,
              quantity: existingItem.quantity + action.quantity,
            },
          });
        } else {
          // Item n'existe pas encore, regrouper les actions pour éviter les doublons de création
          if (!addItemMap.has(key)) {
            addItemMap.set(key, {
              userId: action.userId,
              itemId: action.itemId,
              totalQuantity: 0,
              actions: [],
            });
          }
          const grouped = addItemMap.get(key)!;
          grouped.totalQuantity += action.quantity;
          grouped.actions.push(action);
        }
      }

      // Créer les items regroupés et générer les résultats
      for (const [key, grouped] of addItemMap.entries()) {
        creates.push({
          userId: grouped.userId,
          itemId: grouped.itemId,
          quantity: grouped.totalQuantity,
        });

        // Générer un résultat pour chaque action originale
        for (const action of grouped.actions) {
          results.push({
            type: 'addItem',
            userId: action.userId,
            itemId: action.itemId,
            success: true,
            updatedItem: {
              id: `pending-${Date.now()}`,
              quantity: grouped.totalQuantity,
            },
          });
        }
      }

      // Traiter les suppressions
      for (const action of removeItemActions) {
        const key = `${action.userId}:${action.itemId}`;
        const existingItem = existingItemsMap.get(key);

        if (!existingItem) {
          results.push({
            type: 'removeItem',
            userId: action.userId,
            itemId: action.itemId,
            success: false,
            error: 'Item not found in user inventory',
          });
          continue;
        }

        if (existingItem.quantity <= action.quantity) {
          // Supprimer complètement l'item
          updates.push({
            type: 'removeItem',
            id: existingItem.id,
            data: { delete: true },
          });

          results.push({
            type: 'removeItem',
            userId: action.userId,
            itemId: action.itemId,
            success: true,
          });
        } else {
          // Décrémenter la quantité
          updates.push({
            type: 'removeItem',
            id: existingItem.id,
            data: {
              quantity: { decrement: action.quantity },
            },
          });

          results.push({
            type: 'removeItem',
            userId: action.userId,
            itemId: action.itemId,
            success: true,
            updatedItem: {
              id: existingItem.id,
              quantity: existingItem.quantity - action.quantity,
            },
          });
        }
      }
    }

    // Exécuter toutes les mises à jour en une seule transaction
    const t5 = Date.now();
    if (updates.length > 0 || creates.length > 0) {
      await prisma.$transaction([
        // Créations
        ...creates.map((create) =>
          prisma.userLiveItem.create({
            data: {
              userId: create.userId,
              itemId: create.itemId,
              quantity: create.quantity,
            },
          })
        ),
        // Mises à jour et suppressions
        ...updates.map((update) => {
          if (update.type === 'removeItem' && update.data.delete) {
            return prisma.userLiveItem.delete({
              where: { id: update.id },
            });
          }

          return prisma.userLiveItem.update({
            where: { id: update.id },
            data: update.data,
          });
        }),
      ]);
    }
    const t6 = Date.now();
    perf.logQuery(
      t5,
      t6,
      `userLiveItem transaction (batch, ${updates.length} updates, ${creates.length} creates)`
    );

    // Pas besoin de revalidatePath ici car les optimistic updates côté client gèrent déjà l'UI
    // et le reload avec debounce synchronise avec le serveur
    // revalidatePath('/admin/live');

    const successCount = results.filter((r) => r.success).length;
    const errorCount = results.filter((r) => !r.success).length;

    logger.debug('[Admin Inventory Batch] Batch completed:', {
      adminId: session.user.id,
      totalActions: actions.length,
      successCount,
      errorCount,
    });

    perf.end(t0, {
      queryTime: t6 - t5,
      query: `transaction (${updates.length} updates)`,
      operation: 'POST /api/admin/inventory/batch',
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
    return handleApiError(error, 'POST /api/admin/inventory/batch');
  }
}
