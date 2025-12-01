import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';

import { auth } from '@/auth';
import { logger } from '@/lib/logger';
import prisma from '@/lib/prisma';
import { createSuccessResponse, createUnauthorizedResponse } from '@/lib/api/responseHelpers';
import { handleApiError } from '@/lib/api/errorHandler';
import type { LiveInventory, UserLiveItem, UserTicket } from '@/types/live';
import { calculateTicketWeight } from '@/lib/live/calculations';

const updateInventorySchema = z.object({
  itemId: z.string(),
  action: z.enum(['activate', 'deactivate']),
});

/**
 * GET /api/live/inventory
 * Récupère l'inventaire complet de l'utilisateur
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return createUnauthorizedResponse('Non authentifié');
    }

    // Récupérer tous les items de l'utilisateur avec leurs détails
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
    const tickets = await prisma.userTicket.findMany({
      where: {
        userId: session.user.id,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
    });

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

    return createSuccessResponse(inventory, 200, 'Inventaire récupéré');
  } catch (error) {
    return handleApiError(error, 'GET /api/live/inventory');
  }
}

/**
 * PUT /api/live/inventory
 * Active ou désactive un item
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return createUnauthorizedResponse('Non authentifié');
    }

    const body = await request.json();
    const validationResult = updateInventorySchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { itemId, action } = validationResult.data;

    // Vérifier que l'utilisateur possède cet item
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

    if (!userItem) {
      return NextResponse.json({ error: 'Item non trouvé dans votre inventaire' }, { status: 404 });
    }

    const itemType = userItem.LiveItem?.type || '';
    const itemName = userItem.LiveItem?.name || '';
    const isQueueSkip =
      itemType === 'SKIP_QUEUE' ||
      itemName.toLowerCase().includes('skip queue') ||
      itemName.toLowerCase().includes('queue skip');

    logger.debug('[Live Inventory] Activation attempt:', {
      itemId,
      itemType,
      itemName,
      isQueueSkip,
      action,
      currentActivatedQuantity: userItem.activatedQuantity,
      quantity: userItem.quantity,
    });

    // Logique d'activation
    if (action === 'activate') {
      // Vérifier qu'on peut encore activer
      if (userItem.activatedQuantity >= userItem.quantity) {
        return NextResponse.json({ error: 'Tous les items sont déjà activés' }, { status: 400 });
      }

      // Pour Skip_Queue: vérifier qu'aucun autre n'est activé
      if (isQueueSkip) {
        // Si on essaie d'activer (activatedQuantity va passer de 0 à 1)
        if (userItem.activatedQuantity === 0) {
          // Vérifier qu'aucun autre Queue Skip n'a activatedQuantity > 0
          const otherQueueSkips = await prisma.userLiveItem.findMany({
            where: {
              userId: session.user.id,
              id: { not: userItem.id },
              activatedQuantity: { gt: 0 },
            },
            include: {
              LiveItem: true,
            },
          });

          const existingActivatedQueueSkip = otherQueueSkips.find((item) => {
            const itemType = item.LiveItem?.type || '';
            const itemName = item.LiveItem?.name?.toLowerCase() || '';
            return (
              itemType === 'SKIP_QUEUE' ||
              itemName.includes('skip queue') ||
              itemName.includes('queue skip')
            );
          });

          if (existingActivatedQueueSkip) {
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
      }

      const wasInactive = userItem.activatedQuantity === 0;
      const newActivatedQuantity = userItem.activatedQuantity + 1;

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

      logger.debug(
        `[Live] Item ${itemId} activé (${newActivatedQuantity}/${userItem.quantity}) pour l'utilisateur ${session.user.id}`
      );

      revalidatePath('/admin/live');
      return createSuccessResponse(
        updatedItem,
        200,
        `Item activé avec succès (${newActivatedQuantity}/${userItem.quantity})`
      );
    } else {
      // Logique de désactivation
      if (userItem.activatedQuantity <= 0) {
        return NextResponse.json({ error: "Aucun item n'est activé" }, { status: 400 });
      }

      const newActivatedQuantity = userItem.activatedQuantity - 1;
      const becomesInactive = newActivatedQuantity === 0;

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

      logger.debug(
        `[Live] Item ${itemId} désactivé (${newActivatedQuantity}/${userItem.quantity}) pour l'utilisateur ${session.user.id}`
      );

      revalidatePath('/admin/live');
      return createSuccessResponse(
        updatedItem,
        200,
        `Item désactivé avec succès (${newActivatedQuantity}/${userItem.quantity})`
      );
    }
  } catch (error) {
    return handleApiError(error, 'PUT /api/live/inventory');
  }
}
