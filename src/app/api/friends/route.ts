import { NextRequest } from 'next/server';

import { auth } from '@/auth';
import { handleApiError } from '@/lib/api/errorHandler';
import { createSuccessResponse, createUnauthorizedResponse } from '@/lib/api/responseHelpers';
import prisma from '@/lib/prisma';

/**
 * GET /api/friends
 * Récupère la liste des amis, demandes reçues et demandes envoyées de l'utilisateur
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return createUnauthorizedResponse('Non autorisé');
    }

    const userId = session.user.id;

    // Récupérer toutes les relations d'amitié où l'utilisateur est impliqué
    const friendships = await prisma.friendship.findMany({
      where: {
        OR: [{ requesterId: userId }, { recipientId: userId }],
      },
      include: {
        Requester: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            role: true,
          },
        },
        Recipient: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            role: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Séparer les amis, demandes reçues et demandes envoyées
    const friends: Array<{
      id: string;
      user: {
        id: string;
        name: string | null;
        email: string | null;
        image: string | null;
        role: string | null;
      };
      friendshipId: string;
      createdAt: Date;
    }> = [];

    const pendingReceived: Array<{
      id: string;
      user: {
        id: string;
        name: string | null;
        email: string | null;
        image: string | null;
        role: string | null;
      };
      friendshipId: string;
      createdAt: Date;
    }> = [];

    const pendingSent: Array<{
      id: string;
      user: {
        id: string;
        name: string | null;
        email: string | null;
        image: string | null;
        role: string | null;
      };
      friendshipId: string;
      createdAt: Date;
    }> = [];

    friendships.forEach((friendship) => {
      if (friendship.status === 'ACCEPTED') {
        // C'est un ami - déterminer qui est l'autre utilisateur
        const otherUser =
          friendship.requesterId === userId ? friendship.Recipient : friendship.Requester;

        friends.push({
          id: otherUser.id,
          user: otherUser,
          friendshipId: friendship.id,
          createdAt: friendship.createdAt,
        });
      } else if (friendship.status === 'PENDING') {
        if (friendship.recipientId === userId) {
          // Demande reçue
          pendingReceived.push({
            id: friendship.Requester.id,
            user: friendship.Requester,
            friendshipId: friendship.id,
            createdAt: friendship.createdAt,
          });
        } else {
          // Demande envoyée
          pendingSent.push({
            id: friendship.Recipient.id,
            user: friendship.Recipient,
            friendshipId: friendship.id,
            createdAt: friendship.createdAt,
          });
        }
      }
    });

    return createSuccessResponse(
      {
        friends,
        pendingReceived,
        pendingSent,
      },
      200,
      "Relations d'amitié récupérées"
    );
  } catch (error) {
    return handleApiError(error, 'GET /api/friends');
  }
}
