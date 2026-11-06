import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { requireAuth } from '@/lib/api/requireAuth';
import { logger } from '@/lib/logger';
import prisma from '@/lib/prisma';
import type { Prisma } from '@prisma/client';
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
type UserItem = Prisma.UserLiveItemGetPayload<{ include: { LiveItem: true } }>;

interface ActionCounts {
  activate: number;
  deactivate: number;
  userItem: UserItem;
}

interface ItemUpdate {
  id: string;
  newActivatedQuantity: number;
  becomesInactive: boolean;
  wasInactive: boolean;
}

const QUEUE_SKIP_LIMIT_ERROR = 'Un seul Queue Skip peut être activé à la fois';

function isQueueSkip(item: UserItem): boolean {
  const name = item.LiveItem?.name?.toLowerCase() || '';
  return (
    item.LiveItem?.type === 'SKIP_QUEUE' ||
    name.includes('skip queue') ||
    name.includes('queue skip')
  );
}

/** Autant de résultats identiques que d'actions du même type. */
function repeatResult(count: number, result: BatchActionResult): BatchActionResult[] {
  return Array.from({ length: count }, () => ({ ...result }));
}

/** Compte les actions par item pour raisonner sur le changement net. */
function countActions(
  actions: Array<{ itemId: string; action: string }>,
  itemsMap: Map<string, UserItem>
): Map<string, ActionCounts> {
  const actionCounts = new Map<string, ActionCounts>();
  for (const { itemId, action } of actions) {
    const userItem = itemsMap.get(itemId);
    if (!userItem) continue;
    const counts = actionCounts.get(itemId) ?? { activate: 0, deactivate: 0, userItem };
    if (action === 'activate') counts.activate++;
    else counts.deactivate++;
    actionCounts.set(itemId, counts);
  }
  return actionCounts;
}

/** Erreur empêchant toute activation de cet item, s'il y en a une. */
function findActivationError(userItem: UserItem, userItems: UserItem[]): string | null {
  const currentActivated = userItem.activatedQuantity || 0;
  if (currentActivated >= userItem.quantity) return 'Tous les items sont déjà activés';
  if (!isQueueSkip(userItem)) return null;
  // Un seul Queue Skip activé à la fois, même dans un batch
  if (currentActivated >= 1) return QUEUE_SKIP_LIMIT_ERROR;
  const otherIsActive = userItems.some(
    (item) => item.id !== userItem.id && (item.activatedQuantity || 0) > 0 && isQueueSkip(item)
  );
  return otherIsActive
    ? "Un Queue Skip est déjà activé. Désactivez-le d'abord avant d'en activer un autre."
    : null;
}

/** Résultats et mise à jour éventuelle pour un item, d'après son changement net. */
function planItemChange(
  itemId: string,
  { activate, deactivate, userItem }: ActionCounts,
  userItems: UserItem[]
): { results: BatchActionResult[]; update?: ItemUpdate } {
  const activated = (result: Partial<BatchActionResult> = {}) =>
    repeatResult(activate, { itemId, action: 'activate', success: true, ...result });
  const deactivated = (result: Partial<BatchActionResult> = {}) =>
    repeatResult(deactivate, { itemId, action: 'deactivate', success: true, ...result });

  const netChange = activate - deactivate;
  // Pas de changement net : les actions s'annulent
  if (netChange === 0) return { results: [...activated(), ...deactivated()] };

  const currentActivated = userItem.activatedQuantity || 0;

  if (netChange > 0) {
    const activationError = findActivationError(userItem, userItems);
    if (activationError) {
      return {
        results: [...activated({ success: false, error: activationError }), ...deactivated()],
      };
    }
    // Au plus un Queue Skip : la première activation passe, les autres échouent
    if (isQueueSkip(userItem) && netChange > 1) {
      return {
        results: [
          { itemId, action: 'activate', success: true },
          ...repeatResult(activate - 1, {
            itemId,
            action: 'activate',
            success: false,
            error: QUEUE_SKIP_LIMIT_ERROR,
          }),
          ...deactivated(),
        ],
        update: {
          id: userItem.id,
          newActivatedQuantity: 1,
          becomesInactive: false,
          wasInactive: true,
        },
      };
    }
  } else if (currentActivated <= 0) {
    return {
      results: [
        ...deactivated({ success: false, error: "Aucun item n'est activé" }),
        ...activated(),
      ],
    };
  }

  const newActivatedQuantity = Math.max(
    0,
    Math.min(userItem.quantity, currentActivated + netChange)
  );
  const updatedItem = {
    id: userItem.id,
    activatedQuantity: newActivatedQuantity,
    quantity: userItem.quantity,
  };
  return {
    results: [...activated({ updatedItem }), ...deactivated({ updatedItem })],
    update: {
      id: userItem.id,
      newActivatedQuantity,
      becomesInactive: newActivatedQuantity === 0,
      wasInactive: currentActivated === 0 && netChange > 0,
    },
  };
}

/** Date d'activation après la mise à jour. */
function nextActivatedAt(update: ItemUpdate, current: Date | null): Date | null {
  if (update.wasInactive && update.newActivatedQuantity > 0) return new Date();
  return update.becomesInactive ? null : current;
}

export async function POST(request: NextRequest) {
  const perf = createDbPerformanceLogger('POST /api/live/inventory/batch');
  const t0 = perf.start();
  try {
    const { session, error } = await requireAuth({
      requireUserId: true,
      onAnonymous: () => {
        perf.end(t0, { metadata: { error: 'Unauthorized' } });
        return createUnauthorizedResponse('Non authentifié');
      },
    });
    if (error) return error;

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

    const results: BatchActionResult[] = [];
    const updates: ItemUpdate[] = [];
    for (const [itemId, counts] of countActions(actions, itemsMap)) {
      const plan = planItemChange(itemId, counts, userItems);
      results.push(...plan.results);
      if (plan.update) updates.push(plan.update);
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
              activatedAt: nextActivatedAt(update, userItem.activatedAt),
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
