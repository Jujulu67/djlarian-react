/**
 * Helpers pour la construction de clauses WHERE et data pour les outils IA
 */
import { parseRelativeDate } from '../parsers/date-parser';
import prisma from '@/lib/prisma';
import { findProjectCandidates } from '@/lib/utils/findProjectCandidates';
import type { Project } from '@/components/projects/types';

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

/**
 * Trouve un projet par nom en utilisant le matching fuzzy
 * Retourne le meilleur candidat avec un score >= 80, ou null si aucun candidat valide
 */
export async function findProjectByName(
  projectName: string,
  targetUserId: string
): Promise<{ project: Project; score: number } | null> {
  // Récupérer tous les projets de l'utilisateur
  const projects = await prisma.project.findMany({
    where: {
      userId: targetUserId,
    },
    select: {
      id: true,
      name: true,
      progress: true,
      status: true,
      deadline: true,
      releaseDate: true,
      style: true,
      collab: true,
      label: true,
      labelFinal: true,
      externalLink: true,
      note: true,
      order: true,
      createdAt: true,
      updatedAt: true,
      userId: true,
      streamsJ7: true,
      streamsJ14: true,
      streamsJ21: true,
      streamsJ28: true,
      streamsJ56: true,
      streamsJ84: true,
      streamsJ180: true,
      streamsJ365: true,
    },
  });

  // Convertir en format Project pour findProjectCandidates
  const projectList: Project[] = projects.map((p) => ({
    ...p,
    deadline: p.deadline ? p.deadline.toISOString().split('T')[0] : null,
    releaseDate: p.releaseDate ? p.releaseDate.toISOString().split('T')[0] : null,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  }));

  // Trouver les candidats
  const candidates = findProjectCandidates(projectName, projectList, 5);

  // Filtrer les candidats avec un score >= 80 (seuil de confiance élevé)
  const validCandidates = candidates.filter((c) => c.score >= 80);

  if (validCandidates.length === 0) {
    return null;
  }

  // Retourner le meilleur candidat
  return {
    project: validCandidates[0].project,
    score: validCandidates[0].score,
  };
}
