/**
 * Vérifie et crée les notifications pour les releases en approche
 * Règles :
 * - 7 jours avant : notification INFO
 * - 3 jours avant : notification WARNING
 * - 1 jour avant : notification WARNING (urgent)
 * - Le jour J : notification INFO (sortie aujourd'hui)
 */

import {
  checkAllUserUpcomingDates,
  checkProjectUpcomingDate,
  type UpcomingDateCheckResult,
  type UpcomingDateConfig,
} from './upcomingDateNotifications';

export type UpcomingReleaseCheckResult = UpcomingDateCheckResult;

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

const RELEASE_CONFIG: UpcomingDateConfig = {
  dateField: 'releaseDate',
  maxDays: 7,
  notificationType: 'RELEASE_UPCOMING',
  getNotificationInfo: getReleaseNotificationInfo,
};

/**
 * Vérifie et crée les notifications pour les releases en approche d'un projet
 */
export async function checkProjectUpcomingRelease(
  projectId: string,
  userId: string
): Promise<UpcomingReleaseCheckResult> {
  return checkProjectUpcomingDate(projectId, userId, RELEASE_CONFIG);
}

/**
 * Vérifie et crée les notifications pour toutes les releases en approche d'un utilisateur
 */
export async function checkAllUserUpcomingReleases(
  userId: string
): Promise<UpcomingReleaseCheckResult> {
  return checkAllUserUpcomingDates(userId, RELEASE_CONFIG);
}
