import { NextRequest } from 'next/server';

import { auth } from '@/auth';
import { handleApiError } from '@/lib/api/errorHandler';
import {
  createSuccessResponse,
  createUnauthorizedResponse,
  createNotFoundResponse,
} from '@/lib/api/responseHelpers';
import prisma from '@/lib/prisma';

/**
 * DELETE /api/friends/[id]
 * Retire un ami (unfriend) - supprime la relation d'amitié
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return createUnauthorizedResponse('Non autorisé');
    }

    const { id: friendshipId } = await params;

    // Récupérer la relation d'amitié
    const friendship = await prisma.friendship.findUnique({
      where: { id: friendshipId },
    });

    if (!friendship) {
      return createNotFoundResponse("Relation d'amitié non trouvée");
    }

    // Vérifier que l'utilisateur actuel est impliqué dans cette relation
    if (friendship.requesterId !== session.user.id && friendship.recipientId !== session.user.id) {
      return createUnauthorizedResponse(
        "Vous ne pouvez retirer que vos propres relations d'amitié"
      );
    }

    // Supprimer la relation
    await prisma.friendship.delete({
      where: { id: friendshipId },
    });

    return createSuccessResponse({ id: friendshipId }, 200, 'Ami retiré de la liste');
  } catch (error) {
    return handleApiError(error, 'DELETE /api/friends/[id]');
  }
}
