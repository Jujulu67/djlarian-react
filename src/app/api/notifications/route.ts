import { NextRequest } from 'next/server';

import { auth } from '@/auth';
import { handleApiError } from '@/lib/api/errorHandler';
import { createSuccessResponse, createUnauthorizedResponse } from '@/lib/api/responseHelpers';
import prisma from '@/lib/prisma';

export type NotificationType =
  | 'MILESTONE'
  | 'ADMIN_MESSAGE'
  | 'RELEASE_UPCOMING'
  | 'INFO'
  | 'WARNING';

/**
 * GET /api/notifications
 * Récupère les notifications de l'utilisateur
 * Query params optionnels:
 * - unreadOnly: ne récupérer que les non lues (default: false)
 * - type: filtrer par type de notification
 * - limit: nombre maximum de notifications (default: 50)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return createUnauthorizedResponse('Non autorisé');
    }

    const { searchParams } = new URL(request.url);
    const unreadOnly = searchParams.get('unreadOnly') === 'true';
    const type = searchParams.get('type') as NotificationType | null;
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const where: any = {
      userId: session.user.id,
    };

    // Exclure les notifications archivées et supprimées par défaut
    // Permettre de récupérer les archivées si demandé
    const includeArchived = searchParams.get('includeArchived') === 'true';
    if (!includeArchived) {
      where.isArchived = false;
      where.deletedAt = null;
    }

    if (unreadOnly) {
      where.isRead = false;
    }

    if (type) {
      where.type = type;
    }

    const notifications = await prisma.notification.findMany({
      where,
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
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    });

    // Compter les notifications non lues (non archivées)
    const unreadCount = await prisma.notification.count({
      where: {
        userId: session.user.id,
        isRead: false,
        isArchived: false,
        deletedAt: null,
      },
    });

    // S'assurer que toutes les notifications ont les champs requis et sérialiser les dates
    const sanitizedNotifications = notifications.map((notif) => {
      // Convertir les dates en strings ISO et s'assurer que les booléens sont corrects
      return {
        id: notif.id,
        userId: notif.userId,
        type: notif.type,
        title: notif.title,
        message: notif.message,
        metadata: notif.metadata,
        isRead: Boolean(notif.isRead),
        isArchived: Boolean(notif.isArchived ?? false),
        deletedAt: notif.deletedAt
          ? notif.deletedAt instanceof Date
            ? notif.deletedAt.toISOString()
            : notif.deletedAt
          : null,
        createdAt:
          notif.createdAt instanceof Date ? notif.createdAt.toISOString() : notif.createdAt,
        readAt: notif.readAt
          ? notif.readAt instanceof Date
            ? notif.readAt.toISOString()
            : notif.readAt
          : null,
        projectId: notif.projectId,
        Project: notif.Project
          ? {
              id: notif.Project.id,
              name: notif.Project.name,
              releaseDate: notif.Project.releaseDate
                ? notif.Project.releaseDate instanceof Date
                  ? notif.Project.releaseDate.toISOString()
                  : notif.Project.releaseDate
                : null,
              streamsJ180: notif.Project.streamsJ180,
              streamsJ365: notif.Project.streamsJ365,
            }
          : null,
      };
    });

    return createSuccessResponse(
      {
        notifications: sanitizedNotifications,
        unreadCount,
        total: sanitizedNotifications.length,
      },
      200,
      'Notifications récupérées'
    );
  } catch (error) {
    return handleApiError(error, 'GET /api/notifications');
  }
}

/**
 * POST /api/notifications
 * Crée une nouvelle notification (pour les admins)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return createUnauthorizedResponse('Non autorisé');
    }

    // Vérifier que l'utilisateur est admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (user?.role !== 'ADMIN') {
      return createUnauthorizedResponse(
        'Seuls les administrateurs peuvent créer des notifications'
      );
    }

    const body = await request.json();
    const { userId, type, title, message, metadata, projectId } = body;

    if (!userId || !type || !title) {
      return createSuccessResponse(
        { error: 'userId, type et title sont requis' },
        400,
        'Paramètres manquants'
      );
    }

    const notification = await prisma.notification.create({
      data: {
        userId,
        type,
        title,
        message: message || null,
        metadata: metadata ? JSON.stringify(metadata) : null,
        projectId: projectId || null,
        isRead: false,
        isArchived: false,
        deletedAt: null,
      },
      include: {
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

    return createSuccessResponse(notification, 201, 'Notification créée');
  } catch (error) {
    return handleApiError(error, 'POST /api/notifications');
  }
}
