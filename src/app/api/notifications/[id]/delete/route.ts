import { NextRequest } from 'next/server';

import { handleApiError } from '@/lib/api/errorHandler';
import {
  createSuccessResponse,
  createBadRequestResponse,
  createUnauthorizedResponse,
  createNotFoundResponse,
} from '@/lib/api/responseHelpers';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/api/requireAuth';

/**
 * DELETE /api/notifications/[id]/delete
 * Supprime définitivement une notification
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const { session, error } = await requireAuth({
      requireUserId: true,
      onAnonymous: () => createUnauthorizedResponse('Non autorisé'),
    });
    if (error) return error;

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

    // Supprimer définitivement la notification
    await prisma.notification.delete({
      where: { id: notificationId },
    });

    return createSuccessResponse(
      { id: notificationId },
      200,
      'Notification supprimée définitivement'
    );
  } catch (error) {
    return handleApiError(error, 'DELETE /api/notifications/[id]/delete');
  }
}
