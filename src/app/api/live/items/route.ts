import { NextRequest, NextResponse } from 'next/server';

import { logger } from '@/lib/logger';
import prisma from '@/lib/prisma';
import { createSuccessResponse, createUnauthorizedResponse } from '@/lib/api/responseHelpers';
import { handleApiError } from '@/lib/api/errorHandler';
import { requireAuth } from '@/lib/api/requireAuth';

/**
 * GET /api/live/items
 * Récupère le catalogue des items disponibles
 */
export async function GET(request: NextRequest) {
  try {
    const { error } = await requireAuth({
      requireUserId: true,
      onAnonymous: () => createUnauthorizedResponse('Non authentifié'),
    });
    if (error) return error;

    const items = await prisma.liveItem.findMany({
      where: {
        isActive: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    return createSuccessResponse(items, 200, 'Items récupérés');
  } catch (error) {
    return handleApiError(error, 'GET /api/live/items');
  }
}
