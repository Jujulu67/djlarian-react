import { NextRequest } from 'next/server';

import { auth } from '@/auth';
import { handleApiError } from '@/lib/api/errorHandler';
import {
  createSuccessResponse,
  createUnauthorizedResponse,
  createBadRequestResponse,
  createConflictResponse,
} from '@/lib/api/responseHelpers';
import prisma from '@/lib/prisma';

/**
 * POST /api/friends/request
 * Envoie une demande d'ami à un utilisateur
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return createUnauthorizedResponse('Non autorisé');
    }

    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return createBadRequestResponse('userId est requis');
    }

    if (userId === session.user.id) {
      return createBadRequestResponse('Vous ne pouvez pas vous ajouter vous-même comme ami');
    }

    // Vérifier que l'utilisateur destinataire existe
    const recipient = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!recipient) {
      return createBadRequestResponse('Utilisateur destinataire non trouvé');
    }

    // Vérifier qu'il n'existe pas déjà une relation entre ces deux utilisateurs
    const existingFriendship = await prisma.friendship.findFirst({
      where: {
        OR: [
          {
            requesterId: session.user.id,
            recipientId: userId,
          },
          {
            requesterId: userId,
            recipientId: session.user.id,
          },
        ],
      },
    });

    if (existingFriendship) {
      if (existingFriendship.status === 'ACCEPTED') {
        return createConflictResponse('Vous êtes déjà ami avec cet utilisateur');
      }
      if (existingFriendship.status === 'PENDING') {
        if (existingFriendship.requesterId === session.user.id) {
          return createConflictResponse('Vous avez déjà envoyé une demande à cet utilisateur');
        } else {
          return createConflictResponse('Cet utilisateur vous a déjà envoyé une demande');
        }
      }
    }

    // Récupérer les infos de l'expéditeur pour la notification
    const requester = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, name: true, email: true },
    });

    // Créer la demande d'ami
    const friendship = await prisma.friendship.create({
      data: {
        requesterId: session.user.id,
        recipientId: userId,
        status: 'PENDING',
      },
      include: {
        Recipient: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    });

    // Créer une notification pour le destinataire
    const notificationMetadata = {
      friendshipId: friendship.id,
      requesterId: session.user.id,
      requesterName: requester?.name || requester?.email || 'Utilisateur',
      type: 'FRIEND_REQUEST',
    };

    await prisma.notification.create({
      data: {
        userId: userId,
        type: 'FRIEND_REQUEST',
        title: "Nouvelle demande d'ami",
        message: `${requester?.name || requester?.email || 'Un utilisateur'} vous a envoyé une demande d'ami`,
        metadata: JSON.stringify(notificationMetadata),
        isRead: false,
        isArchived: false,
        deletedAt: null,
      },
    });

    return createSuccessResponse(
      {
        id: friendship.id,
        recipient: friendship.Recipient,
        status: friendship.status,
        createdAt: friendship.createdAt,
      },
      201,
      "Demande d'ami envoyée"
    );
  } catch (error) {
    return handleApiError(error, 'POST /api/friends/request');
  }
}
