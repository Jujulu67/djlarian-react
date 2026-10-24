/**
 * Logique commune aux notifications « date en approche » d'un projet
 * (deadline, release). Utilisée par checkUpcomingDeadlines.ts et checkUpcomingReleases.ts,
 * qui ne fournissent que le champ de date, la fenêtre, le type de notification et les textes.
 */

import prisma from '@/lib/prisma';

export interface UpcomingDateCheckResult {
  created: number;
  skipped: number;
  errors: Array<{ projectId: string; error: string }>;
}

export interface UpcomingDateNotificationInfo {
  type: 'INFO' | 'WARNING';
  title: string;
  message: string;
}

export interface UpcomingDateConfig {
  /** Champ de date du modèle Project */
  dateField: 'deadline' | 'releaseDate';
  /** Fenêtre maximale (en jours) dans laquelle on notifie */
  maxDays: number;
  /** Valeur de `metadata.type` des notifications créées */
  notificationType: 'DEADLINE_UPCOMING' | 'RELEASE_UPCOMING';
  /** Palier (type/titre/message) selon les jours restants, null si aucun */
  getNotificationInfo: (daysUntil: number) => UpcomingDateNotificationInfo | null;
}

type ProjectWithDate = {
  id: string;
  userId: string;
  name: string;
} & Partial<Record<UpcomingDateConfig['dateField'], Date | null>>;

/**
 * Calcule le nombre de jours jusqu'à une date
 */
export function daysUntil(date: Date): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  const diff = target.getTime() - now.getTime();
  // round (pas ceil) : un jour de changement d'heure dure 23h ou 25h
  return Math.round(diff / (1000 * 60 * 60 * 24));
}

function projectSelect(dateField: UpcomingDateConfig['dateField']) {
  return {
    id: true,
    userId: true,
    name: true,
    [dateField]: true,
  } as { id: true; userId: true; name: true; deadline?: true; releaseDate?: true };
}

/**
 * Vérifie et crée la notification « date en approche » d'un projet
 */
export async function checkProjectUpcomingDate(
  projectId: string,
  userId: string,
  config: UpcomingDateConfig
): Promise<UpcomingDateCheckResult> {
  const result: UpcomingDateCheckResult = {
    created: 0,
    skipped: 0,
    errors: [],
  };

  try {
    // Récupérer le projet
    const project = (await prisma.project.findUnique({
      where: { id: projectId },
      select: projectSelect(config.dateField),
    })) as ProjectWithDate | null;

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

    // Vérifier que le projet a une date
    const projectDate = project[config.dateField];
    if (!projectDate) {
      result.skipped++;
      return result;
    }

    const days = daysUntil(new Date(projectDate));

    // Ne créer des notifications que dans la fenêtre configurée
    if (days < 0 || days > config.maxDays) {
      result.skipped++;
      return result;
    }

    const notificationInfo = config.getNotificationInfo(days);
    if (!notificationInfo) {
      result.skipped++;
      return result;
    }

    // Supprimer toutes les notifications précédentes de ce type pour ce projet
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

    // Filtrer : même type et même projet (ou notification de test avec isTest)
    const previousNotifications = existingNotifications.filter((notif) => {
      if (!notif.metadata) return false;
      try {
        const meta = JSON.parse(notif.metadata);
        if (meta.type !== config.notificationType) return false;

        // Notification de test (projectId null) : on supprime toutes celles de test
        if (notif.projectId === null) {
          return meta.isTest === true;
        }

        // Pour les vraies notifications, vérifier que c'est le même projet
        return meta.projectId === project.id;
      } catch {
        return false;
      }
    });

    // Soft delete des notifications précédentes
    if (previousNotifications.length > 0) {
      await prisma.notification.updateMany({
        where: {
          id: {
            in: previousNotifications.map((n) => n.id),
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
          type: config.notificationType,
          projectId: project.id,
          projectName: project.name,
          [config.dateField]: projectDate.toISOString(),
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
 * Vérifie et crée les notifications pour tous les projets d'un utilisateur
 * dont la date tombe dans la fenêtre configurée (charge uniquement les champs nécessaires)
 */
export async function checkAllUserUpcomingDates(
  userId: string,
  config: UpcomingDateConfig
): Promise<UpcomingDateCheckResult> {
  const result: UpcomingDateCheckResult = {
    created: 0,
    skipped: 0,
    errors: [],
  };

  try {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const windowEnd = new Date(now);
    windowEnd.setDate(windowEnd.getDate() + config.maxDays);
    windowEnd.setHours(23, 59, 59, 999);

    const projects = await prisma.project.findMany({
      where: {
        userId,
        [config.dateField]: {
          gte: now,
          lte: windowEnd,
        },
      },
      select: projectSelect(config.dateField),
    });

    // Vérifier chaque projet
    for (const project of projects) {
      const projectResult = await checkProjectUpcomingDate(project.id, userId, config);
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
