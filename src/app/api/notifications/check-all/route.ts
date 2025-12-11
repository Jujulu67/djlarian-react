import { NextRequest } from 'next/server';

import { auth } from '@/auth';
import { handleApiError } from '@/lib/api/errorHandler';
import { createSuccessResponse, createUnauthorizedResponse } from '@/lib/api/responseHelpers';
import { checkAllUserMilestones } from '@/lib/utils/checkMilestoneNotifications';
import { checkAllUserUpcomingReleases } from '@/lib/utils/checkUpcomingReleases';
import { checkAllUserUpcomingDeadlines } from '@/lib/utils/checkUpcomingDeadlines';

/**
 * GET /api/notifications/check-all
 * Vérifie et crée toutes les notifications (jalons + releases + deadlines) de manière optimisée
 * Charge uniquement les dates nécessaires
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return createUnauthorizedResponse('Non autorisé');
    }

    // Vérifier les trois types de notifications en parallèle
    const [milestonesResult, releasesResult, deadlinesResult] = await Promise.all([
      checkAllUserMilestones(session.user.id),
      checkAllUserUpcomingReleases(session.user.id),
      checkAllUserUpcomingDeadlines(session.user.id),
    ]);

    return createSuccessResponse(
      {
        milestones: milestonesResult,
        releases: releasesResult,
        deadlines: deadlinesResult,
        totalCreated: milestonesResult.created + releasesResult.created + deadlinesResult.created,
      },
      200,
      'Vérification terminée'
    );
  } catch (error) {
    return handleApiError(error, 'GET /api/notifications/check-all');
  }
}
