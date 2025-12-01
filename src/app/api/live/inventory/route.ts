import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { auth } from '@/auth';
import { logger } from '@/lib/logger';
import prisma from '@/lib/prisma';
import { createSuccessResponse, createUnauthorizedResponse } from '@/lib/api/responseHelpers';
import { handleApiError } from '@/lib/api/errorHandler';
import type { LiveInventory, UserLiveItem } from '@/types/live';

const updateInventorySchema = z.object({
  itemId: z.string(),
  isActivated: z.boolean(),
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

    // Séparer les items activés et non activés
    const activatedItems = userItems.filter((item) => item.isActivated) as UserLiveItem[];
    const unactivatedItems = userItems.filter((item) => !item.isActivated) as UserLiveItem[];

    // Calculer le total de tickets
    const tickets = await prisma.userTicket.findMany({
      where: {
        userId: session.user.id,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
    });

    const totalTickets = tickets.reduce((sum, ticket) => sum + ticket.quantity, 0);

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

    const { itemId, isActivated } = validationResult.data;

    // Vérifier que l'utilisateur possède cet item
    const userItem = await prisma.userLiveItem.findUnique({
      where: {
        userId_itemId: {
          userId: session.user.id,
          itemId,
        },
      },
    });

    if (!userItem) {
      return NextResponse.json({ error: 'Item non trouvé dans votre inventaire' }, { status: 404 });
    }

    // Mettre à jour l'item
    const updatedItem = await prisma.userLiveItem.update({
      where: {
        id: userItem.id,
      },
      data: {
        isActivated,
        activatedAt: isActivated ? new Date() : null,
      },
      include: {
        LiveItem: true,
      },
    });

    logger.debug(
      `[Live] Item ${itemId} ${isActivated ? 'activé' : 'désactivé'} pour l'utilisateur ${session.user.id}`
    );

    return createSuccessResponse(
      updatedItem,
      200,
      `Item ${isActivated ? 'activé' : 'désactivé'} avec succès`
    );
  } catch (error) {
    return handleApiError(error, 'PUT /api/live/inventory');
  }
}
