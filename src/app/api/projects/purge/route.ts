import { NextRequest } from 'next/server';
import { revalidateTag } from 'next/cache';

import { auth } from '@/auth';
import { handleApiError } from '@/lib/api/errorHandler';
import { createSuccessResponse, createUnauthorizedResponse } from '@/lib/api/responseHelpers';
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

// DELETE /api/projects/purge - Supprime tous les projets de l'utilisateur connecté
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return createUnauthorizedResponse('Non autorisé');
    }

    // Supprimer tous les projets de l'utilisateur
    const result = await prisma.project.deleteMany({
      where: {
        userId: session.user.id,
      },
    });

    // Invalider le cache après purge
    invalidateProjectsCache(session.user.id);

    return createSuccessResponse(
      { deletedCount: result.count },
      200,
      `${result.count} projet(s) supprimé(s) avec succès`
    );
  } catch (error) {
    return handleApiError(error, 'DELETE /api/projects/purge');
  }
}
