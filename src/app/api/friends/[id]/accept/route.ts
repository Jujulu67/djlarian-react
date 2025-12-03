import { NextRequest } from 'next/server';

import { auth } from '@/auth';
import { handleApiError } from '@/lib/api/errorHandler';
import {
  createSuccessResponse,
  createUnauthorizedResponse,
  createBadRequestResponse,
  createNotFoundResponse,
} from '@/lib/api/responseHelpers';
import prisma from '@/lib/prisma';

/**
 * POST /api/friends/[id]/accept
 * Accepte une demande d'ami (seul le destinataire peut accepter)
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return createUnauthorizedResponse('Non autorisé');
    }

    const { id: friendshipId } = await params;

    // Récupérer la demande d'ami
    const friendship = await prisma.friendship.findUnique({
      where: { id: friendshipId },
      include: {
        Requester: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    });

    if (!friendship) {
      return createNotFoundResponse("Demande d'ami non trouvée");
    }

    // Vérifier que l'utilisateur actuel est le destinataire
    if (friendship.recipientId !== session.user.id) {
      return createUnauthorizedResponse(
        'Vous ne pouvez accepter que les demandes qui vous sont adressées'
      );
    }

    // Vérifier que la demande est en attente
    if (friendship.status !== 'PENDING') {
      return createBadRequestResponse(
        `Cette demande n'est plus en attente (statut: ${friendship.status})`
      );
    }

    // Récupérer les infos du destinataire (celui qui accepte) pour la notification
    const recipient = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, name: true, email: true },
    });

    // Accepter la demande
    const updatedFriendship = await prisma.friendship.update({
      where: { id: friendshipId },
      data: { status: 'ACCEPTED' },
      include: {
        Requester: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    });

    // Créer une notification pour l'expéditeur de la demande (celui qui a envoyé la demande)
    const notificationMetadata = {
      friendshipId: updatedFriendship.id,
      recipientId: session.user.id,
      recipientName: recipient?.name || recipient?.email || 'Utilisateur',
      type: 'FRIEND_ACCEPTED',
    };

    await prisma.notification.create({
      data: {
        userId: updatedFriendship.requesterId,
        type: 'FRIEND_ACCEPTED',
        title: "Demande d'ami acceptée",
        message: `${recipient?.name || recipient?.email || 'Un utilisateur'} a accepté votre demande d'ami`,
        metadata: JSON.stringify(notificationMetadata),
        isRead: false,
        isArchived: false,
        deletedAt: null,
      },
    });

    return createSuccessResponse(
      {
        id: updatedFriendship.id,
        requester: updatedFriendship.Requester,
        status: updatedFriendship.status,
        updatedAt: updatedFriendship.updatedAt,
      },
      200,
      "Demande d'ami acceptée"
    );
  } catch (error) {
    return handleApiError(error, 'POST /api/friends/[id]/accept');
  }
}
