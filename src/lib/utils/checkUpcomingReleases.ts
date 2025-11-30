/**
 * Vérifie et crée les notifications pour les releases en approche
 * Règles :
 * - 7 jours avant : notification INFO
 * - 3 jours avant : notification WARNING
 * - 1 jour avant : notification WARNING (urgent)
 * - Le jour J : notification INFO (sortie aujourd'hui)
 */

import prisma from '@/lib/prisma';

export interface UpcomingReleaseCheckResult {
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
 * Notifications créées à J-7, J-5, J-3, J-1 et J+0
 */
function getReleaseNotificationInfo(daysUntil: number): {
  type: 'INFO' | 'WARNING';
  title: string;
  message: string;
} | null {
  if (daysUntil === 7) {
    return {
      type: 'INFO',
      title: 'Release dans 7 jours',
      message: 'Votre release approche dans une semaine',
    };
  }
  if (daysUntil === 5) {
    return {
      type: 'INFO',
      title: 'Release dans 5 jours',
      message: 'Votre release approche dans 5 jours',
    };
  }
  if (daysUntil === 3) {
    return {
      type: 'WARNING',
      title: 'Release dans 3 jours',
      message: 'Votre release approche dans 3 jours',
    };
  }
  if (daysUntil === 1) {
    return {
      type: 'WARNING',
      title: 'Release demain',
      message: 'Votre release sort demain !',
    };
  }
  if (daysUntil === 0) {
    return {
      type: 'INFO',
      title: "Release aujourd'hui",
      message: "Votre release sort aujourd'hui !",
    };
  }
  return null;
}

/**
 * Vérifie et crée les notifications pour les releases en approche d'un projet
 */
export async function checkProjectUpcomingRelease(
  projectId: string,
  userId: string
): Promise<UpcomingReleaseCheckResult> {
  const result: UpcomingReleaseCheckResult = {
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
        releaseDate: true,
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

    // Vérifier que le projet a une date de release
    if (!project.releaseDate) {
      result.skipped++;
      return result;
    }

    const releaseDate = new Date(project.releaseDate);
    const days = daysUntil(releaseDate);

    // Ne créer des notifications que pour les dates importantes (7, 5, 3, 1, 0 jours)
    if (days < 0 || days > 7) {
      result.skipped++;
      return result;
    }

    const notificationInfo = getReleaseNotificationInfo(days);
    if (!notificationInfo) {
      result.skipped++;
      return result;
    }

    // Vérifier si une notification existe déjà pour ce projet et ce jour (y compris archivées)
    const existingNotifications = await prisma.notification.findMany({
      where: {
        userId,
        projectId: project.id,
        type: notificationInfo.type,
        deletedAt: null, // Ne pas vérifier les notifications supprimées
      },
    });

    // Vérifier dans les métadonnées si une notification pour ce jour existe déjà
    const existingNotification = existingNotifications.find((notif) => {
      if (!notif.metadata) return false;
      try {
        const meta = JSON.parse(notif.metadata);
        return meta.type === 'RELEASE_UPCOMING' && meta.daysUntil === days;
      } catch {
        return false;
      }
    });

    if (existingNotification) {
      result.skipped++;
      return result;
    }

    // Créer la notification
    await prisma.notification.create({
      data: {
        userId: project.userId,
        type: notificationInfo.type,
        title: `${notificationInfo.title} - ${project.name}`,
        message: `${notificationInfo.message} : "${project.name}"`,
        metadata: JSON.stringify({
          type: 'RELEASE_UPCOMING',
          projectId: project.id,
          projectName: project.name,
          releaseDate: project.releaseDate.toISOString(),
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
 * Vérifie et crée les notifications pour toutes les releases en approche d'un utilisateur
 * Version optimisée : charge uniquement les releaseDate nécessaires
 */
export async function checkAllUserUpcomingReleases(
  userId: string
): Promise<UpcomingReleaseCheckResult> {
  const result: UpcomingReleaseCheckResult = {
    created: 0,
    skipped: 0,
    errors: [],
  };

  try {
    // Récupérer uniquement les projets avec releaseDate dans les 7 prochains jours
    // Version optimisée : on ne charge que les champs nécessaires
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const in7Days = new Date(now);
    in7Days.setDate(in7Days.getDate() + 7);
    in7Days.setHours(23, 59, 59, 999);

    const projects = await prisma.project.findMany({
      where: {
        userId,
        releaseDate: {
          gte: now,
          lte: in7Days,
        },
      },
      select: {
        id: true,
        userId: true,
        name: true,
        releaseDate: true,
      },
    });

    // Vérifier chaque projet
    for (const project of projects) {
      const projectResult = await checkProjectUpcomingRelease(project.id, userId);
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
