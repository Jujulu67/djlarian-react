import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';

import { handleApiError } from '@/lib/api/errorHandler';
import {
  createSuccessResponse,
  createBadRequestResponse,
  createUnauthorizedResponse,
  createConflictResponse,
} from '@/lib/api/responseHelpers';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/api/requireAuth';
import { logger } from '@/lib/logger';

// Fonction helper pour invalider le cache des projets d'un utilisateur
function invalidateProjectsCache(userId: string) {
  revalidateTag(`projects-${userId}`, 'max');
  revalidateTag(`projects-counts-${userId}`, 'max');
  revalidateTag(`projects-statistics-${userId}`, 'max');
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
    const { session, error } = await requireAuth({
      requireUserId: true,
      onAnonymous: () => createUnauthorizedResponse('Non autorisé'),
    });
    if (error) return error;

    const body = await request.json();
    const {
      // IDs spécifiques des projets à modifier (priorité sur les filtres)
      projectIds,
      scopeSource,
      // ID de corrélation pour tracer la requête
      requestId,
      // ID de confirmation pour l'idempotency (évite les doubles mutations)
      confirmationId,
      // Mapping ID projet → updatedAt attendu (ISO string) pour vérification concurrency optimiste
      expectedUpdatedAtById,
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

    // Préparer le préfixe de log
    const logPrefix = requestId ? `[${requestId}]` : '';

    // Vérifier l'idempotency si confirmationId est fourni
    if (confirmationId) {
      // Guard runtime: vérifier que le client Prisma est à jour
      if (
        !prisma.assistantConfirmation ||
        typeof prisma.assistantConfirmation.findUnique !== 'function'
      ) {
        const errorMessage =
          'Prisma client out of date: assistantConfirmation model not found. Run: prisma generate';
        logger.error(`[Batch Update API] ${logPrefix} ❌ ${errorMessage}`, {
          requestId,
          confirmationId,
          userId: session.user.id,
          hasAssistantConfirmation: !!prisma.assistantConfirmation,
          assistantConfirmationType: typeof prisma.assistantConfirmation,
        });
        return NextResponse.json(
          {
            error: errorMessage,
            details: 'The Prisma client needs to be regenerated. Please run: prisma generate',
          },
          { status: 500 }
        );
      }

      const existingConfirmation = await prisma.assistantConfirmation.findUnique({
        where: { confirmationId },
      });

      if (existingConfirmation) {
        // Confirmation déjà traitée : retourner 200 avec duplicated: true
        logger.warn(`[Batch Update API] ${logPrefix} 🔄 Idempotency: confirmationId déjà vu`, {
          requestId,
          confirmationId,
          userId: session.user.id,
          createdAt: existingConfirmation.createdAt,
        });

        return createSuccessResponse(
          {
            count: 0,
            duplicated: true,
            message: 'Cette confirmation a déjà été traitée.',
          },
          200,
          'Cette confirmation a déjà été traitée.'
        );
      }
    }

    // Vérifier la concurrency optimiste si projectIds ET expectedUpdatedAtById sont fournis
    const conflictProjectIds: string[] = [];
    if (
      projectIds &&
      Array.isArray(projectIds) &&
      projectIds.length > 0 &&
      expectedUpdatedAtById &&
      typeof expectedUpdatedAtById === 'object'
    ) {
      // Charger les projets en base avec leur updatedAt
      const currentProjects = await prisma.project.findMany({
        where: {
          userId: session.user.id,
          id: { in: projectIds },
        },
        select: {
          id: true,
          updatedAt: true,
        },
      });

      // Construire un map pour accès rapide
      const currentProjectsMap = new Map(currentProjects.map((p) => [p.id, p.updatedAt]));

      // Vérifier chaque ID attendu
      const conflictDetails: Array<{
        projectId: string;
        reason: string;
        expectedUpdatedAt?: string;
        currentUpdatedAt?: Date | string;
        timeDiff?: number;
      }> = [];

      for (const projectId of projectIds) {
        const expectedUpdatedAt = expectedUpdatedAtById[projectId];
        const currentUpdatedAt = currentProjectsMap.get(projectId);

        // Conflit si:
        // 1. Projet manquant en base
        if (!currentUpdatedAt) {
          conflictProjectIds.push(projectId);
          conflictDetails.push({
            projectId,
            reason: 'project_missing',
          });
          continue;
        }

        // 2. expectedUpdatedAt manquant dans le mapping
        if (!expectedUpdatedAt) {
          conflictProjectIds.push(projectId);
          conflictDetails.push({
            projectId,
            reason: 'expectedUpdatedAt_missing',
            currentUpdatedAt: currentUpdatedAt.toISOString(),
          });
          continue;
        }

        // 3. Mismatch de timestamp (comparer en getTime() pour éviter différences de format)
        // Convertir les deux en Date puis comparer les timestamps
        const expectedDate = new Date(expectedUpdatedAt);
        const currentDate =
          currentUpdatedAt instanceof Date ? currentUpdatedAt : new Date(currentUpdatedAt);

        // Vérifier que les dates sont valides
        if (isNaN(expectedDate.getTime())) {
          conflictProjectIds.push(projectId);
          conflictDetails.push({
            projectId,
            reason: 'expectedUpdatedAt_invalid',
            expectedUpdatedAt,
            currentUpdatedAt: currentDate.toISOString(),
          });
          continue;
        }

        if (isNaN(currentDate.getTime())) {
          conflictProjectIds.push(projectId);
          conflictDetails.push({
            projectId,
            reason: 'currentUpdatedAt_invalid',
            expectedUpdatedAt,
            currentUpdatedAt: currentUpdatedAt.toString(),
          });
          continue;
        }

        // Comparer les timestamps (tolérance de 1 seconde pour les arrondis de millisecondes)
        const expectedTime = expectedDate.getTime();
        const currentTime = currentDate.getTime();
        const timeDiff = Math.abs(expectedTime - currentTime);

        // Conflit seulement si la différence est > 1 seconde (pas juste des millisecondes)
        if (timeDiff > 1000) {
          conflictProjectIds.push(projectId);
          conflictDetails.push({
            projectId,
            reason: 'timestamp_mismatch',
            expectedUpdatedAt,
            currentUpdatedAt: currentDate.toISOString(),
            timeDiff,
          });
        }
      }

      // Logs de debug détaillés pour chaque conflit
      if (conflictProjectIds.length > 0) {
        logger.warn(`[Batch Update API] ${logPrefix} ⚠️ Conflits détectés (détails)`, {
          requestId,
          confirmationId,
          conflictCount: conflictProjectIds.length,
          conflictDetails: conflictDetails.slice(0, 5), // Limiter à 5 pour éviter les logs trop longs
        });
      }

      // Si conflits détectés, retourner 409
      if (conflictProjectIds.length > 0) {
        const logPrefix = requestId ? `[${requestId}]` : '';
        logger.warn(`[Batch Update API] ${logPrefix} ⚠️ Concurrency conflict détecté`, {
          requestId,
          confirmationId,
          projectIdsCount: projectIds.length,
          conflictCount: conflictProjectIds.length,
          conflictProjectIdsSample: conflictProjectIds.slice(0, 3),
          conflictDetails: conflictDetails.slice(0, 5), // Inclure les détails dans le log principal
        });

        // Retourner 409 avec les détails du conflit
        // Format: { error, details: { conflictCount, conflictProjectIds } }
        // Le handler côté client lit depuis details ou directement depuis l'objet
        return createConflictResponse('Some projects changed since confirmation. Please re-list.', {
          conflictCount: conflictProjectIds.length,
          conflictProjectIds: conflictProjectIds,
        });
      }
    }

    // Logs des inputs avec requestId
    logger.warn(`[Batch Update API] ${logPrefix} 📥 Inputs reçus:`, {
      requestId,
      confirmationId,
      projectIdsCount: projectIds?.length || 0,
      scopeSource: scopeSource || 'filter-based',
      filterSummary: {
        minProgress,
        maxProgress,
        status,
        hasDeadline,
        noProgress,
        collab,
        style,
        label,
        labelFinal,
      },
      mutationSummary: {
        newProgress,
        newStatus,
        newDeadline,
        pushDeadlineBy,
        newCollab,
        newStyle,
        newLabel,
        newLabelFinal,
      },
    });

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

    // Règle de sécurité : si projectIds est fourni, utiliser les IDs (priorité absolue)
    if (projectIds && Array.isArray(projectIds) && projectIds.length > 0) {
      whereClause.id = { in: projectIds };
      logger.warn(`[Batch Update API] ${logPrefix} 🎯 Utilisation des IDs (scope = IDs)`, {
        requestId,
        projectIdsCount: projectIds.length,
        projectIdsSample: projectIds.slice(0, 3),
      });
    } else {
      // Sinon, construire le where à partir des filtres
      // Vérifier qu'il y a au moins un filtre non vide
      const hasAnyFilter =
        minProgress !== undefined ||
        maxProgress !== undefined ||
        status ||
        hasDeadline !== undefined ||
        deadlineDate ||
        noProgress !== undefined ||
        collab ||
        style ||
        label ||
        labelFinal;

      if (!hasAnyFilter) {
        // Refuser les requêtes sans scope (pas d'IDs, pas de filtre)
        logger.error(
          `[Batch Update API] ${logPrefix} ❌ Refus: scope vide (pas d'ids, pas de filtre)`,
          {
            requestId,
          }
        );
        return createBadRequestResponse(
          "Refus: scope vide (pas d'ids, pas de filtre). Fournissez soit projectIds, soit au moins un filtre."
        );
      }

      // Filtre pour les projets sans progression (doit être vérifié en premier)
      if (noProgress === true) {
        whereClause.progress = null;
        logger.warn('[Batch Update API] 🔍 Filtre noProgress activé');
      } else if (minProgress !== undefined || maxProgress !== undefined) {
        // Filtres de progression (seulement si noProgress n'est pas activé)
        whereClause.progress = {};
        if (minProgress !== undefined) {
          whereClause.progress.gte = minProgress;
        }
        if (maxProgress !== undefined) {
          whereClause.progress.lte = maxProgress;
        }
        logger.warn('[Batch Update API] 🔍 Filtres de progression:', whereClause.progress);
      }

      // Filtre par statut
      if (status) {
        whereClause.status = status;
        logger.warn('[Batch Update API] 🔍 Filtre statut:', status);
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
        logger.warn('[Batch Update API] 🔍 Filtre collaborateur:', collab);
      }

      // Filtre par style
      if (style) {
        whereClause.style = style;
        logger.warn('[Batch Update API] 🔍 Filtre style:', style);
      }

      // Filtre par label
      if (label) {
        whereClause.label = label;
        logger.warn('[Batch Update API] 🔍 Filtre label:', label);
      }

      // Filtre par label final
      if (labelFinal) {
        whereClause.labelFinal = labelFinal;
        logger.warn('[Batch Update API] 🔍 Filtre labelFinal:', labelFinal);
      }
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

      logger.warn(
        `[Batch Update API] ${logPrefix} 📅 Décalage de deadlines: ${projectsToUpdate.length} projet(s) trouvé(s)`,
        { requestId }
      );

      let updatedCount = 0;

      // Utiliser une transaction si confirmationId est fourni (garantit l'atomicité)
      if (confirmationId) {
        // Guard runtime: vérifier que le client Prisma est à jour
        if (
          !prisma.assistantConfirmation ||
          typeof prisma.assistantConfirmation.findUnique !== 'function'
        ) {
          const errorMessage =
            'Prisma client out of date: assistantConfirmation model not found. Run: prisma generate';
          logger.error(`[Batch Update API] ${logPrefix} ❌ ${errorMessage}`, {
            requestId,
            confirmationId,
            userId: session.user.id,
          });
          return NextResponse.json(
            {
              error: errorMessage,
              details: 'The Prisma client needs to be regenerated. Please run: prisma generate',
            },
            { status: 500 }
          );
        }

        await prisma.$transaction(async (tx) => {
          // Créer l'entrée de confirmation (sera rollback si l'update échoue)
          await tx.assistantConfirmation.create({
            data: {
              userId: session.user.id,
              confirmationId,
            },
          });

          // Mettre à jour chaque projet dans la transaction
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

            await tx.project.update({
              where: { id: project.id },
              data: { deadline: newDeadline },
            });

            updatedCount++;
          }
        });
      } else {
        // Pas de confirmationId: updates normaux sans transaction
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
      }

      logger.warn(`[Batch Update API] ${logPrefix} ✅ ${updatedCount} deadline(s) décalée(s)`, {
        requestId,
        confirmationId,
      });

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
        logger.warn('[Batch Update API] 🗑️ Suppression de deadline demandée');
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

    logger.warn(
      `[Batch Update API] ${logPrefix} 🔍 Clause WHERE finale:`,
      JSON.stringify(whereClause, null, 2),
      {
        requestId,
      }
    );
    logger.warn(
      `[Batch Update API] ${logPrefix} 📝 Données de mise à jour:`,
      JSON.stringify(updateData, null, 2),
      { requestId }
    );

    // Compter d'abord les projets qui correspondent aux critères
    const countBefore = await prisma.project.count({
      where: whereClause,
    });
    logger.warn(
      `[Batch Update API] ${logPrefix} 📊 Nombre de projets correspondant aux critères:`,
      countBefore,
      {
        requestId,
      }
    );
    logger.warn(`[Batch Update API] ${logPrefix} 📊 Requête Prisma résumée:`, {
      requestId,
      where: projectIds
        ? `id in [${projectIds.length} IDs]`
        : Object.keys(whereClause)
            .filter((k) => k !== 'userId')
            .map((k) => `${k}: ${JSON.stringify(whereClause[k])}`)
            .join(', ') || 'userId only',
      dataKeys: Object.keys(updateData),
    });

    // Exécuter la mise à jour dans une transaction si confirmationId est fourni
    // Cela garantit que si l'update échoue, l'insert de confirmation est rollback
    // et une retry pourra réessayer (au lieu de dire "duplicated" alors que rien n'a été appliqué)
    let result: { count: number };

    if (confirmationId) {
      // Guard runtime: vérifier que le client Prisma est à jour
      if (
        !prisma.assistantConfirmation ||
        typeof prisma.assistantConfirmation.findUnique !== 'function'
      ) {
        const errorMessage =
          'Prisma client out of date: assistantConfirmation model not found. Run: prisma generate';
        logger.error(`[Batch Update API] ${logPrefix} ❌ ${errorMessage}`, {
          requestId,
          confirmationId,
          userId: session.user.id,
        });
        return NextResponse.json(
          {
            error: errorMessage,
            details: 'The Prisma client needs to be regenerated. Please run: prisma generate',
          },
          { status: 500 }
        );
      }

      // Transaction atomique: insert confirmation + update projets
      result = await prisma.$transaction(async (tx) => {
        // Créer l'entrée de confirmation (sera rollback si l'update échoue)
        await tx.assistantConfirmation.create({
          data: {
            userId: session.user.id,
            confirmationId,
          },
        });

        // Exécuter la mise à jour
        return await tx.project.updateMany({
          where: whereClause,
          data: updateData,
        });
      });
    } else {
      // Pas de confirmationId: update normal sans transaction
      result = await prisma.project.updateMany({
        where: whereClause,
        data: updateData,
      });
    }

    logger.warn(`[Batch Update API] ${logPrefix} ✅ Résultat:`, {
      requestId,
      confirmationId,
      countUpdated: result.count,
      expectedCount: projectIds ? projectIds.length : countBefore,
      match: projectIds ? result.count === projectIds.length : 'N/A (filter-based)',
    });

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
