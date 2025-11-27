import { NextRequest } from 'next/server';

import { auth } from '@/auth';
import { handleApiError } from '@/lib/api/errorHandler';
import {
  createSuccessResponse,
  createBadRequestResponse,
  createUnauthorizedResponse,
} from '@/lib/api/responseHelpers';
import prisma from '@/lib/prisma';
import { serializeProjects } from '@/lib/utils/serializeProject';

// PATCH /api/projects/reorder - Met à jour l'ordre de plusieurs projets
export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return createUnauthorizedResponse('Non autorisé');
    }

    const body = await request.json();
    const { projectOrders } = body;

    if (!Array.isArray(projectOrders)) {
      return createBadRequestResponse('Un tableau projectOrders est requis');
    }

    // Vérifier que tous les projets appartiennent à l'utilisateur
    const projectIds = projectOrders.map((po: { id: string }) => po.id);
    const userProjects = await prisma.project.findMany({
      where: {
        id: { in: projectIds },
        userId: session.user.id,
      },
      select: { id: true },
    });

    const userProjectIds = new Set(userProjects.map((p) => p.id));
    const invalidProjects = projectIds.filter((id: string) => !userProjectIds.has(id));

    if (invalidProjects.length > 0) {
      return createBadRequestResponse(
        `Certains projets n'existent pas ou ne vous appartiennent pas: ${invalidProjects.join(', ')}`
      );
    }

    // Mettre à jour l'ordre de tous les projets en une transaction
    await prisma.$transaction(
      projectOrders.map((po: { id: string; order: number }) =>
        prisma.project.update({
          where: { id: po.id },
          data: { order: po.order },
        })
      )
    );

    // Récupérer les projets mis à jour
    const updatedProjects = await prisma.project.findMany({
      where: {
        id: { in: projectIds },
      },
      include: {
        User: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    });

    const serializedProjects = serializeProjects(updatedProjects);
    return createSuccessResponse(
      serializedProjects,
      200,
      'Ordre des projets mis à jour avec succès'
    );
  } catch (error) {
    return handleApiError(error, 'PATCH /api/projects/reorder');
  }
}
