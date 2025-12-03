import { NextRequest } from 'next/server';

import { auth } from '@/auth';
import { handleApiError } from '@/lib/api/errorHandler';
import { createSuccessResponse, createUnauthorizedResponse } from '@/lib/api/responseHelpers';
import prisma from '@/lib/prisma';

export type NotificationType =
  | 'MILESTONE'
  | 'ADMIN_MESSAGE'
  | 'USER_MESSAGE'
  | 'RELEASE_UPCOMING'
  | 'INFO'
  | 'WARNING'
  | 'FRIEND_REQUEST'
  | 'FRIEND_ACCEPTED'
  | 'FRIEND_REJECTED';

/**
 * GET /api/notifications
 * Récupère les notifications de l'utilisateur avec système de threads simplifié
 * Query params optionnels:
 * - unreadOnly: ne récupérer que les non lues (default: false)
 * - type: filtrer par type de notification
 * - limit: nombre maximum de notifications (default: 50)
 * - includeArchived: inclure les notifications archivées
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
    const includeArchived = searchParams.get('includeArchived') === 'true';

    // Construire les filtres pour les messages principaux (pas des réponses)
    const baseWhere: {
      userId: string;
      isArchived?: boolean;
      deletedAt?: null;
      type?: NotificationType;
      isRead?: boolean;
      parentId: null;
    } = {
      userId: session.user.id,
      parentId: null, // Seulement les messages principaux
    };

    if (!includeArchived) {
      baseWhere.isArchived = false;
      baseWhere.deletedAt = null;
    }

    if (unreadOnly) {
      baseWhere.isRead = false;
    }

    if (type) {
      baseWhere.type = type;
    }

    // Récupérer les notifications principales de l'utilisateur
    const notifications = await prisma.notification.findMany({
      where: baseWhere,
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
        parentId: true,
        threadId: true,
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

    // Collecter tous les threadIds pour récupérer les réponses
    const threadIds = notifications
      .map((n) => n.threadId)
      .filter((id): id is string => id !== null);

    // Récupérer toutes les réponses (parentId non null) pour ces threads
    // appartenant à l'utilisateur actuel
    let replies: Array<{
      id: string;
      userId: string;
      type: string;
      title: string;
      message: string | null;
      metadata: string | null;
      isRead: boolean;
      isArchived: boolean;
      deletedAt: Date | null;
      createdAt: Date;
      readAt: Date | null;
      projectId: string | null;
      parentId: string | null;
      threadId: string | null;
    }> = [];

    if (threadIds.length > 0) {
      replies = await prisma.notification.findMany({
        where: {
          userId: session.user.id,
          threadId: { in: threadIds },
          parentId: { not: null }, // Seulement les réponses
          isArchived: false,
          deletedAt: null,
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
          parentId: true,
          threadId: true,
        },
        orderBy: {
          createdAt: 'asc',
        },
      });
    }

    // Grouper les réponses par threadId
    const repliesByThreadId = new Map<string, typeof replies>();
    replies.forEach((reply) => {
      if (reply.threadId) {
        if (!repliesByThreadId.has(reply.threadId)) {
          repliesByThreadId.set(reply.threadId, []);
        }
        repliesByThreadId.get(reply.threadId)!.push(reply);
      }
    });

    // Compter les notifications non lues (toutes, pas seulement les principales)
    const unreadCount = await prisma.notification.count({
      where: {
        userId: session.user.id,
        isRead: false,
        isArchived: false,
        deletedAt: null,
      },
    });

    // Formatter et sérialiser les notifications avec leurs réponses
    const sanitizedNotifications = notifications.map((notif) => {
      // Récupérer les réponses par threadId
      const notificationReplies = notif.threadId
        ? (repliesByThreadId.get(notif.threadId) || []).map((reply) => ({
            id: reply.id,
            userId: reply.userId,
            type: reply.type,
            title: reply.title,
            message: reply.message,
            metadata: reply.metadata,
            isRead: Boolean(reply.isRead),
            isArchived: Boolean(reply.isArchived ?? false),
            deletedAt: reply.deletedAt
              ? reply.deletedAt instanceof Date
                ? reply.deletedAt.toISOString()
                : reply.deletedAt
              : null,
            createdAt:
              reply.createdAt instanceof Date ? reply.createdAt.toISOString() : reply.createdAt,
            readAt: reply.readAt
              ? reply.readAt instanceof Date
                ? reply.readAt.toISOString()
                : reply.readAt
              : null,
            projectId: reply.projectId,
            parentId: reply.parentId,
            threadId: reply.threadId,
          }))
        : [];

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
        parentId: notif.parentId,
        threadId: notif.threadId,
        replies: notificationReplies,
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
