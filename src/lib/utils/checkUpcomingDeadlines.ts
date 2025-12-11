/**
 * Vérifie et crée les notifications pour les deadlines en approche
 * Règles :
 * - 14 jours avant : notification INFO
 * - 7 jours avant : notification INFO
 * - 5 jours avant : notification INFO
 * - 3 jours avant : notification WARNING
 * - 1 jour avant : notification WARNING (urgent)
 */

import prisma from '@/lib/prisma';

export interface UpcomingDeadlineCheckResult {
  created: number;
  skipped: number;
  errors: Array<{ projectId: string; error: string }>;
}

/**
 * Calcule le nombre de jours jusqu'à une date
 */
function daysUntil(date: Date): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  const diff = target.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

/**
 * Détermine le type de notification et le message selon les jours restants
 * Notifications créées à J-14, J-7, J-5, J-3, J-1
 */
function getDeadlineNotificationInfo(daysUntil: number): {
  type: 'INFO' | 'WARNING';
  title: string;
  message: string;
} | null {
  if (daysUntil === 14) {
    return {
      type: 'INFO',
      title: 'Deadline dans 2 semaines',
      message: 'Votre deadline approche dans 2 semaines',
    };
  }
  if (daysUntil === 7) {
    return {
      type: 'INFO',
      title: 'Deadline dans 1 semaine',
      message: 'Votre deadline approche dans une semaine',
    };
  }
  if (daysUntil === 5) {
    return {
      type: 'INFO',
      title: 'Deadline dans 5 jours',
      message: 'Votre deadline approche dans 5 jours',
    };
  }
  if (daysUntil === 3) {
    return {
      type: 'WARNING',
      title: 'Deadline dans 3 jours',
      message: 'Votre deadline approche dans 3 jours',
    };
  }
  if (daysUntil === 1) {
    return {
      type: 'WARNING',
      title: 'Deadline demain',
      message: 'Votre deadline est demain !',
    };
  }
  return null;
}

/**
 * Vérifie et crée les notifications pour les deadlines en approche d'un projet
 */
export async function checkProjectUpcomingDeadline(
  projectId: string,
  userId: string
): Promise<UpcomingDeadlineCheckResult> {
  const result: UpcomingDeadlineCheckResult = {
    created: 0,
    skipped: 0,
    errors: [],
  };

  try {
    // Récupérer le projet
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        userId: true,
        name: true,
        deadline: true,
      },
    });

    if (!project) {
      result.errors.push({
        projectId,
        error: 'Projet non trouvé',
      });
      return result;
    }

    // Vérifier que le projet appartient à l'utilisateur
    if (project.userId !== userId) {
      result.errors.push({
        projectId,
        error: 'Projet non autorisé',
      });
      return result;
    }

    // Vérifier que le projet a une date de deadline
    if (!project.deadline) {
      result.skipped++;
      return result;
    }

    const deadlineDate = new Date(project.deadline);
    const days = daysUntil(deadlineDate);

    // Ne créer des notifications que pour les dates importantes (14, 7, 5, 3, 1 jours)
    if (days < 0 || days > 14) {
      result.skipped++;
      return result;
    }

    const notificationInfo = getDeadlineNotificationInfo(days);
    if (!notificationInfo) {
      result.skipped++;
      return result;
    }

    // Supprimer toutes les notifications DEADLINE_UPCOMING précédentes pour ce projet
    // On récupère toutes les notifications de l'utilisateur qui pourraient être des deadlines
    // (y compris celles avec projectId null pour les tests)
    const existingNotifications = await prisma.notification.findMany({
      where: {
        userId,
        deletedAt: null, // Ne pas vérifier les notifications déjà supprimées
        OR: [
          { projectId: project.id }, // Notifications pour ce projet spécifique
          { projectId: null }, // Notifications de test (projectId null)
        ],
      },
    });

    // Filtrer pour trouver les notifications DEADLINE_UPCOMING pour ce projet
    // (soit avec le même projectId, soit avec projectId null ET le même projectId dans les métadonnées)
    const deadlineNotifications = existingNotifications.filter((notif) => {
      if (!notif.metadata) return false;
      try {
        const meta = JSON.parse(notif.metadata);
        if (meta.type !== 'DEADLINE_UPCOMING') return false;

        // Si c'est une notification de test (projectId null), vérifier les métadonnées
        if (notif.projectId === null) {
          // Pour les tests, on supprime toutes les DEADLINE_UPCOMING de test
          return meta.isTest === true;
        }

        // Pour les vraies notifications, vérifier que c'est le même projet
        return meta.projectId === project.id;
      } catch {
        return false;
      }
    });

    // Soft delete toutes les notifications DEADLINE_UPCOMING précédentes
    if (deadlineNotifications.length > 0) {
      await prisma.notification.updateMany({
        where: {
          id: {
            in: deadlineNotifications.map((n) => n.id),
          },
        },
        data: {
          deletedAt: new Date(),
        },
      });
    }

    // Créer la notification
    await prisma.notification.create({
      data: {
        userId: project.userId,
        type: notificationInfo.type,
        title: `${notificationInfo.title} - ${project.name}`,
        message: `${notificationInfo.message} : "${project.name}"`,
        metadata: JSON.stringify({
          type: 'DEADLINE_UPCOMING',
          projectId: project.id,
          projectName: project.name,
          deadline: project.deadline.toISOString(),
          daysUntil: days,
        }),
        projectId: project.id,
        isRead: false,
        isArchived: false,
        deletedAt: null,
      },
    });

    result.created++;
  } catch (error) {
    result.errors.push({
      projectId,
      error: error instanceof Error ? error.message : 'Erreur lors de la vérification',
    });
  }

  return result;
}

/**
 * Vérifie et crée les notifications pour toutes les deadlines en approche d'un utilisateur
 * Version optimisée : charge uniquement les deadline nécessaires
 */
export async function checkAllUserUpcomingDeadlines(
  userId: string
): Promise<UpcomingDeadlineCheckResult> {
  const result: UpcomingDeadlineCheckResult = {
    created: 0,
    skipped: 0,
    errors: [],
  };

  try {
    // Récupérer uniquement les projets avec deadline dans les 14 prochains jours
    // Version optimisée : on ne charge que les champs nécessaires
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const in14Days = new Date(now);
    in14Days.setDate(in14Days.getDate() + 14);
    in14Days.setHours(23, 59, 59, 999);

    const projects = await prisma.project.findMany({
      where: {
        userId,
        deadline: {
          gte: now,
          lte: in14Days,
        },
      },
      select: {
        id: true,
        userId: true,
        name: true,
        deadline: true,
      },
    });

    // Vérifier chaque projet
    for (const project of projects) {
      const projectResult = await checkProjectUpcomingDeadline(project.id, userId);
      result.created += projectResult.created;
      result.skipped += projectResult.skipped;
      result.errors.push(...projectResult.errors);
    }
  } catch (error) {
    result.errors.push({
      projectId: 'all',
      error: error instanceof Error ? error.message : 'Erreur lors de la vérification globale',
    });
  }

  return result;
}
