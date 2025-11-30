import { NextRequest } from 'next/server';

import { auth } from '@/auth';
import { handleApiError } from '@/lib/api/errorHandler';
import {
  createSuccessResponse,
  createBadRequestResponse,
  createUnauthorizedResponse,
  createNotFoundResponse,
} from '@/lib/api/responseHelpers';
import prisma from '@/lib/prisma';

/**
 * PATCH /api/notifications/[id]/archive
 * Archive une notification
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return createUnauthorizedResponse('Non autorisé');
    }

    const resolvedParams = await Promise.resolve(params);
    const notificationId = resolvedParams.id;

    if (!notificationId) {
      return createBadRequestResponse('ID de notification requis');
    }

    // Vérifier que la notification existe et appartient à l'utilisateur
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      return createNotFoundResponse('Notification non trouvée');
    }

    if (notification.userId !== session.user.id) {
      return createUnauthorizedResponse('Non autorisé');
    }

    // Archiver la notification
    const updated = await prisma.notification.update({
      where: { id: notificationId },
      data: {
        isArchived: true,
      },
      select: {
        id: true,
        userId: true,
        type: true,
        title: true,
        message: true,
        metadata: true,
        isRead: true,
        isArchived: true,
        deletedAt: true,
        createdAt: true,
        readAt: true,
        projectId: true,
        Project: {
          select: {
            id: true,
            name: true,
            releaseDate: true,
            streamsJ180: true,
            streamsJ365: true,
          },
        },
      },
    });

    // Sérialiser les dates
    const serialized = {
      ...updated,
      createdAt: updated.createdAt.toISOString(),
      readAt: updated.readAt ? updated.readAt.toISOString() : null,
      deletedAt: updated.deletedAt ? updated.deletedAt.toISOString() : null,
      Project: updated.Project
        ? {
            ...updated.Project,
            releaseDate: updated.Project.releaseDate
              ? updated.Project.releaseDate.toISOString()
              : null,
          }
        : null,
    };

    return createSuccessResponse(serialized, 200, 'Notification archivée');
  } catch (error) {
    return handleApiError(error, 'PATCH /api/notifications/[id]/archive');
  }
}
