import { NextRequest } from 'next/server';
import { revalidateTag } from 'next/cache';

import { handleApiError } from '@/lib/api/errorHandler';
import {
  createSuccessResponse,
  createUnauthorizedResponse,
  createForbiddenResponse,
  createNotFoundResponse,
  createBadRequestResponse,
} from '@/lib/api/responseHelpers';
import prisma from '@/lib/prisma';
import { serializeProject } from '@/lib/utils/serializeProject';
import { requireAuth } from '@/lib/api/requireAuth';

// Fonction helper pour invalider le cache des projets d'un utilisateur
function invalidateProjectsCache(userId: string) {
  // @ts-expect-error - revalidateTag prend un seul argument (tag) mais les types Next.js peuvent être incorrects
  revalidateTag(`projects-${userId}`);
  // @ts-expect-error - revalidateTag prend un seul argument (tag) mais les types Next.js peuvent être incorrects
  revalidateTag(`projects-counts-${userId}`);
  // @ts-expect-error - revalidateTag prend un seul argument (tag) mais les types Next.js peuvent être incorrects
  revalidateTag(`projects-statistics-${userId}`);
}

type RouteContext = {
  params: Promise<{ id: string }>;
};

const STRING_FIELDS = ['name', 'style', 'status', 'collab', 'label', 'labelFinal', 'note'];
const STREAM_FIELDS = [
  'streamsJ7',
  'streamsJ14',
  'streamsJ21',
  'streamsJ28',
  'streamsJ56',
  'streamsJ84',
  'streamsJ180',
  'streamsJ365',
];
const MAX_INT32 = 2147483647;
const INVALID_URL = Symbol('invalid-url');

/** Entier saisi, ou null si la valeur est vide ou n'est pas un nombre. */
function parseIntOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = typeof value === 'number' ? value : Number.parseInt(String(value), 10);
  return Number.isNaN(parsed) ? null : parsed;
}

/** Nombre de streams : positif et tenant dans un entier 32 bits. */
function parseStreamValue(value: unknown): number | null {
  const parsed = parseIntOrNull(value);
  return parsed === null || parsed < 0 || parsed > MAX_INT32 ? null : parsed;
}

/** Avancement : de 0 à 100. */
function parseProgressValue(value: unknown): number | null {
  const parsed = parseIntOrNull(value);
  return parsed === null || parsed < 0 || parsed > 100 ? null : parsed;
}

function parseStringField(value: unknown): unknown {
  if (value === '') return null;
  return typeof value === 'string' ? value.trim() : value;
}

/** Lien externe nettoyé, null si vide, INVALID_URL si l'URL n'est pas valide. */
async function parseExternalLink(value: unknown): Promise<unknown> {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  if (trimmed === '') return null;
  const { isValidUrl, sanitizeUrl } = await import('@/lib/utils/validateUrl');
  return isValidUrl(trimmed, false) ? sanitizeUrl(trimmed) : INVALID_URL;
}

/** Ne garde que les champs présents dans la requête, chacun validé selon son type. */
function buildUpdateData(body: Record<string, unknown>): Record<string, unknown> {
  const parsers: Record<string, (value: unknown) => unknown> = {
    order: parseIntOrNull,
    progress: parseProgressValue,
    releaseDate: (value) => (value ? new Date(value as string) : null),
    deadline: (value) => (value ? new Date(value as string) : null),
  };
  for (const field of STRING_FIELDS) parsers[field] = parseStringField;
  for (const field of STREAM_FIELDS) parsers[field] = parseStreamValue;

  const updateData: Record<string, unknown> = {};
  for (const [field, parse] of Object.entries(parsers)) {
    if (field in body) updateData[field] = parse(body[field]);
  }
  return updateData;
}

/** Un projet TERMINE a toujours 100 % d'avancement, sauf si la requête en demande un autre. */
function keepProgressConsistent(updateData: Record<string, unknown>, currentStatus: string | null) {
  if ('status' in updateData) {
    if (updateData.status === 'TERMINE') updateData.progress = 100;
    return;
  }
  if (currentStatus === 'TERMINE' && !('progress' in updateData)) {
    updateData.progress = 100;
  }
}

// GET /api/projects/[id] - Récupère un projet spécifique
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { session, error } = await requireAuth({
      requireUserId: true,
      onAnonymous: () => createUnauthorizedResponse('Non autorisé'),
    });
    if (error) return error;

    const { id } = await context.params;

    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        User: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!project) {
      return createNotFoundResponse('Projet non trouvé');
    }

    // Vérifier l'accès : propriétaire ou admin
    if (project.userId !== session.user.id && session.user.role !== 'ADMIN') {
      return createForbiddenResponse('Accès refusé');
    }

    const serializedProject = serializeProject(project);
    return createSuccessResponse(serializedProject);
  } catch (error) {
    return handleApiError(error, 'GET /api/projects/[id]');
  }
}

// PATCH /api/projects/[id] - Met à jour un projet
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { session, error } = await requireAuth({
      requireUserId: true,
      onAnonymous: () => createUnauthorizedResponse('Non autorisé'),
    });
    if (error) return error;

    const { id } = await context.params;

    // Vérifier que le projet existe et appartient à l'utilisateur
    const existingProject = await prisma.project.findUnique({
      where: { id },
    });

    if (!existingProject) {
      return createNotFoundResponse('Projet non trouvé');
    }

    // Seul le propriétaire peut modifier (pas l'admin pour respecter la vie privée)
    if (existingProject.userId !== session.user.id) {
      return createForbiddenResponse('Accès refusé');
    }

    const body = await request.json();

    const externalLink = 'externalLink' in body ? await parseExternalLink(body.externalLink) : null;
    if (externalLink === INVALID_URL) {
      return createBadRequestResponse("L'URL externe fournie n'est pas valide");
    }

    const updateData = buildUpdateData(body);
    if ('externalLink' in body) updateData.externalLink = externalLink;
    keepProgressConsistent(updateData, existingProject.status);

    const project = await prisma.project.update({
      where: { id },
      data: updateData,
      include: {
        User: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    const serializedProject = serializeProject(project);

    // Invalider le cache après mise à jour
    invalidateProjectsCache(existingProject.userId);

    return createSuccessResponse(serializedProject, 200, 'Projet mis à jour avec succès');
  } catch (error) {
    return handleApiError(error, 'PATCH /api/projects/[id]');
  }
}

// DELETE /api/projects/[id] - Supprime un projet
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { session, error } = await requireAuth({
      requireUserId: true,
      onAnonymous: () => createUnauthorizedResponse('Non autorisé'),
    });
    if (error) return error;

    const { id } = await context.params;

    // Vérifier que le projet existe et appartient à l'utilisateur
    const existingProject = await prisma.project.findUnique({
      where: { id },
    });

    if (!existingProject) {
      return createNotFoundResponse('Projet non trouvé');
    }

    // Seul le propriétaire peut supprimer
    if (existingProject.userId !== session.user.id) {
      return createForbiddenResponse('Accès refusé');
    }

    const { userId } = existingProject;

    await prisma.project.delete({
      where: { id },
    });

    // Invalider le cache après suppression
    invalidateProjectsCache(userId);

    return createSuccessResponse({ success: true }, 200, 'Projet supprimé avec succès');
  } catch (error) {
    return handleApiError(error, 'DELETE /api/projects/[id]');
  }
}
