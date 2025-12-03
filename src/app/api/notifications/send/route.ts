import { NextRequest } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

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
 * Envoie une notification à un utilisateur spécifique ou à tous les utilisateurs (admin only pour sendToAll)
 * Permet à tous les utilisateurs d'envoyer des messages individuels et de répondre
 *
 * Système de thread simplifié:
 * - Chaque conversation a un threadId unique partagé entre l'expéditeur et le destinataire
 * - Le premier message génère un threadId, les réponses héritent de celui du parent
 * - Chaque utilisateur a sa propre copie des messages avec le même threadId
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return createUnauthorizedResponse('Non autorisé');
    }

    // Récupérer les infos de l'utilisateur
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true, name: true, email: true },
    });

    if (!currentUser) {
      return createUnauthorizedResponse('Utilisateur non trouvé');
    }

    const isAdmin = currentUser.role === 'ADMIN';

    const body = await request.json();
    const {
      userId,
      type,
      title,
      message,
      metadata,
      projectId,
      sendToAll,
      parentId,
      threadId: providedThreadId,
    } = body;

    // Bloquer sendToAll pour les non-admins
    if (sendToAll && !isAdmin) {
      return createUnauthorizedResponse(
        'Seuls les administrateurs peuvent envoyer des notifications à tous les utilisateurs'
      );
    }

    if (!title) {
      return createBadRequestResponse('title est requis');
    }

    // Déterminer le type de notification
    let notificationType = type;
    if (!notificationType) {
      notificationType = isAdmin ? 'ADMIN_MESSAGE' : 'USER_MESSAGE';
    }

    // Préparer les métadonnées avec l'expéditeur
    const senderInfo = {
      senderId: session.user.id,
      senderName: currentUser.name || currentUser.email || 'Utilisateur',
      senderEmail: currentUser.email,
    };

    const enrichedMetadata = metadata
      ? { ...(typeof metadata === 'string' ? JSON.parse(metadata) : metadata), ...senderInfo }
      : senderInfo;

    // =====================================================
    // CAS 1: Envoi à tous les utilisateurs (admin only)
    // =====================================================
    if (sendToAll) {
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

      // Générer un threadId unique pour cette diffusion
      const broadcastThreadId = uuidv4();

      const notificationsData = allUsers.map((u) => ({
        userId: u.id,
        type: notificationType,
        title,
        message: message || null,
        metadata: JSON.stringify(enrichedMetadata),
        projectId: projectId || null,
        threadId: broadcastThreadId,
        parentId: null,
        isRead: false,
        isArchived: false,
        deletedAt: null,
      }));

      await prisma.notification.createMany({
        data: notificationsData,
      });

      return createSuccessResponse(
        { count: notificationsData.length, threadId: broadcastThreadId },
        201,
        `${notificationsData.length} notifications créées`
      );
    }

    // =====================================================
    // CAS 2: Réponse à un message existant (parentId fourni)
    // =====================================================
    if (parentId) {
      // Récupérer le message parent
      const parentNotification = await prisma.notification.findUnique({
        where: { id: parentId },
        select: {
          id: true,
          userId: true,
          threadId: true,
          metadata: true,
          title: true,
        },
      });

      if (!parentNotification) {
        return createBadRequestResponse('Message parent non trouvé');
      }

      // Vérifier que l'utilisateur actuel peut répondre (il doit être le destinataire)
      if (parentNotification.userId !== session.user.id) {
        return createUnauthorizedResponse(
          "Vous ne pouvez répondre qu'aux messages que vous avez reçus"
        );
      }

      // Récupérer le senderId du message parent (c'est le destinataire de notre réponse)
      let targetUserId: string | null = null;
      try {
        const parentMeta = parentNotification.metadata
          ? JSON.parse(parentNotification.metadata)
          : null;
        targetUserId = parentMeta?.senderId;
      } catch {
        return createBadRequestResponse('Métadonnées du message parent invalides');
      }

      if (!targetUserId) {
        return createBadRequestResponse('Impossible de déterminer le destinataire de la réponse');
      }

      // Utiliser le threadId existant ou en créer un nouveau (cas de migration)
      const conversationThreadId = parentNotification.threadId || providedThreadId || uuidv4();

      // Récupérer les infos du destinataire
      const recipientUser = await prisma.user.findUnique({
        where: { id: targetUserId },
        select: { id: true, name: true, email: true },
      });

      // Métadonnées pour le destinataire (expéditeur original)
      const recipientMetadata = {
        ...enrichedMetadata,
        isSent: false,
        recipientId: targetUserId,
        recipientName: recipientUser?.name || recipientUser?.email || 'Utilisateur',
        recipientEmail: recipientUser?.email,
      };

      // Métadonnées pour l'expéditeur de la réponse (utilisateur actuel)
      const senderMetadata = {
        ...enrichedMetadata,
        isSent: true,
        recipientId: targetUserId,
        recipientName: recipientUser?.name || recipientUser?.email || 'Utilisateur',
        recipientEmail: recipientUser?.email,
      };

      // Trouver le message parent de l'expéditeur original (pour lier la réponse à son thread)
      const originalSenderParentNotification = await prisma.notification.findFirst({
        where: {
          userId: targetUserId,
          threadId: conversationThreadId,
          parentId: null, // Message principal, pas une réponse
        },
        select: { id: true },
      });

      // Créer la réponse pour le destinataire (expéditeur original)
      const recipientReply = await prisma.notification.create({
        data: {
          userId: targetUserId,
          type: notificationType,
          title,
          message: message || null,
          metadata: JSON.stringify(recipientMetadata),
          projectId: projectId || null,
          threadId: conversationThreadId,
          parentId: originalSenderParentNotification?.id || null,
          isRead: false,
          isArchived: false,
          deletedAt: null,
        },
      });

      // Créer la copie "envoyée" pour l'expéditeur de la réponse (utilisateur actuel)
      await prisma.notification.create({
        data: {
          userId: session.user.id,
          type: notificationType,
          title,
          message: message || null,
          metadata: JSON.stringify(senderMetadata),
          projectId: projectId || null,
          threadId: conversationThreadId,
          parentId: parentId, // Lié au message auquel on répond
          isRead: true, // Marqué comme lu pour l'expéditeur
          isArchived: false,
          deletedAt: null,
        },
      });

      return createSuccessResponse(
        { ...recipientReply, threadId: conversationThreadId },
        201,
        'Réponse envoyée'
      );
    }

    // =====================================================
    // CAS 3: Nouveau message (pas de parentId)
    // =====================================================
    if (!userId) {
      return createBadRequestResponse('userId est requis pour envoyer un message');
    }

    // Générer un nouveau threadId pour cette conversation
    const newThreadId = uuidv4();

    // Récupérer les infos du destinataire
    const recipientUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true },
    });

    if (!recipientUser) {
      return createBadRequestResponse('Destinataire non trouvé');
    }

    // Métadonnées pour le destinataire
    const recipientMetadata = {
      ...enrichedMetadata,
      isSent: false,
      recipientId: userId,
      recipientName: recipientUser.name || recipientUser.email || 'Utilisateur',
      recipientEmail: recipientUser.email,
    };

    // Métadonnées pour l'expéditeur
    const senderMetadata = {
      ...enrichedMetadata,
      isSent: true,
      recipientId: userId,
      recipientName: recipientUser.name || recipientUser.email || 'Utilisateur',
      recipientEmail: recipientUser.email,
    };

    // Créer la notification pour le destinataire
    const recipientNotification = await prisma.notification.create({
      data: {
        userId,
        type: notificationType,
        title,
        message: message || null,
        metadata: JSON.stringify(recipientMetadata),
        projectId: projectId || null,
        threadId: newThreadId,
        parentId: null,
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

    // Créer la copie "envoyée" pour l'expéditeur (sauf si on s'envoie un message à soi-même)
    if (userId !== session.user.id) {
      await prisma.notification.create({
        data: {
          userId: session.user.id,
          type: notificationType,
          title,
          message: message || null,
          metadata: JSON.stringify(senderMetadata),
          projectId: projectId || null,
          threadId: newThreadId,
          parentId: null,
          isRead: true, // Marqué comme lu pour l'expéditeur
          isArchived: false,
          deletedAt: null,
        },
      });
    }

    return createSuccessResponse(
      { ...recipientNotification, threadId: newThreadId },
      201,
      'Notification créée'
    );
  } catch (error) {
    return handleApiError(error, 'POST /api/notifications/send');
  }
}
