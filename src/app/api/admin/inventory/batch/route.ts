import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { logger } from '@/lib/logger';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/api/requireAuth';
import {
  createForbiddenResponse,
  createSuccessResponse,
  createUnauthorizedResponse,
} from '@/lib/api/responseHelpers';
import { handleApiError } from '@/lib/api/errorHandler';
import { createDbPerformanceLogger } from '@/lib/db-performance';
import { Prisma } from '@prisma/client';

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
type BatchAction = z.infer<typeof batchActionSchema>;
type ActionOf<T extends BatchAction['type']> = Extract<BatchAction, { type: T }>;
type UserItemWithLive = Prisma.UserLiveItemGetPayload<{ include: { LiveItem: true } }>;
type UserItem = Prisma.UserLiveItemGetPayload<object>;
type PerfLogger = ReturnType<typeof createDbPerformanceLogger>;

/** Résultats à renvoyer et écritures à faire dans une seule transaction. */
interface BatchPlan {
  results: BatchActionResult[];
  updates: Array<{
    type: 'activate' | 'deactivate' | 'addItem' | 'removeItem';
    id: string;
    data: Prisma.UserLiveItemUpdateInput & { delete?: boolean };
  }>;
  creates: Array<{ userId: string; itemId: string; quantity: number }>;
}

function isQueueSkip(item: UserItemWithLive): boolean {
  const name = item.LiveItem?.name?.toLowerCase() || '';
  return (
    item.LiveItem?.type === 'SKIP_QUEUE' ||
    name.includes('skip queue') ||
    name.includes('queue skip')
  );
}

/** Un seul Queue Skip activé à la fois par utilisateur, en tenant compte du batch en cours. */
function findQueueSkipError(
  userItem: UserItemWithLive,
  userItems: UserItemWithLive[],
  batchState: Map<string, number>
): string | null {
  if (!isQueueSkip(userItem)) return null;
  if ((batchState.get(userItem.id) || 0) >= 1) {
    return 'Un seul Queue Skip peut être activé à la fois';
  }
  const otherIsActive = userItems.some(
    (item) =>
      item.id !== userItem.id &&
      item.userId === userItem.userId &&
      (batchState.get(item.id) || item.activatedQuantity || 0) > 0 &&
      isQueueSkip(item)
  );
  return otherIsActive
    ? "Un Queue Skip est déjà activé. Désactivez-le d'abord avant d'en activer un autre."
    : null;
}

function planActivation(
  action: ActionOf<'activate'>,
  userItems: UserItemWithLive[],
  itemsMap: Map<string, UserItemWithLive>,
  batchState: Map<string, number>,
  { results, updates }: BatchPlan
): void {
  const userItem = itemsMap.get(action.userItemId);
  if (!userItem) {
    results.push({
      type: 'activate',
      userItemId: action.userItemId,
      success: false,
      error: 'Item not found',
    });
    return;
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
    return;
  }

  const queueSkipError = findQueueSkipError(userItem, userItems, batchState);
  if (queueSkipError) {
    results.push({
      type: 'activate',
      userItemId: action.userItemId,
      itemId: userItem.itemId,
      success: false,
      error: queueSkipError,
    });
    return;
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

function planDeactivation(
  action: ActionOf<'deactivate'>,
  itemsMap: Map<string, UserItemWithLive>,
  { results, updates }: BatchPlan
): void {
  const userItem = itemsMap.get(action.userItemId);
  if (!userItem) {
    results.push({
      type: 'deactivate',
      userItemId: action.userItemId,
      success: false,
      error: 'Item not found',
    });
    return;
  }

  if (userItem.activatedQuantity <= 0) {
    results.push({
      type: 'deactivate',
      userItemId: action.userItemId,
      itemId: userItem.itemId,
      success: false,
      error: "Aucun item n'est activé",
    });
    return;
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

async function planActivations(
  activateActions: ActionOf<'activate'>[],
  deactivateActions: ActionOf<'deactivate'>[],
  plan: BatchPlan,
  perf: PerfLogger
): Promise<void> {
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
    planActivation(action, userItems, itemsMap, batchState, plan);
  }
  for (const action of deactivateActions) {
    planDeactivation(action, itemsMap, plan);
  }
}

/** Ajouts : incrément si l'item existe, sinon une seule création par utilisateur et item. */
function planAdditions(
  addItemActions: ActionOf<'addItem'>[],
  existingItemsMap: Map<string, UserItem>,
  { results, updates, creates }: BatchPlan
): void {
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
  for (const [, grouped] of addItemMap.entries()) {
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
}

function planRemoval(
  action: ActionOf<'removeItem'>,
  existingItemsMap: Map<string, UserItem>,
  { results, updates }: BatchPlan
): void {
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
    return;
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

async function planItemChanges(
  addItemActions: ActionOf<'addItem'>[],
  removeItemActions: ActionOf<'removeItem'>[],
  plan: BatchPlan,
  perf: PerfLogger
): Promise<void> {
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

  planAdditions(addItemActions, existingItemsMap, plan);
  for (const action of removeItemActions) {
    planRemoval(action, existingItemsMap, plan);
  }
}

export async function POST(request: NextRequest) {
  const perf = createDbPerformanceLogger('POST /api/admin/inventory/batch');
  const t0 = perf.start();
  try {
    const { session, error: authError } = await requireAdmin({
      onAnonymous: () => createUnauthorizedResponse('Non autorisé'),
      onNonAdmin: () => createForbiddenResponse('Non autorisé'),
    });
    if (authError) {
      perf.end(t0, { metadata: { error: 'Unauthorized' } });
      return authError;
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

    const plan: BatchPlan = { results: [], updates: [], creates: [] };
    const { results, updates, creates } = plan;

    if (activateActions.length > 0 || deactivateActions.length > 0) {
      await planActivations(activateActions, deactivateActions, plan, perf);
    }
    if (addItemActions.length > 0 || removeItemActions.length > 0) {
      await planItemChanges(addItemActions, removeItemActions, plan, perf);
    }

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
