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
import { checkProjectMilestones } from '@/lib/utils/checkMilestoneNotifications';

// Fonction helper pour invalider le cache des projets d'un utilisateur
function invalidateProjectsCache(userId: string) {
  // @ts-expect-error - revalidateTag prend un seul argument (tag) mais les types Next.js peuvent être incorrects
  revalidateTag(`projects-${userId}`);
  // @ts-expect-error - revalidateTag prend un seul argument (tag) mais les types Next.js peuvent être incorrects
  revalidateTag(`projects-counts-${userId}`);
  // @ts-expect-error - revalidateTag prend un seul argument (tag) mais les types Next.js peuvent être incorrects
  revalidateTag(`projects-statistics-${userId}`);
}

interface StreamsMilestones {
  streamsJ7: number | null;
  streamsJ14: number | null;
  streamsJ21: number | null;
  streamsJ28: number | null;
  streamsJ56: number | null;
  streamsJ84: number | null;
  streamsJ180: number | null;
  streamsJ365: number | null;
}

interface ImportStreamsRequest {
  projectId: string;
  milestones: StreamsMilestones;
}

interface ImportResult {
  success: boolean;
  updated: number;
  failed: number;
  errors?: Array<{ fileName: string; error: string }>;
}

// POST /api/projects/streams/import - Importe les streams pour plusieurs projets
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return createUnauthorizedResponse('Non autorisé');
    }

    // Vérifier que l'utilisateur existe bien dans la base de données
    const userExists = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true },
    });

    if (!userExists) {
      return createUnauthorizedResponse(
        "L'utilisateur de la session n'existe pas dans la base de données. Veuillez vous reconnecter."
      );
    }

    const body = await request.json();
    const { imports }: { imports: ImportStreamsRequest[] } = body;

    if (!Array.isArray(imports) || imports.length === 0) {
      return createBadRequestResponse("Un tableau d'imports est requis");
    }

    if (imports.length > 50) {
      return createBadRequestResponse('Maximum 50 imports par requête');
    }

    const result: ImportResult = {
      success: true,
      updated: 0,
      failed: 0,
      errors: [],
    };

    // Traiter chaque import dans une transaction
    for (const importData of imports) {
      try {
        // Vérifier que le projet existe et appartient à l'utilisateur
        const project = await prisma.project.findFirst({
          where: {
            id: importData.projectId,
            userId: session.user.id,
          },
        });

        if (!project) {
          result.failed++;
          result.errors?.push({
            fileName: importData.projectId,
            error: 'Projet non trouvé ou non autorisé',
          });
          continue;
        }

        // Vérifier que le projet a une date de release
        if (!project.releaseDate) {
          result.failed++;
          result.errors?.push({
            fileName: project.name,
            error: "Le projet n'a pas de date de release",
          });
          continue;
        }

        // Mettre à jour les streams
        await prisma.project.update({
          where: {
            id: importData.projectId,
          },
          data: {
            streamsJ7: importData.milestones.streamsJ7,
            streamsJ14: importData.milestones.streamsJ14,
            streamsJ21: importData.milestones.streamsJ21,
            streamsJ28: importData.milestones.streamsJ28,
            streamsJ56: importData.milestones.streamsJ56,
            streamsJ84: importData.milestones.streamsJ84,
            streamsJ180: importData.milestones.streamsJ180,
            streamsJ365: importData.milestones.streamsJ365,
          },
        });

        // Vérifier et créer les notifications de jalons pour ce projet
        try {
          await checkProjectMilestones(importData.projectId, session.user.id);
        } catch (notificationError) {
          // Ne pas faire échouer l'import si la vérification de notifications échoue
          console.error('Erreur lors de la vérification des notifications:', notificationError);
        }

        // Vérifier et créer les notifications de releases en approche
        try {
          const { checkProjectUpcomingRelease } = await import('@/lib/utils/checkUpcomingReleases');
          await checkProjectUpcomingRelease(importData.projectId, session.user.id);
        } catch (notificationError) {
          // Ne pas faire échouer l'import si la vérification de notifications échoue
          console.error(
            'Erreur lors de la vérification des releases en approche:',
            notificationError
          );
        }

        result.updated++;
      } catch (error) {
        result.failed++;
        result.errors?.push({
          fileName: importData.projectId,
          error: error instanceof Error ? error.message : 'Erreur inconnue',
        });
      }
    }

    // Invalider le cache
    invalidateProjectsCache(session.user.id);

    if (result.failed > 0 && result.updated === 0) {
      result.success = false;
    }

    return createSuccessResponse(result, 200, 'Import terminé');
  } catch (error) {
    return handleApiError(error, 'POST /api/projects/streams/import');
  }
}
