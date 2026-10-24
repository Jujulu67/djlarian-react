import { NextRequest } from 'next/server';

import { handleApiError } from '@/lib/api/errorHandler';
import { createSuccessResponse, createUnauthorizedResponse } from '@/lib/api/responseHelpers';
import {
  checkAllUserMilestones,
  checkProjectMilestones,
} from '@/lib/utils/checkMilestoneNotifications';
import { requireAuth } from '@/lib/api/requireAuth';

/**
 * GET /api/projects/milestones/check
 * Vérifie et crée les notifications pour les jalons dépassés
 * Query params optionnels:
 * - projectId: vérifier un projet spécifique
 */
export async function GET(request: NextRequest) {
  try {
    const { session, error } = await requireAuth({
      requireUserId: true,
      onAnonymous: () => createUnauthorizedResponse('Non autorisé'),
    });
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    let result;

    if (projectId) {
      // Vérifier un projet spécifique
      result = await checkProjectMilestones(projectId, session.user.id);
    } else {
      // Vérifier tous les projets de l'utilisateur
      result = await checkAllUserMilestones(session.user.id);
    }

    return createSuccessResponse(result, 200, 'Vérification terminée');
  } catch (error) {
    return handleApiError(error, 'GET /api/projects/milestones/check');
  }
}
