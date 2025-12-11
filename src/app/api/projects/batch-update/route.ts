import { NextRequest } from 'next/server';
import { revalidateTag } from 'next/cache';

import { auth } from '@/auth';
import { handleApiError } from '@/lib/api/errorHandler';
import {
  createSuccessResponse,
  createBadRequestResponse,
  createUnauthorizedResponse,
} from '@/lib/api/responseHelpers';
import prisma from '@/lib/prisma';

// Fonction helper pour invalider le cache des projets d'un utilisateur
function invalidateProjectsCache(userId: string) {
  // @ts-expect-error - revalidateTag prend un seul argument (tag) mais les types Next.js peuvent être incorrects
  revalidateTag(`projects-${userId}`);
  // @ts-expect-error - revalidateTag prend un seul argument (tag) mais les types Next.js peuvent être incorrects
  revalidateTag(`projects-counts-${userId}`);
  // @ts-expect-error - revalidateTag prend un seul argument (tag) mais les types Next.js peuvent être incorrects
  revalidateTag(`projects-statistics-${userId}`);
}

// Fonction pour parser les dates relatives
function parseRelativeDate(dateStr: string): string | null {
  const lowerDateStr = dateStr.toLowerCase().trim();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (lowerDateStr === 'demain' || lowerDateStr === 'tomorrow') {
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  }

  if (lowerDateStr === "aujourd'hui" || lowerDateStr === 'today') {
    return today.toISOString().split('T')[0];
  }

  if (lowerDateStr === 'après-demain' || lowerDateStr === 'day after tomorrow') {
    const afterTomorrow = new Date(today);
    afterTomorrow.setDate(afterTomorrow.getDate() + 2);
    return afterTomorrow.toISOString().split('T')[0];
  }

  if (lowerDateStr.includes('semaine pro') || lowerDateStr.includes('next week')) {
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);
    return nextWeek.toISOString().split('T')[0];
  }

  // Si c'est déjà une date ISO, la retourner
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr;
  }

  return null;
}

// POST /api/projects/batch-update - Met à jour plusieurs projets selon des critères
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return createUnauthorizedResponse('Non autorisé');
    }

    const body = await request.json();
    const {
      // Filtres pour identifier les projets à modifier
      minProgress,
      maxProgress,
      status,
      hasDeadline,
      deadlineDate,
      noProgress,
      collab,
      style,
      label,
      labelFinal,
      // Nouvelles valeurs à appliquer
      newProgress,
      newStatus,
      newDeadline,
      pushDeadlineBy,
      newCollab,
      newStyle,
      newLabel,
      newLabelFinal,
    } = body;

    // Vérifier qu'il y a au moins une modification à faire
    // null est une valeur valide pour newDeadline (indique la suppression)
    const hasModification =
      newProgress !== undefined ||
      newStatus !== undefined ||
      newDeadline !== undefined || // null est une valeur valide (suppression)
      pushDeadlineBy !== undefined ||
      newCollab !== undefined ||
      newStyle !== undefined ||
      newLabel !== undefined ||
      newLabelFinal !== undefined;

    if (!hasModification) {
      return createBadRequestResponse(
        'Aucune modification spécifiée. Fournissez au moins newProgress, newStatus, newDeadline, pushDeadlineBy, newCollab, newStyle, newLabel ou newLabelFinal.'
      );
    }

    // Construire la clause WHERE pour filtrer les projets
    const whereClause: any = {
      userId: session.user.id,
    };

    console.log('[Batch Update API] 📥 Paramètres reçus:', {
      minProgress,
      maxProgress,
      status,
      hasDeadline,
      deadlineDate,
      noProgress,
      collab,
      style,
      label,
      labelFinal,
      newProgress,
      newStatus,
      newDeadline,
      pushDeadlineBy,
      newCollab,
      newStyle,
      newLabel,
      newLabelFinal,
    });

    // Filtre pour les projets sans progression (doit être vérifié en premier)
    if (noProgress === true) {
      whereClause.progress = null;
      console.log('[Batch Update API] 🔍 Filtre noProgress activé');
    } else if (minProgress !== undefined || maxProgress !== undefined) {
      // Filtres de progression (seulement si noProgress n'est pas activé)
      whereClause.progress = {};
      if (minProgress !== undefined) {
        whereClause.progress.gte = minProgress;
      }
      if (maxProgress !== undefined) {
        whereClause.progress.lte = maxProgress;
      }
      console.log('[Batch Update API] 🔍 Filtres de progression:', whereClause.progress);
    }

    // Filtre par statut
    if (status) {
      whereClause.status = status;
      console.log('[Batch Update API] 🔍 Filtre statut:', status);
    }

    // Filtre par deadline
    if (hasDeadline !== undefined) {
      if (hasDeadline) {
        whereClause.deadline = { not: null };
      } else {
        whereClause.deadline = null;
      }
    }

    if (deadlineDate) {
      const dateObj = new Date(deadlineDate);
      if (!isNaN(dateObj.getTime())) {
        whereClause.deadline = dateObj.toISOString().split('T')[0];
      }
    }

    // Filtre par collaborateur
    if (collab) {
      whereClause.collab = collab;
      console.log('[Batch Update API] 🔍 Filtre collaborateur:', collab);
    }

    // Filtre par style
    if (style) {
      whereClause.style = style;
      console.log('[Batch Update API] 🔍 Filtre style:', style);
    }

    // Filtre par label
    if (label) {
      whereClause.label = label;
      console.log('[Batch Update API] 🔍 Filtre label:', label);
    }

    // Filtre par label final
    if (labelFinal) {
      whereClause.labelFinal = labelFinal;
      console.log('[Batch Update API] 🔍 Filtre labelFinal:', labelFinal);
    }

    // Construire les données de mise à jour
    const updateData: any = {};

    if (newProgress !== undefined) {
      updateData.progress = newProgress;
    }

    if (newStatus) {
      updateData.status = newStatus;
      // Si on passe à TERMINE, forcer progress à 100
      if (newStatus === 'TERMINE') {
        updateData.progress = 100;
      }
    }

    // Gérer le décalage de deadlines (doit être fait avant la mise à jour en masse)
    if (pushDeadlineBy !== undefined) {
      // Pour décaler les deadlines, on doit récupérer chaque projet individuellement
      // car chaque deadline doit être décalée de sa valeur actuelle
      const { days, weeks, months } = pushDeadlineBy;

      // Les valeurs peuvent être négatives (pour reculer les deadlines)
      // Vérifier qu'au moins une valeur est définie et non-nulle
      if (
        (days === undefined || days === 0) &&
        (weeks === undefined || weeks === 0) &&
        (months === undefined || months === 0)
      ) {
        return createBadRequestResponse(
          'pushDeadlineBy doit contenir au moins une valeur non-nulle pour days, weeks ou months.'
        );
      }

      // Récupérer tous les projets correspondant aux critères
      const projectsToUpdate = await prisma.project.findMany({
        where: whereClause,
        select: { id: true, deadline: true },
      });

      console.log(
        `[Batch Update API] 📅 Décalage de deadlines: ${projectsToUpdate.length} projet(s) trouvé(s)`
      );

      let updatedCount = 0;
      for (const project of projectsToUpdate) {
        if (!project.deadline) {
          // Ignorer les projets sans deadline
          continue;
        }

        const currentDeadline = new Date(project.deadline);
        const newDeadline = new Date(currentDeadline);

        // Les valeurs peuvent être négatives (pour reculer les deadlines)
        if (days !== undefined) {
          newDeadline.setDate(newDeadline.getDate() + days);
        }
        if (weeks !== undefined) {
          newDeadline.setDate(newDeadline.getDate() + weeks * 7);
        }
        if (months !== undefined) {
          newDeadline.setMonth(newDeadline.getMonth() + months);
        }

        await prisma.project.update({
          where: { id: project.id },
          data: { deadline: newDeadline },
        });

        updatedCount++;
      }

      console.log(`[Batch Update API] ✅ ${updatedCount} deadline(s) décalée(s)`);

      // Invalider le cache après modification
      invalidateProjectsCache(session.user.id);

      return createSuccessResponse(
        {
          count: updatedCount,
          message:
            updatedCount > 0
              ? `${updatedCount} deadline(s) décalée(s) avec succès.`
              : 'Aucun projet avec deadline ne correspond aux critères.',
        },
        200,
        updatedCount > 0
          ? `${updatedCount} deadline(s) décalée(s) avec succès.`
          : 'Aucun projet avec deadline ne correspond aux critères.'
      );
    }

    if (newDeadline !== undefined) {
      // null indique la suppression de la deadline
      if (newDeadline === null) {
        updateData.deadline = null;
        console.log('[Batch Update API] 🗑️ Suppression de deadline demandée');
      } else {
        // Parser la date pour la définir
        const parsedDate = parseRelativeDate(newDeadline);
        if (parsedDate) {
          updateData.deadline = new Date(parsedDate);
        } else {
          // Essayer de parser directement
          const dateObj = new Date(newDeadline);
          if (!isNaN(dateObj.getTime())) {
            updateData.deadline = dateObj;
          } else {
            return createBadRequestResponse(
              `Format de date invalide "${newDeadline}". Utilisez YYYY-MM-DD ou une date relative.`
            );
          }
        }
      }
    }

    if (newCollab !== undefined) {
      updateData.collab = newCollab;
    }

    if (newStyle !== undefined) {
      updateData.style = newStyle;
    }

    if (newLabel !== undefined) {
      updateData.label = newLabel;
    }

    if (newLabelFinal !== undefined) {
      updateData.labelFinal = newLabelFinal;
    }

    console.log('[Batch Update API] 🔍 Clause WHERE finale:', JSON.stringify(whereClause, null, 2));
    console.log(
      '[Batch Update API] 📝 Données de mise à jour:',
      JSON.stringify(updateData, null, 2)
    );

    // Compter d'abord les projets qui correspondent aux critères
    const countBefore = await prisma.project.count({
      where: whereClause,
    });
    console.log('[Batch Update API] 📊 Nombre de projets correspondant aux critères:', countBefore);

    // Exécuter la mise à jour
    const result = await prisma.project.updateMany({
      where: whereClause,
      data: updateData,
    });

    console.log('[Batch Update API] ✅ Projets modifiés:', result.count);

    // Invalider le cache après modification
    invalidateProjectsCache(session.user.id);

    return createSuccessResponse(
      {
        count: result.count,
        message:
          result.count > 0
            ? `Mise à jour réussie pour ${result.count} projet(s).`
            : 'Aucun projet ne correspond aux critères.',
      },
      200,
      result.count > 0
        ? `Mise à jour réussie pour ${result.count} projet(s).`
        : 'Aucun projet ne correspond aux critères.'
    );
  } catch (error) {
    return handleApiError(error, 'POST /api/projects/batch-update');
  }
}
