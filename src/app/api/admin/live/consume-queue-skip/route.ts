import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { createUnauthorizedResponse, createSuccessResponse } from '@/lib/api/responseHelpers';
import { handleApiError } from '@/lib/api/errorHandler';
import prisma from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { LiveItemType } from '@/types/live';

/**
 * POST /api/admin/live/consume-queue-skip
 * Consomme (supprime) l'item QUEUE_SKIP de l'inventaire d'un utilisateur après un roll
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== 'ADMIN') {
      return createUnauthorizedResponse('Non autorisé');
    }

    const body = await request.json();
    const { userId, itemId } = body;

    if (!userId || typeof userId !== 'string') {
      return NextResponse.json({ error: 'userId requis' }, { status: 400 });
    }

    // Si itemId est fourni, l'utiliser directement, sinon chercher l'item
    let queueSkipItemId: string;

    if (itemId && typeof itemId === 'string') {
      queueSkipItemId = itemId;
    } else {
      // Trouver l'item Queue Skip dans la base de données (type: SKIP_QUEUE)
      const queueSkipItem = await prisma.liveItem.findFirst({
        where: {
          OR: [{ type: 'SKIP_QUEUE' }, { name: { contains: 'Skip Queue', mode: 'insensitive' } }],
        },
      });

      if (!queueSkipItem) {
        return NextResponse.json(
          { error: 'Item Queue Skip non trouvé dans la base de données' },
          { status: 404 }
        );
      }
      queueSkipItemId = queueSkipItem.id;
    }

    // Vérifier que l'utilisateur possède cet item et qu'il est activé
    const userItem = await prisma.userLiveItem.findUnique({
      where: {
        userId_itemId: {
          userId,
          itemId: queueSkipItemId,
        },
      },
      include: {
        LiveItem: true,
      },
    });

    if (!userItem) {
      return NextResponse.json(
        { error: "L'utilisateur ne possède pas l'item QUEUE_SKIP" },
        { status: 404 }
      );
    }

    if ((userItem.activatedQuantity || 0) <= 0) {
      return NextResponse.json(
        { error: "L'item QUEUE_SKIP n'est pas activé pour cet utilisateur" },
        { status: 400 }
      );
    }

    // Supprimer l'item (consommation)
    await prisma.userLiveItem.delete({
      where: {
        id: userItem.id,
      },
    });

    logger.debug(
      `[Admin Live] Queue Skip consommé pour l'utilisateur ${userId} (item ${userItem.id} supprimé)`
    );

    return createSuccessResponse(
      { consumed: true, itemId: userItem.id },
      200,
      'Queue Skip consommé avec succès'
    );
  } catch (error) {
    return handleApiError(error, 'POST /api/admin/live/consume-queue-skip');
  }
}
