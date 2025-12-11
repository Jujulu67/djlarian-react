import { NextRequest } from 'next/server';

import { auth } from '@/auth';
import { handleApiError } from '@/lib/api/errorHandler';
import { createSuccessResponse, createUnauthorizedResponse } from '@/lib/api/responseHelpers';
import prisma from '@/lib/prisma';

/**
 * POST /api/notifications/test
 * Crée une notification de test pour l'admin (pour tester les différents types de notifications)
 * Body: { notificationType: 'RELEASE_J7' | 'RELEASE_J5' | 'RELEASE_J3' | 'RELEASE_J1' | 'RELEASE_J0' | 'DEADLINE_J14' | 'DEADLINE_J7' | 'DEADLINE_J5' | 'DEADLINE_J3' | 'DEADLINE_J1' | 'MILESTONE_J180' | 'MILESTONE_J365' }
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
        'Seuls les administrateurs peuvent créer des notifications de test'
      );
    }

    const body = await request.json();
    const { notificationType } = body;

    if (!notificationType) {
      return createSuccessResponse(
        { error: 'notificationType est requis' },
        400,
        'Paramètre manquant'
      );
    }

    // Calculer la date de référence pour les notifications
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    let notificationData: {
      type: string;
      title: string;
      message: string;
      metadata: Record<string, any>;
      projectId?: string | null;
    };

    // Créer une notification de test selon le type
    switch (notificationType) {
      // Notifications de release
      case 'RELEASE_J7': {
        const releaseDate = new Date(now);
        releaseDate.setDate(releaseDate.getDate() + 7);
        notificationData = {
          type: 'INFO',
          title: 'Release dans 7 jours - [TEST]',
          message: 'Votre release approche dans une semaine : "Projet Test"',
          metadata: {
            type: 'RELEASE_UPCOMING',
            projectId: 'test-project',
            projectName: 'Projet Test',
            releaseDate: releaseDate.toISOString(),
            daysUntil: 7,
            isTest: true,
          },
          projectId: null,
        };
        break;
      }
      case 'RELEASE_J5': {
        const releaseDate = new Date(now);
        releaseDate.setDate(releaseDate.getDate() + 5);
        notificationData = {
          type: 'INFO',
          title: 'Release dans 5 jours - [TEST]',
          message: 'Votre release approche dans 5 jours : "Projet Test"',
          metadata: {
            type: 'RELEASE_UPCOMING',
            projectId: 'test-project',
            projectName: 'Projet Test',
            releaseDate: releaseDate.toISOString(),
            daysUntil: 5,
            isTest: true,
          },
          projectId: null,
        };
        break;
      }
      case 'RELEASE_J3': {
        const releaseDate = new Date(now);
        releaseDate.setDate(releaseDate.getDate() + 3);
        notificationData = {
          type: 'WARNING',
          title: 'Release dans 3 jours - [TEST]',
          message: 'Votre release approche dans 3 jours : "Projet Test"',
          metadata: {
            type: 'RELEASE_UPCOMING',
            projectId: 'test-project',
            projectName: 'Projet Test',
            releaseDate: releaseDate.toISOString(),
            daysUntil: 3,
            isTest: true,
          },
          projectId: null,
        };
        break;
      }
      case 'RELEASE_J1': {
        const releaseDate = new Date(now);
        releaseDate.setDate(releaseDate.getDate() + 1);
        notificationData = {
          type: 'WARNING',
          title: 'Release demain - [TEST]',
          message: 'Votre release sort demain ! : "Projet Test"',
          metadata: {
            type: 'RELEASE_UPCOMING',
            projectId: 'test-project',
            projectName: 'Projet Test',
            releaseDate: releaseDate.toISOString(),
            daysUntil: 1,
            isTest: true,
          },
          projectId: null,
        };
        break;
      }
      case 'RELEASE_J0': {
        const releaseDate = new Date(now);
        notificationData = {
          type: 'INFO',
          title: "Release aujourd'hui - [TEST]",
          message: 'Votre release sort aujourd\'hui ! : "Projet Test"',
          metadata: {
            type: 'RELEASE_UPCOMING',
            projectId: 'test-project',
            projectName: 'Projet Test',
            releaseDate: releaseDate.toISOString(),
            daysUntil: 0,
            isTest: true,
          },
          projectId: null,
        };
        break;
      }
      // Notifications de deadline
      case 'DEADLINE_J14': {
        const deadlineDate = new Date(now);
        deadlineDate.setDate(deadlineDate.getDate() + 14);
        notificationData = {
          type: 'INFO',
          title: 'Deadline dans 2 semaines - [TEST]',
          message: 'Votre deadline approche dans 2 semaines : "Projet Test"',
          metadata: {
            type: 'DEADLINE_UPCOMING',
            projectId: 'test-project',
            projectName: 'Projet Test',
            deadline: deadlineDate.toISOString(),
            daysUntil: 14,
            isTest: true,
          },
          projectId: null,
        };
        break;
      }
      case 'DEADLINE_J7': {
        const deadlineDate = new Date(now);
        deadlineDate.setDate(deadlineDate.getDate() + 7);
        notificationData = {
          type: 'INFO',
          title: 'Deadline dans 1 semaine - [TEST]',
          message: 'Votre deadline approche dans une semaine : "Projet Test"',
          metadata: {
            type: 'DEADLINE_UPCOMING',
            projectId: 'test-project',
            projectName: 'Projet Test',
            deadline: deadlineDate.toISOString(),
            daysUntil: 7,
            isTest: true,
          },
          projectId: null,
        };
        break;
      }
      case 'DEADLINE_J5': {
        const deadlineDate = new Date(now);
        deadlineDate.setDate(deadlineDate.getDate() + 5);
        notificationData = {
          type: 'INFO',
          title: 'Deadline dans 5 jours - [TEST]',
          message: 'Votre deadline approche dans 5 jours : "Projet Test"',
          metadata: {
            type: 'DEADLINE_UPCOMING',
            projectId: 'test-project',
            projectName: 'Projet Test',
            deadline: deadlineDate.toISOString(),
            daysUntil: 5,
            isTest: true,
          },
          projectId: null,
        };
        break;
      }
      case 'DEADLINE_J3': {
        const deadlineDate = new Date(now);
        deadlineDate.setDate(deadlineDate.getDate() + 3);
        notificationData = {
          type: 'WARNING',
          title: 'Deadline dans 3 jours - [TEST]',
          message: 'Votre deadline approche dans 3 jours : "Projet Test"',
          metadata: {
            type: 'DEADLINE_UPCOMING',
            projectId: 'test-project',
            projectName: 'Projet Test',
            deadline: deadlineDate.toISOString(),
            daysUntil: 3,
            isTest: true,
          },
          projectId: null,
        };
        break;
      }
      case 'DEADLINE_J1': {
        const deadlineDate = new Date(now);
        deadlineDate.setDate(deadlineDate.getDate() + 1);
        notificationData = {
          type: 'WARNING',
          title: 'Deadline demain - [TEST]',
          message: 'Votre deadline est demain ! : "Projet Test"',
          metadata: {
            type: 'DEADLINE_UPCOMING',
            projectId: 'test-project',
            projectName: 'Projet Test',
            deadline: deadlineDate.toISOString(),
            daysUntil: 1,
            isTest: true,
          },
          projectId: null,
        };
        break;
      }
      // Notifications de jalon
      case 'MILESTONE_J180': {
        notificationData = {
          type: 'MILESTONE',
          title: 'Jalon 6 mois atteint - Streams non renseignés - [TEST]',
          message:
            'Le projet "Projet Test" a atteint le jalon 6 mois mais les streams ne sont pas encore renseignés',
          metadata: {
            milestoneType: 'J180',
            projectId: 'test-project',
            projectName: 'Projet Test',
            streams: null,
            isTest: true,
          },
          projectId: null,
        };
        break;
      }
      case 'MILESTONE_J365': {
        notificationData = {
          type: 'MILESTONE',
          title: 'Jalon 1 an atteint - Streams non renseignés - [TEST]',
          message:
            'Le projet "Projet Test" a atteint le jalon 1 an mais les streams ne sont pas encore renseignés',
          metadata: {
            milestoneType: 'J365',
            projectId: 'test-project',
            projectName: 'Projet Test',
            streams: null,
            isTest: true,
          },
          projectId: null,
        };
        break;
      }
      default:
        return createSuccessResponse(
          { error: 'Type de notification de test invalide' },
          400,
          'Type invalide'
        );
    }

    // Déterminer le type de notification à supprimer selon le type de test
    let notificationTypeToDelete: 'RELEASE_UPCOMING' | 'DEADLINE_UPCOMING' | null = null;
    if (notificationType.startsWith('RELEASE_')) {
      notificationTypeToDelete = 'RELEASE_UPCOMING';
    } else if (notificationType.startsWith('DEADLINE_')) {
      notificationTypeToDelete = 'DEADLINE_UPCOMING';
    }

    // Supprimer toutes les notifications de test précédentes du même type
    if (notificationTypeToDelete) {
      const existingTestNotifications = await prisma.notification.findMany({
        where: {
          userId: session.user.id,
          projectId: null, // Seulement les notifications de test
          deletedAt: null,
        },
      });

      // Filtrer pour trouver les notifications de test du même type
      const testNotificationsToDelete = existingTestNotifications.filter((notif) => {
        if (!notif.metadata) return false;
        try {
          const meta = JSON.parse(notif.metadata);
          return meta.type === notificationTypeToDelete && meta.isTest === true;
        } catch {
          return false;
        }
      });

      // Soft delete toutes les notifications de test précédentes du même type
      if (testNotificationsToDelete.length > 0) {
        await prisma.notification.updateMany({
          where: {
            id: {
              in: testNotificationsToDelete.map((n) => n.id),
            },
          },
          data: {
            deletedAt: new Date(),
          },
        });
      }
    }

    // Créer la notification pour l'admin (lui-même)
    const notification = await prisma.notification.create({
      data: {
        userId: session.user.id,
        type: notificationData.type,
        title: notificationData.title,
        message: notificationData.message,
        metadata: JSON.stringify(notificationData.metadata),
        projectId: notificationData.projectId,
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

    return createSuccessResponse(notification, 201, 'Notification de test créée');
  } catch (error) {
    return handleApiError(error, 'POST /api/notifications/test');
  }
}
