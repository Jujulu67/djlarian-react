import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

import { handleApiError } from '@/lib/api/errorHandler';
import {
  createSuccessResponse,
  createUnauthorizedResponse,
  createBadRequestResponse,
} from '@/lib/api/responseHelpers';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/api/requireAuth';

interface SendContext {
  senderId: string;
  isAdmin: boolean;
  notificationType: string;
  title: string;
  message?: string | null;
  projectId?: string | null;
  enrichedMetadata: Record<string, unknown>;
}

type UserSummary = { name?: string | null; email?: string | null } | null | undefined;

function getDisplayName(user: UserSummary) {
  return user?.name || user?.email || 'Utilisateur';
}

function buildConversationMetadata(
  enrichedMetadata: Record<string, unknown>,
  isSent: boolean,
  recipientId: string,
  recipientUser: UserSummary
) {
  return {
    ...enrichedMetadata,
    isSent,
    recipientId,
    recipientName: getDisplayName(recipientUser),
    recipientEmail: recipientUser?.email,
  };
}

async function areAcceptedFriends(userIdA: string, userIdB: string) {
  const friendship = await prisma.friendship.findFirst({
    where: {
      status: 'ACCEPTED',
      OR: [
        {
          requesterId: userIdA,
          recipientId: userIdB,
        },
        {
          requesterId: userIdB,
          recipientId: userIdA,
        },
      ],
    },
  });
  return Boolean(friendship);
}

function readSenderIdFromMetadata(metadata: string | null): string | null | undefined {
  // Lève une exception si le JSON est invalide
  const parentMeta = metadata ? JSON.parse(metadata) : null;
  return parentMeta?.senderId;
}

// =====================================================
// CAS 1: Envoi à tous les utilisateurs (admin only)
// =====================================================
async function sendToAllUsers(ctx: SendContext): Promise<NextResponse> {
  const allUsers = await prisma.user.findMany({
    select: { id: true },
  });

  if (allUsers.length === 0) {
    return createSuccessResponse({ count: 0, notifications: [] }, 201, 'Aucun utilisateur trouvé');
  }

  // Générer un threadId unique pour cette diffusion
  const broadcastThreadId = uuidv4();

  const notificationsData = allUsers.map((u) => ({
    userId: u.id,
    type: ctx.notificationType,
    title: ctx.title,
    message: ctx.message || null,
    metadata: JSON.stringify(ctx.enrichedMetadata),
    projectId: ctx.projectId || null,
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
async function replyToNotification(
  ctx: SendContext,
  parentId: string,
  providedThreadId: string | undefined
): Promise<NextResponse> {
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
  if (parentNotification.userId !== ctx.senderId) {
    return createUnauthorizedResponse(
      "Vous ne pouvez répondre qu'aux messages que vous avez reçus"
    );
  }

  // Récupérer le senderId du message parent (c'est le destinataire de notre réponse)
  let targetUserId: string | null | undefined = null;
  try {
    targetUserId = readSenderIdFromMetadata(parentNotification.metadata);
  } catch {
    return createBadRequestResponse('Métadonnées du message parent invalides');
  }

  if (!targetUserId) {
    return createBadRequestResponse('Impossible de déterminer le destinataire de la réponse');
  }

  // Pour les utilisateurs non-admin, vérifier qu'ils sont amis
  if (!ctx.isAdmin && !(await areAcceptedFriends(ctx.senderId, targetUserId))) {
    return createUnauthorizedResponse('Vous devez être ami avec cet utilisateur pour lui répondre');
  }

  // Utiliser le threadId existant ou en créer un nouveau (cas de migration)
  const conversationThreadId = parentNotification.threadId || providedThreadId || uuidv4();

  // Récupérer les infos du destinataire
  const recipientUser = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { id: true, name: true, email: true },
  });

  // Métadonnées pour le destinataire (expéditeur original) et pour l'expéditeur de la réponse
  const recipientMetadata = buildConversationMetadata(
    ctx.enrichedMetadata,
    false,
    targetUserId,
    recipientUser
  );
  const senderMetadata = buildConversationMetadata(
    ctx.enrichedMetadata,
    true,
    targetUserId,
    recipientUser
  );

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
      type: ctx.notificationType,
      title: ctx.title,
      message: ctx.message || null,
      metadata: JSON.stringify(recipientMetadata),
      projectId: ctx.projectId || null,
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
      userId: ctx.senderId,
      type: ctx.notificationType,
      title: ctx.title,
      message: ctx.message || null,
      metadata: JSON.stringify(senderMetadata),
      projectId: ctx.projectId || null,
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
async function sendDirectMessage(ctx: SendContext, userId: string): Promise<NextResponse> {
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

  // Pour les utilisateurs non-admin, vérifier qu'ils sont amis
  if (!ctx.isAdmin && !(await areAcceptedFriends(ctx.senderId, userId))) {
    return createUnauthorizedResponse(
      'Vous devez être ami avec cet utilisateur pour lui envoyer un message'
    );
  }

  // Métadonnées pour le destinataire et pour l'expéditeur
  const recipientMetadata = buildConversationMetadata(
    ctx.enrichedMetadata,
    false,
    userId,
    recipientUser
  );
  const senderMetadata = buildConversationMetadata(
    ctx.enrichedMetadata,
    true,
    userId,
    recipientUser
  );

  // Créer la notification pour le destinataire
  const recipientNotification = await prisma.notification.create({
    data: {
      userId,
      type: ctx.notificationType,
      title: ctx.title,
      message: ctx.message || null,
      metadata: JSON.stringify(recipientMetadata),
      projectId: ctx.projectId || null,
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
  if (userId !== ctx.senderId) {
    await prisma.notification.create({
      data: {
        userId: ctx.senderId,
        type: ctx.notificationType,
        title: ctx.title,
        message: ctx.message || null,
        metadata: JSON.stringify(senderMetadata),
        projectId: ctx.projectId || null,
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
}

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
    const { session, error } = await requireAuth({
      requireUserId: true,
      onAnonymous: () => createUnauthorizedResponse('Non autorisé'),
    });
    if (error) return error;

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

    const ctx: SendContext = {
      senderId: session.user.id,
      isAdmin,
      notificationType,
      title,
      message,
      projectId,
      enrichedMetadata,
    };

    if (sendToAll) {
      return await sendToAllUsers(ctx);
    }

    if (parentId) {
      return await replyToNotification(ctx, parentId, providedThreadId);
    }

    if (!userId) {
      return createBadRequestResponse('userId est requis pour envoyer un message');
    }

    return await sendDirectMessage(ctx, userId);
  } catch (error) {
    return handleApiError(error, 'POST /api/notifications/send');
  }
}
