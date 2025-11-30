import { NextRequest } from 'next/server';

import { auth } from '@/auth';
import { handleApiError } from '@/lib/api/errorHandler';
import { createSuccessResponse, createUnauthorizedResponse } from '@/lib/api/responseHelpers';
import prisma from '@/lib/prisma';

/**
 * POST /api/notifications/read-all
 * Marque toutes les notifications de l'utilisateur comme lues
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return createUnauthorizedResponse('Non autorisé');
    }

    const result = await prisma.notification.updateMany({
      where: {
        userId: session.user.id,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return createSuccessResponse(
      { updated: result.count },
      200,
      'Toutes les notifications ont été marquées comme lues'
    );
  } catch (error) {
    return handleApiError(error, 'POST /api/notifications/read-all');
  }
}
