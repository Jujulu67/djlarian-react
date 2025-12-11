/**
 * Helpers pour la construction de clauses WHERE et data pour les outils IA
 */
import { parseRelativeDate } from '../parsers/date-parser';

/**
 * Construit une clause WHERE Prisma pour filtrer les projets
 */
export function buildWhereClause(
  targetUserId: string,
  minProgress?: number,
  maxProgress?: number,
  status?: string,
  hasDeadline?: boolean,
  deadlineDate?: string
): any {
  const whereClause: any = {
    userId: targetUserId,
  };

  // Filtres de progression
  if (minProgress !== undefined || maxProgress !== undefined) {
    whereClause.progress = {};
    if (minProgress !== undefined) {
      whereClause.progress.gte = minProgress;
    }
    if (maxProgress !== undefined) {
      whereClause.progress.lte = maxProgress;
    }
  }

  // Filtre par statut
  if (status) {
    whereClause.status = status;
  }

  // Filtre par deadline
  if (hasDeadline !== undefined) {
    if (hasDeadline) {
      whereClause.deadline = { not: null };
    } else {
      whereClause.deadline = null;
    }
  }

  // Filtre par date de deadline
  if (deadlineDate) {
    const parsedDateStr = parseRelativeDate(deadlineDate);
    if (parsedDateStr) {
      const targetDate = new Date(parsedDateStr);
      const nextDay = new Date(targetDate);
      nextDay.setDate(nextDay.getDate() + 1);
      whereClause.deadline = {
        gte: targetDate,
        lt: nextDay,
      };
    }
  }

  return whereClause;
}

/**
 * Construit l'objet data pour une mise à jour Prisma
 */
export function buildUpdateData(newDeadline?: string, newStatus?: string): any {
  const data: any = {};

  // Traitement de la deadline avec conversion des dates relatives
  if (newDeadline) {
    const parsedDate = parseRelativeDate(newDeadline);
    if (parsedDate) {
      data.deadline = new Date(parsedDate);
    } else {
      // Essayer de parser directement
      const dateObj = new Date(newDeadline);
      if (!isNaN(dateObj.getTime())) {
        data.deadline = dateObj;
      } else {
        throw new Error(
          `Format de date invalide "${newDeadline}". Utilisez YYYY-MM-DD ou une date relative.`
        );
      }
    }
  }

  if (newStatus) {
    data.status = newStatus;
  }

  return data;
}
