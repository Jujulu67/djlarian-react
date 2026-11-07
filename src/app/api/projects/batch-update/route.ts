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
import { Prisma } from '@prisma/client';

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
interface PushDeadlineBy {
  days?: number;
  weeks?: number;
  months?: number;
}

interface BatchUpdateBody {
  /** IDs des projets à modifier (priorité sur les filtres) */
  projectIds?: string[];
  scopeSource?: string;
  /** ID de corrélation pour tracer la requête */
  requestId?: string;
  /** ID de confirmation pour l'idempotency (évite les doubles mutations) */
  confirmationId?: string;
  /** ID projet → updatedAt attendu (ISO) pour la concurrence optimiste */
  expectedUpdatedAtById?: Record<string, string>;
  // Filtres pour identifier les projets à modifier
  minProgress?: number;
  maxProgress?: number;
  status?: string;
  hasDeadline?: boolean;
  deadlineDate?: string;
  noProgress?: boolean;
  collab?: string;
  style?: string;
  label?: string;
  labelFinal?: string;
  // Nouvelles valeurs à appliquer
  newProgress?: number | null;
  newStatus?: string;
  /** null supprime la deadline */
  newDeadline?: string | null;
  pushDeadlineBy?: PushDeadlineBy;
  newCollab?: string | null;
  newStyle?: string | null;
  newLabel?: string | null;
  newLabelFinal?: string | null;
}

/** Contexte commun aux étapes de la requête. */
interface RequestContext {
  body: BatchUpdateBody;
  userId: string;
  logPrefix: string;
}

const hasIds = (projectIds: BatchUpdateBody['projectIds']): projectIds is string[] =>
  Array.isArray(projectIds) && projectIds.length > 0;

/** Exécute une mutation, atomiquement avec l'entrée de confirmation s'il y en a une : si la
 * mutation échoue, la confirmation est annulée et une nouvelle tentative reste possible. */
function withConfirmation<T>(
  { body, userId }: RequestContext,
  mutate: (client: Prisma.TransactionClient) => Promise<T>
): Promise<T> {
  const { confirmationId } = body;
  if (!confirmationId) return mutate(prisma);
  return prisma.$transaction(async (tx) => {
    await tx.assistantConfirmation.create({ data: { userId, confirmationId } });
    return mutate(tx);
  });
}

/** Réponse à renvoyer si cette confirmation a déjà été traitée (ou ne peut pas être vérifiée). */
async function checkIdempotency({ body, userId, logPrefix }: RequestContext) {
  const { confirmationId, requestId } = body;
  if (!confirmationId) return null;

  if (
    !prisma.assistantConfirmation ||
    typeof prisma.assistantConfirmation.findUnique !== 'function'
  ) {
    const errorMessage =
      'Prisma client out of date: assistantConfirmation model not found. Run: prisma generate';
    logger.error(`[Batch Update API] ${logPrefix} ❌ ${errorMessage}`, {
      requestId,
      confirmationId,
      userId,
    });
    return NextResponse.json(
      {
        error: errorMessage,
        details: 'The Prisma client needs to be regenerated. Please run: prisma generate',
      },
      { status: 500 }
    );
  }

  const existing = await prisma.assistantConfirmation.findUnique({ where: { confirmationId } });
  if (!existing) return null;

  logger.warn(`[Batch Update API] ${logPrefix} 🔄 Idempotency: confirmationId déjà traité`, {
    requestId,
    confirmationId,
    userId,
    createdAt: existing.createdAt,
  });
  return createSuccessResponse(
    { count: 0, duplicated: true, message: 'Cette confirmation a déjà été traitée.' },
    200,
    'Cette confirmation a déjà été traitée.'
  );
}

/** Raison du conflit entre le updatedAt attendu et l'actuel, ou null s'ils concordent. */
function findConflict(expected: string | undefined, current: Date | string | undefined) {
  if (!current) return { reason: 'project_missing' };
  const currentDate = current instanceof Date ? current : new Date(current);
  if (!expected) return { reason: 'expectedUpdatedAt_missing', currentUpdatedAt: current };

  const expectedTime = new Date(expected).getTime();
  const currentTime = currentDate.getTime();
  if (Number.isNaN(expectedTime)) return { reason: 'expectedUpdatedAt_invalid', expected };
  if (Number.isNaN(currentTime)) return { reason: 'currentUpdatedAt_invalid', expected };

  // Tolérance d'une seconde pour les arrondis de millisecondes
  const timeDiff = Math.abs(expectedTime - currentTime);
  return timeDiff > 1000 ? { reason: 'timestamp_mismatch', expected, timeDiff } : null;
}

/** Réponse 409 si un projet a changé depuis la confirmation (concurrence optimiste). */
async function checkConcurrency({ body, userId, logPrefix }: RequestContext) {
  const { projectIds, expectedUpdatedAtById, requestId, confirmationId } = body;
  if (!hasIds(projectIds) || !expectedUpdatedAtById || typeof expectedUpdatedAtById !== 'object') {
    return null;
  }

  const projects = await prisma.project.findMany({
    where: { userId, id: { in: projectIds } },
    select: { id: true, updatedAt: true },
  });
  const updatedAtById = new Map(projects.map((p) => [p.id, p.updatedAt]));

  const conflicts = projectIds.flatMap((projectId) => {
    const conflict = findConflict(expectedUpdatedAtById[projectId], updatedAtById.get(projectId));
    return conflict ? [{ projectId, ...conflict }] : [];
  });
  if (conflicts.length === 0) return null;

  const conflictProjectIds = conflicts.map((c) => c.projectId);
  logger.warn(`[Batch Update API] ${logPrefix} ⚠️ Concurrency conflict détecté`, {
    requestId,
    confirmationId,
    projectIdsCount: projectIds.length,
    conflictCount: conflicts.length,
    conflictDetails: conflicts.slice(0, 5),
  });
  return createConflictResponse('Some projects changed since confirmation. Please re-list.', {
    conflictCount: conflicts.length,
    conflictProjectIds,
  });
}

function hasModification(body: BatchUpdateBody): boolean {
  return [
    body.newProgress,
    body.newStatus,
    body.newDeadline, // null est une valeur valide (suppression)
    body.pushDeadlineBy,
    body.newCollab,
    body.newStyle,
    body.newLabel,
    body.newLabelFinal,
  ].some((value) => value !== undefined);
}

function hasAnyFilter(body: BatchUpdateBody): boolean {
  return Boolean(
    body.minProgress !== undefined ||
    body.maxProgress !== undefined ||
    body.status ||
    body.hasDeadline !== undefined ||
    body.deadlineDate ||
    body.noProgress !== undefined ||
    body.collab ||
    body.style ||
    body.label ||
    body.labelFinal
  );
}

function progressFilter({ noProgress, minProgress, maxProgress }: BatchUpdateBody) {
  // noProgress l'emporte sur les bornes
  if (noProgress === true) return { progress: null };
  if (minProgress === undefined && maxProgress === undefined) return {};
  return {
    progress: {
      ...(minProgress !== undefined && { gte: minProgress }),
      ...(maxProgress !== undefined && { lte: maxProgress }),
    },
  };
}

function deadlineFilter({ hasDeadline, deadlineDate }: BatchUpdateBody) {
  // Une date précise et valide l'emporte sur hasDeadline
  const date = deadlineDate ? new Date(deadlineDate) : null;
  if (date && !Number.isNaN(date.getTime())) return { deadline: date.toISOString().split('T')[0] };
  if (hasDeadline === undefined) return {};
  return { deadline: hasDeadline ? { not: null } : null };
}

/** Clause WHERE : les IDs ont la priorité absolue, sinon les filtres. */
function buildWhere(body: BatchUpdateBody, userId: string): Prisma.ProjectWhereInput {
  if (hasIds(body.projectIds)) return { userId, id: { in: body.projectIds } };
  const { status, collab, style, label, labelFinal } = body;
  return {
    userId,
    ...progressFilter(body),
    ...deadlineFilter(body),
    ...(status && { status }),
    ...(collab && { collab }),
    ...(style && { style }),
    ...(label && { label }),
    ...(labelFinal && { labelFinal }),
  } as Prisma.ProjectWhereInput;
}

/** Deadline décalée ; les valeurs peuvent être négatives pour la reculer. */
function shiftDeadline(deadline: Date | string, { days, weeks, months }: PushDeadlineBy): Date {
  const shifted = new Date(deadline);
  if (days !== undefined) shifted.setDate(shifted.getDate() + days);
  if (weeks !== undefined) shifted.setDate(shifted.getDate() + weeks * 7);
  if (months !== undefined) shifted.setMonth(shifted.getMonth() + months);
  return shifted;
}

/** Chaque deadline se décale depuis sa propre valeur : mise à jour projet par projet. */
async function pushDeadlines(
  context: RequestContext,
  where: Prisma.ProjectWhereInput,
  pushBy: PushDeadlineBy
) {
  if (!pushBy.days && !pushBy.weeks && !pushBy.months) {
    return createBadRequestResponse(
      'pushDeadlineBy doit contenir au moins une valeur non-nulle pour days, weeks ou months.'
    );
  }

  const projects = await prisma.project.findMany({
    where,
    select: { id: true, deadline: true },
  });
  // Les projets sans deadline sont ignorés
  const withDeadline = projects.filter((project) => project.deadline);

  const count = await withConfirmation(context, async (client) => {
    for (const project of withDeadline) {
      await client.project.update({
        where: { id: project.id },
        data: { deadline: shiftDeadline(project.deadline as Date, pushBy) },
      });
    }
    return withDeadline.length;
  });

  invalidateProjectsCache(context.userId);
  const message =
    count > 0
      ? `${count} deadline(s) décalée(s) avec succès.`
      : 'Aucun projet avec deadline ne correspond aux critères.';
  return createSuccessResponse({ count, message }, 200, message);
}

/** Date demandée (relative ou absolue), null pour une suppression, undefined si invalide. */
function parseNewDeadline(newDeadline: string | null): Date | null | undefined {
  if (newDeadline === null) return null;
  const relative = parseRelativeDate(newDeadline);
  if (relative) return new Date(relative);
  const date = new Date(newDeadline);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

/** Données de mise à jour, hors deadline. Un projet TERMINE passe forcément à 100 %. */
function buildUpdateData(body: BatchUpdateBody): Prisma.ProjectUpdateManyMutationInput {
  const { newProgress, newStatus, newCollab, newStyle, newLabel, newLabelFinal } = body;
  return {
    ...(newProgress !== undefined && { progress: newProgress }),
    ...(newStatus && { status: newStatus }),
    ...(newStatus === 'TERMINE' && { progress: 100 }),
    ...(newCollab !== undefined && { collab: newCollab }),
    ...(newStyle !== undefined && { style: newStyle }),
    ...(newLabel !== undefined && { label: newLabel }),
    ...(newLabelFinal !== undefined && { labelFinal: newLabelFinal }),
  } as Prisma.ProjectUpdateManyMutationInput;
}

export async function POST(request: NextRequest) {
  try {
    const { session, error } = await requireAuth({
      requireUserId: true,
      onAnonymous: () => createUnauthorizedResponse('Non autorisé'),
    });
    if (error) return error;

    const body: BatchUpdateBody = await request.json();
    const { projectIds, requestId, confirmationId, pushDeadlineBy, newDeadline } = body;
    const userId = session.user.id;
    const logPrefix = requestId ? `[${requestId}]` : '';
    const context: RequestContext = { body, userId, logPrefix };

    const rejection = (await checkIdempotency(context)) ?? (await checkConcurrency(context));
    if (rejection) return rejection;

    if (!hasModification(body)) {
      return createBadRequestResponse(
        'Aucune modification spécifiée. Fournissez au moins newProgress, newStatus, newDeadline, pushDeadlineBy, newCollab, newStyle, newLabel ou newLabelFinal.'
      );
    }

    // Refuser les requêtes sans scope (pas d'IDs, pas de filtre)
    if (!hasIds(projectIds) && !hasAnyFilter(body)) {
      logger.error(`[Batch Update API] ${logPrefix} ❌ Refus: scope vide`, { requestId });
      return createBadRequestResponse(
        "Refus: scope vide (pas d'ids, pas de filtre). Fournissez soit projectIds, soit au moins un filtre."
      );
    }

    const where = buildWhere(body, userId);
    if (pushDeadlineBy !== undefined) return await pushDeadlines(context, where, pushDeadlineBy);

    const data = buildUpdateData(body);
    if (newDeadline !== undefined) {
      const deadline = parseNewDeadline(newDeadline);
      if (deadline === undefined) {
        return createBadRequestResponse(
          `Format de date invalide "${newDeadline}". Utilisez YYYY-MM-DD ou une date relative.`
        );
      }
      data.deadline = deadline;
    }

    const result = await withConfirmation(context, (client) =>
      client.project.updateMany({ where, data })
    );

    logger.debug(`[Batch Update API] ${logPrefix} ✅ Résultat:`, {
      requestId,
      confirmationId,
      countUpdated: result.count,
      dataKeys: Object.keys(data),
    });

    invalidateProjectsCache(userId);
    const message =
      result.count > 0
        ? `Mise à jour réussie pour ${result.count} projet(s).`
        : 'Aucun projet ne correspond aux critères.';
    return createSuccessResponse({ count: result.count, message }, 200, message);
  } catch (error) {
    return handleApiError(error, 'POST /api/projects/batch-update');
  }
}
