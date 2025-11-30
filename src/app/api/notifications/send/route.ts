import { NextRequest } from 'next/server';

import { auth } from '@/auth';
import { handleApiError } from '@/lib/api/errorHandler';
import {
  createSuccessResponse,
  createUnauthorizedResponse,
  createBadRequestResponse,
} from '@/lib/api/responseHelpers';
import prisma from '@/lib/prisma';

/**
 * POST /api/notifications/send
 * Envoie une notification à un utilisateur spécifique ou à tous les utilisateurs (admin only)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return createUnauthorizedResponse('Non autorisé');
    }

    // Vérifier que l'utilisateur est admin et récupérer ses infos
    const adminUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true, name: true, email: true },
    });

    if (adminUser?.role !== 'ADMIN') {
      return createUnauthorizedResponse(
        'Seuls les administrateurs peuvent envoyer des notifications'
      );
    }

    const body = await request.json();
    const { userId, type, title, message, metadata, projectId, sendToAll } = body;

    // Préparer les métadonnées avec l'expéditeur
    const senderInfo = {
      senderId: session.user.id,
      senderName: adminUser.name || adminUser.email || 'Administrateur',
      senderEmail: adminUser.email,
    };

    const enrichedMetadata = metadata
      ? { ...(typeof metadata === 'string' ? JSON.parse(metadata) : metadata), ...senderInfo }
      : senderInfo;

    if (!type || !title) {
      return createBadRequestResponse('type et title sont requis');
    }

    if (!sendToAll && !userId) {
      return createBadRequestResponse('userId est requis si sendToAll est false');
    }

    const notificationType = type || 'ADMIN_MESSAGE';

    if (sendToAll) {
      // Récupérer tous les utilisateurs
      const allUsers = await prisma.user.findMany({
        select: { id: true },
      });

      if (allUsers.length === 0) {
        return createSuccessResponse(
          { count: 0, notifications: [] },
          201,
          'Aucun utilisateur trouvé'
        );
      }

      // Préparer les données pour l'insertion en batch
      const notificationsData = allUsers.map((u) => ({
        userId: u.id,
        type: notificationType,
        title,
        message: message || null,
        metadata: JSON.stringify(enrichedMetadata),
        projectId: projectId || null,
        isRead: false,
        isArchived: false,
        deletedAt: null,
      }));

      // Utiliser createMany pour une insertion optimisée en batch
      // Note: createMany ne retourne pas les objets créés
      // SQLite ne supporte pas skipDuplicates, mais createMany fonctionne normalement
      await prisma.notification.createMany({
        data: notificationsData,
      });

      // Récupérer les notifications créées pour la réponse (optionnel, peut être omis pour plus de performance)
      // On récupère seulement le count pour éviter de charger toutes les notifications
      const createdCount = notificationsData.length;

      return createSuccessResponse(
        { count: createdCount },
        201,
        `${createdCount} notifications créées`
      );
    } else {
      // Créer une notification pour un utilisateur spécifique
      const notification = await prisma.notification.create({
        data: {
          userId,
          type: notificationType,
          title,
          message: message || null,
          metadata: JSON.stringify(enrichedMetadata),
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
    }
  } catch (error) {
    return handleApiError(error, 'POST /api/notifications/send');
  }
}
