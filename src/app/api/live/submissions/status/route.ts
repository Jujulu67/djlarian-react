import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { createSuccessResponse } from '@/lib/api/responseHelpers';
import { handleApiError } from '@/lib/api/errorHandler';

/**
 * GET /api/live/submissions/status
 * Vérifie si les soumissions sont activées (route publique)
 */
export async function GET(request: NextRequest) {
  try {
    const trackSubmissionsSetting = await prisma.adminSettings.findUnique({
      where: { key: 'trackSubmissions' },
    });

    const trackSubmissions = trackSubmissionsSetting
      ? JSON.parse(trackSubmissionsSetting.value)
      : true; // Par défaut activé

    return createSuccessResponse({ trackSubmissions }, 200, 'Statut récupéré');
  } catch (error) {
    return handleApiError(error, 'GET /api/live/submissions/status');
  }
}
