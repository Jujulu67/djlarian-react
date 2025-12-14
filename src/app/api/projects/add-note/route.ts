import { NextRequest } from 'next/server';
import { revalidateTag } from 'next/cache';

import { auth } from '@/auth';
import { handleApiError } from '@/lib/api/errorHandler';
import {
  createSuccessResponse,
  createBadRequestResponse,
  createUnauthorizedResponse,
} from '@/lib/api/responseHelpers';
import { findProjectByName } from '@/lib/assistant/tools/tool-helpers';
import { generateNoteFromContent } from '@/lib/assistant/parsers/note-generator';
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

// POST /api/projects/add-note - Ajoute une note à un projet spécifique
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return createUnauthorizedResponse('Non autorisé');
    }

    const body = await request.json();
    const { projectName, newNote } = body;

    // Valider les paramètres
    if (!projectName || !newNote) {
      return createBadRequestResponse('Les paramètres projectName et newNote sont requis.');
    }

    // Trouver le projet par nom (matching fuzzy)
    const projectMatch = await findProjectByName(projectName, session.user.id);

    if (!projectMatch) {
      // Chercher des suggestions de projets similaires
      const allProjects = await prisma.project.findMany({
        where: { userId: session.user.id },
        select: { name: true },
        take: 10,
      });

      const suggestions = allProjects
        .map((p) => p.name)
        .slice(0, 5)
        .join(', ');

      return createBadRequestResponse(
        `Aucun projet trouvé correspondant à "${projectName}".${
          suggestions ? ` Projets disponibles : ${suggestions}` : ''
        }`
      );
    }

    // Récupérer le projet complet avec sa note actuelle
    const existingProject = await prisma.project.findUnique({
      where: { id: projectMatch.project.id },
      select: { note: true },
    });

    // Générer la nouvelle note avec le template
    const generatedNote = generateNoteFromContent(newNote);

    // Préfixer la nouvelle note AVANT la note existante (notes plus récentes en premier)
    const updatedNote = existingProject?.note
      ? `${generatedNote}\n\n---\n\n${existingProject.note}`
      : generatedNote;

    // Mettre à jour le projet avec la nouvelle note
    await prisma.project.update({
      where: { id: projectMatch.project.id },
      data: { note: updatedNote },
    });

    // Invalider le cache après modification
    invalidateProjectsCache(session.user.id);

    return createSuccessResponse(
      {
        count: 1,
        message: `Note ajoutée au projet "${projectMatch.project.name}".`,
        projectId: projectMatch.project.id,
        projectName: projectMatch.project.name,
      },
      200,
      `Note ajoutée au projet "${projectMatch.project.name}".`
    );
  } catch (error) {
    return handleApiError(error, 'POST /api/projects/add-note');
  }
}
