import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { createUnauthorizedResponse, createSuccessResponse } from '@/lib/api/responseHelpers';
import { handleApiError } from '@/lib/api/errorHandler';
import prisma from '@/lib/prisma';
import { LiveItemType } from '@/types/live';

/**
 * GET /api/admin/live/queue-skip-id
 * Récupère l'ID de l'item Queue Skip depuis la base de données
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== 'ADMIN') {
      return createUnauthorizedResponse('Non autorisé');
    }

    // Trouver l'item Queue Skip dans la base de données (type: SKIP_QUEUE)
    // Note: SQLite ne supporte pas mode: 'insensitive', on fait la recherche par type principalement
    const queueSkipItem = await prisma.liveItem.findFirst({
      where: {
        OR: [
          { type: 'SKIP_QUEUE' },
          { name: { contains: 'Skip Queue' } },
          { name: { contains: 'skip queue' } },
          { name: { contains: 'SKIP QUEUE' } },
        ],
      },
    });

    if (!queueSkipItem) {
      return NextResponse.json(
        { error: 'Item Queue Skip non trouvé dans la base de données' },
        { status: 404 }
      );
    }

    return createSuccessResponse(
      { queueSkipItemId: queueSkipItem.id, type: queueSkipItem.type, name: queueSkipItem.name },
      200,
      'ID de Queue Skip récupéré'
    );
  } catch (error) {
    return handleApiError(error, 'GET /api/admin/live/queue-skip-id');
  }
}
