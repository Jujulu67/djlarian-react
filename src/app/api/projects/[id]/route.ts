import { NextRequest } from 'next/server';
import { revalidateTag } from 'next/cache';

import { auth } from '@/auth';
import { handleApiError } from '@/lib/api/errorHandler';
import {
  createSuccessResponse,
  createUnauthorizedResponse,
  createForbiddenResponse,
  createNotFoundResponse,
} from '@/lib/api/responseHelpers';
import prisma from '@/lib/prisma';
import { serializeProject } from '@/lib/utils/serializeProject';

// Fonction helper pour invalider le cache des projets d'un utilisateur
function invalidateProjectsCache(userId: string) {
  revalidateTag(`projects-${userId}`);
  revalidateTag(`projects-counts-${userId}`);
  revalidateTag(`projects-statistics-${userId}`);
}

type RouteContext = {
  params: Promise<{ id: string }>;
};

// GET /api/projects/[id] - Récupère un projet spécifique
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return createUnauthorizedResponse('Non autorisé');
    }

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
    const session = await auth();

    if (!session?.user?.id) {
      return createUnauthorizedResponse('Non autorisé');
    }

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

    // Construire les données de mise à jour dynamiquement
    const updateData: Record<string, unknown> = {};

    const stringFields = [
      'name',
      'style',
      'status',
      'collab',
      'label',
      'labelFinal',
      'externalLink',
    ];
    const intFields = [
      'order',
      'streamsJ7',
      'streamsJ14',
      'streamsJ21',
      'streamsJ28',
      'streamsJ56',
      'streamsJ84',
    ];

    for (const field of stringFields) {
      if (field in body) {
        const value = body[field];
        updateData[field] = value === '' ? null : typeof value === 'string' ? value.trim() : value;
      }
    }

    for (const field of intFields) {
      if (field in body) {
        const value = body[field];
        if (value === '' || value === null) {
          updateData[field] = null;
        } else {
          const parsed = parseInt(value, 10);
          updateData[field] = isNaN(parsed) ? null : parsed;
        }
      }
    }

    if ('releaseDate' in body) {
      updateData.releaseDate = body.releaseDate ? new Date(body.releaseDate) : null;
    }

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
    const session = await auth();

    if (!session?.user?.id) {
      return createUnauthorizedResponse('Non autorisé');
    }

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

    const userId = existingProject.userId;

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
