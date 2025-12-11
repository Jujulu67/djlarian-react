/**
 * Vérifie et crée les notifications pour les jalons de projets dépassés
 * Jalons supportés: J90 (3 mois), J180 (6 mois), J365 (1 an)
 * Utilise maintenant le système de notifications générique
 */

import prisma from '@/lib/prisma';

export type MilestoneType = 'J90' | 'J180' | 'J365';

export interface MilestoneCheckResult {
  created: number;
  skipped: number;
  errors: Array<{ projectId: string; error: string }>;
}

/**
 * Calcule la date d'un jalon basé sur la date de release
 */
function calculateMilestoneDate(releaseDate: Date, milestoneType: MilestoneType): Date {
  const date = new Date(releaseDate);
  const days = milestoneType === 'J90' ? 90 : milestoneType === 'J180' ? 180 : 365;
  date.setDate(date.getDate() + days);
  return date;
}

/**
 * Vérifie si un projet a dépassé un jalon et n'a PAS de streams renseignés
 * On notifie pour alerter que le jalon est atteint mais les streams ne sont pas encore renseignés
 */
function hasMilestoneData(
  project: {
    releaseDate: Date | null;
    streamsJ90?: number | null;
    streamsJ180: number | null;
    streamsJ365: number | null;
  },
  milestoneType: MilestoneType
): boolean {
  if (!project.releaseDate) {
    return false;
  }

  // Vérifier que le jalon est dépassé
  const milestoneDate = calculateMilestoneDate(project.releaseDate, milestoneType);
  const now = new Date();
  if (now < milestoneDate) {
    return false;
  }

  // Vérifier que les streams sont NON renseignés pour ce jalon
  switch (milestoneType) {
    case 'J90':
      // Pour J90, on peut utiliser streamsJ84 comme approximation ou attendre J180
      // Pour l'instant, on ne notifie que J180 et J365 qui sont dans le schéma
      return false;
    case 'J180':
      return project.streamsJ180 === null || project.streamsJ180 === undefined;
    case 'J365':
      return project.streamsJ365 === null || project.streamsJ365 === undefined;
    default:
      return false;
  }
}

/**
 * Vérifie et crée les notifications pour un projet spécifique
 */
export async function checkProjectMilestones(
  projectId: string,
  userId: string
): Promise<MilestoneCheckResult> {
  const result: MilestoneCheckResult = {
    created: 0,
    skipped: 0,
    errors: [],
  };

  try {
    // Récupérer le projet avec ses streams
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        userId: true,
        name: true,
        releaseDate: true,
        streamsJ180: true,
        streamsJ365: true,
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

    // Vérifier chaque jalon (J180 et J365 pour l'instant)
    const milestonesToCheck: MilestoneType[] = ['J180', 'J365'];

    for (const milestoneType of milestonesToCheck) {
      try {
        // Vérifier si le jalon est dépassé et a des données
        if (!hasMilestoneData(project, milestoneType)) {
          result.skipped++;
          continue;
        }

        // Vérifier si une notification existe déjà pour ce jalon + projet
        // On cherche toutes les notifications MILESTONE pour ce projet (y compris archivées) et on vérifie les métadonnées
        const existingNotifications = await prisma.notification.findMany({
          where: {
            userId,
            projectId: project.id,
            type: 'MILESTONE',
            deletedAt: null, // Ne pas vérifier les notifications supprimées
          },
        });

        // Vérifier si une notification avec ce milestoneType existe déjà
        const existingNotification = existingNotifications.find((notif) => {
          if (!notif.metadata) return false;
          try {
            const meta = JSON.parse(notif.metadata);
            return meta.milestoneType === milestoneType;
          } catch {
            return false;
          }
        });

        if (existingNotification) {
          result.skipped++;
          continue;
        }

        // Créer la notification avec le nouveau système générique
        const milestoneLabel =
          milestoneType === 'J180' ? '6 mois' : milestoneType === 'J365' ? '1 an' : '3 mois';

        await prisma.notification.create({
          data: {
            userId: project.userId,
            type: 'MILESTONE',
            title: `Jalon ${milestoneLabel} atteint - Streams non renseignés`,
            message: `Le projet "${project.name}" a atteint le jalon ${milestoneLabel} mais les streams ne sont pas encore renseignés`,
            metadata: JSON.stringify({
              milestoneType,
              projectId: project.id,
              projectName: project.name,
              streams: null, // Les streams ne sont pas renseignés
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
          error: error instanceof Error ? error.message : 'Erreur inconnue',
        });
      }
    }
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
 */
export async function checkAllUserMilestones(userId: string): Promise<MilestoneCheckResult> {
  const result: MilestoneCheckResult = {
    created: 0,
    skipped: 0,
    errors: [],
  };

  try {
    // Récupérer tous les projets de l'utilisateur avec releaseDate
    const projects = await prisma.project.findMany({
      where: {
        userId,
        releaseDate: { not: null },
      },
      select: {
        id: true,
        userId: true,
        name: true,
        releaseDate: true,
        streamsJ180: true,
        streamsJ365: true,
      },
    });

    // Vérifier chaque projet
    for (const project of projects) {
      const projectResult = await checkProjectMilestones(project.id, userId);
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
