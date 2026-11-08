import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';

import { requireAuth } from '@/lib/api/requireAuth';
import { logger } from '@/lib/logger';
import prisma from '@/lib/prisma';
import { createSuccessResponse, createUnauthorizedResponse } from '@/lib/api/responseHelpers';
import { handleApiError } from '@/lib/api/errorHandler';
import type { LiveInventory, UserLiveItem, UserTicket } from '@/types/live';
import { calculateTicketWeight } from '@/lib/live/calculations';
import { createDbPerformanceLogger } from '@/lib/db-performance';

const updateInventorySchema = z.object({
  itemId: z.string(),
  action: z.enum(['activate', 'deactivate']),
});

/**
 * Un item est un Queue Skip si son type ou son nom l'indique
 */
function isQueueSkipItem(type: string, name: string): boolean {
  return (
    type === 'SKIP_QUEUE' ||
    name.toLowerCase().includes('skip queue') ||
    name.toLowerCase().includes('queue skip')
  );
}

/**
 * Contexte partagé entre l'activation et la désactivation d'un item
 */
interface InventoryCallContext {
  perf: ReturnType<typeof createDbPerformanceLogger>;
  t0: number;
  userId: string;
  itemId: string;
  userItem: {
    id: string;
    quantity: number;
    activatedQuantity: number;
    activatedAt: Date | null;
  };
  /** Durée de la requête de recherche de l'item (ms) */
  findDuration: number;
}

/**
 * Vérifie les règles des Queue Skip avant activation.
 * Renvoie une réponse d'erreur si l'activation est interdite, sinon null.
 */
async function checkQueueSkipActivation(ctx: InventoryCallContext): Promise<NextResponse | null> {
  const { perf, userId, userItem } = ctx;

  // Si on essaie d'activer (activatedQuantity va passer de 0 à 1)
  if (userItem.activatedQuantity === 0) {
    // Vérifier qu'aucun autre Queue Skip n'a activatedQuantity > 0
    const t3 = Date.now();
    const otherQueueSkips = await prisma.userLiveItem.findMany({
      where: {
        userId,
        id: { not: userItem.id },
        activatedQuantity: { gt: 0 },
      },
      include: {
        LiveItem: true,
      },
    });
    const t4 = Date.now();
    perf.logQuery(t3, t4, 'userLiveItem.findMany (queue skip check)');

    const hasActivatedQueueSkip = otherQueueSkips.some((item) =>
      isQueueSkipItem(item.LiveItem?.type || '', item.LiveItem?.name || '')
    );

    if (hasActivatedQueueSkip) {
      return NextResponse.json(
        {
          error:
            "Un Queue Skip est déjà activé. Désactivez-le d'abord avant d'en activer un autre.",
        },
        { status: 400 }
      );
    }
  }

  // Pour Skip_Queue, limiter activatedQuantity à 1 max
  if (userItem.activatedQuantity >= 1) {
    return NextResponse.json(
      { error: 'Un seul Queue Skip peut être activé à la fois' },
      { status: 400 }
    );
  }

  return null;
}

/**
 * Activation d'un item (incrémente activatedQuantity)
 */
async function handleActivate(ctx: InventoryCallContext, isQueueSkip: boolean) {
  const { perf, t0, userId, itemId, userItem, findDuration } = ctx;

  // Vérifier qu'on peut encore activer
  if (userItem.activatedQuantity >= userItem.quantity) {
    return NextResponse.json({ error: 'Tous les items sont déjà activés' }, { status: 400 });
  }

  if (isQueueSkip) {
    const queueSkipError = await checkQueueSkipActivation(ctx);
    if (queueSkipError) return queueSkipError;
  }

  const wasInactive = userItem.activatedQuantity === 0;
  const newActivatedQuantity = userItem.activatedQuantity + 1;

  const t5 = Date.now();
  const updatedItem = await prisma.userLiveItem.update({
    where: {
      id: userItem.id,
    },
    data: {
      activatedQuantity: newActivatedQuantity,
      isActivated: newActivatedQuantity > 0, // Mettre à jour pour compatibilité
      activatedAt: wasInactive ? new Date() : userItem.activatedAt,
    },
    include: {
      LiveItem: true,
    },
  });
  const t6 = Date.now();
  perf.logQuery(t5, t6, 'userLiveItem.update (activate)');

  logger.debug(
    `[Live] Item ${itemId} activé (${newActivatedQuantity}/${userItem.quantity}) pour l'utilisateur ${userId}`
  );

  revalidatePath('/admin/live');

  perf.end(t0, {
    queryTime: findDuration + (t6 - t5),
    query: 'findUnique + update (activate)',
    operation: 'PUT /api/live/inventory (activate)',
  });

  return createSuccessResponse(
    updatedItem,
    200,
    `Item activé avec succès (${newActivatedQuantity}/${userItem.quantity})`
  );
}

/**
 * Désactivation d'un item (décrémente activatedQuantity)
 */
async function handleDeactivate(ctx: InventoryCallContext) {
  const { perf, t0, userId, itemId, userItem, findDuration } = ctx;

  if (userItem.activatedQuantity <= 0) {
    return NextResponse.json({ error: "Aucun item n'est activé" }, { status: 400 });
  }

  const newActivatedQuantity = userItem.activatedQuantity - 1;
  const becomesInactive = newActivatedQuantity === 0;

  const t7 = Date.now();
  const updatedItem = await prisma.userLiveItem.update({
    where: {
      id: userItem.id,
    },
    data: {
      activatedQuantity: newActivatedQuantity,
      isActivated: newActivatedQuantity > 0, // Mettre à jour pour compatibilité
      activatedAt: becomesInactive ? null : userItem.activatedAt,
    },
    include: {
      LiveItem: true,
    },
  });
  const t8 = Date.now();
  perf.logQuery(t7, t8, 'userLiveItem.update (deactivate)');

  logger.debug(
    `[Live] Item ${itemId} désactivé (${newActivatedQuantity}/${userItem.quantity}) pour l'utilisateur ${userId}`
  );

  revalidatePath('/admin/live');

  perf.end(t0, {
    queryTime: findDuration + (t8 - t7),
    query: 'findUnique + update (deactivate)',
    operation: 'PUT /api/live/inventory (deactivate)',
  });

  return createSuccessResponse(
    updatedItem,
    200,
    `Item désactivé avec succès (${newActivatedQuantity}/${userItem.quantity})`
  );
}

/**
 * GET /api/live/inventory
 * Récupère l'inventaire complet de l'utilisateur
 */
export async function GET() {
  const perf = createDbPerformanceLogger('GET /api/live/inventory');
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

    // Récupérer tous les items de l'utilisateur avec leurs détails
    const t1 = Date.now();
    const userItems = await prisma.userLiveItem.findMany({
      where: {
        userId: session.user.id,
      },
      include: {
        LiveItem: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    const t2 = Date.now();
    perf.logQuery(t1, t2, 'userLiveItem.findMany');

    // Séparer les items activés et non activés (basé sur activatedQuantity)
    // activatedItems: items avec au moins un item activé
    const activatedItems = userItems.filter(
      (item) => (item.activatedQuantity || 0) > 0
    ) as UserLiveItem[];
    // unactivatedItems: items avec encore des items non activés (peut inclure des items partiellement activés)
    const unactivatedItems = userItems.filter(
      (item) => (item.activatedQuantity || 0) < item.quantity
    ) as UserLiveItem[];

    // Récupérer les tickets actifs
    const t3 = Date.now();
    const tickets = await prisma.userTicket.findMany({
      where: {
        userId: session.user.id,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
    });
    const t4 = Date.now();
    perf.logQuery(t3, t4, 'userTicket.findMany');

    // Debug: Vérifier les données
    logger.debug('[Live Inventory] Activated items:', {
      count: activatedItems.length,
      types: activatedItems.map((item) => item.LiveItem?.type),
      eternalTicketItem: activatedItems.find(
        (item) => String(item.LiveItem?.type) === 'ETERNAL_TICKET'
      ),
    });
    logger.debug('[Live Inventory] Tickets:', {
      count: tickets.length,
      eternalTickets: tickets.filter((t) => String(t.source) === 'ETERNAL_TICKET'),
    });

    // Calculer le poids total (active tickets) en utilisant calculateTicketWeight
    const totalTickets = calculateTicketWeight(tickets as UserTicket[], activatedItems);

    logger.debug('[Live Inventory] Calculated weight:', totalTickets);

    const inventory: LiveInventory = {
      activatedItems,
      unactivatedItems,
      totalTickets,
    };

    perf.end(t0, {
      queryTime: t2 - t1 + (t4 - t3),
      query: 'userLiveItem.findMany + userTicket.findMany',
      operation: 'GET /api/live/inventory',
    });

    return createSuccessResponse(inventory, 200, 'Inventaire récupéré');
  } catch (error) {
    perf.end(t0, { metadata: { error: error instanceof Error ? error.message : String(error) } });
    return handleApiError(error, 'GET /api/live/inventory');
  }
}

/**
 * PUT /api/live/inventory
 * Active ou désactive un item
 */
export async function PUT(request: NextRequest) {
  const perf = createDbPerformanceLogger('PUT /api/live/inventory');
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
    const validationResult = updateInventorySchema.safeParse(body);

    if (!validationResult.success) {
      perf.end(t0, { metadata: { error: 'Validation failed' } });
      return NextResponse.json(
        { error: 'Données invalides', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { itemId, action } = validationResult.data;

    // Vérifier que l'utilisateur possède cet item
    const t1 = Date.now();
    const userItem = await prisma.userLiveItem.findUnique({
      where: {
        userId_itemId: {
          userId: session.user.id,
          itemId,
        },
      },
      include: {
        LiveItem: true,
      },
    });
    const t2 = Date.now();
    perf.logQuery(t1, t2, 'userLiveItem.findUnique');

    if (!userItem) {
      perf.end(t0, { queryTime: t2 - t1, query: 'findUnique (not found)' });
      return NextResponse.json({ error: 'Item non trouvé dans votre inventaire' }, { status: 404 });
    }

    const itemType = userItem.LiveItem?.type || '';
    const itemName = userItem.LiveItem?.name || '';
    const isQueueSkip = isQueueSkipItem(itemType, itemName);

    logger.debug('[Live Inventory] Activation attempt:', {
      itemId,
      itemType,
      itemName,
      isQueueSkip,
      action,
      currentActivatedQuantity: userItem.activatedQuantity,
      quantity: userItem.quantity,
    });

    const ctx: InventoryCallContext = {
      perf,
      t0,
      userId: session.user.id,
      itemId,
      userItem,
      findDuration: t2 - t1,
    };

    // Logique d'activation / désactivation
    if (action === 'activate') {
      return await handleActivate(ctx, isQueueSkip);
    }
    return await handleDeactivate(ctx);
  } catch (error) {
    perf.end(t0, { metadata: { error: error instanceof Error ? error.message : String(error) } });
    return handleApiError(error, 'PUT /api/live/inventory');
  }
}
