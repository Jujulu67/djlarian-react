/**
 * Vérifie et crée les notifications pour les deadlines en approche
 * Règles :
 * - 14 jours avant : notification INFO
 * - 7 jours avant : notification INFO
 * - 5 jours avant : notification INFO
 * - 3 jours avant : notification WARNING
 * - 1 jour avant : notification WARNING (urgent)
 */

import {
  checkAllUserUpcomingDates,
  checkProjectUpcomingDate,
  type UpcomingDateCheckResult,
  type UpcomingDateConfig,
} from './upcomingDateNotifications';

export type UpcomingDeadlineCheckResult = UpcomingDateCheckResult;

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

const DEADLINE_CONFIG: UpcomingDateConfig = {
  dateField: 'deadline',
  maxDays: 14,
  notificationType: 'DEADLINE_UPCOMING',
  getNotificationInfo: getDeadlineNotificationInfo,
};

/**
 * Vérifie et crée les notifications pour les deadlines en approche d'un projet
 */
export async function checkProjectUpcomingDeadline(
  projectId: string,
  userId: string
): Promise<UpcomingDeadlineCheckResult> {
  return checkProjectUpcomingDate(projectId, userId, DEADLINE_CONFIG);
}

/**
 * Vérifie et crée les notifications pour toutes les deadlines en approche d'un utilisateur
 */
export async function checkAllUserUpcomingDeadlines(
  userId: string
): Promise<UpcomingDeadlineCheckResult> {
  return checkAllUserUpcomingDates(userId, DEADLINE_CONFIG);
}
