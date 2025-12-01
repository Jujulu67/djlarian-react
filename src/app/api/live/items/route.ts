import { NextRequest, NextResponse } from 'next/server';

import { auth } from '@/auth';
import { logger } from '@/lib/logger';
import prisma from '@/lib/prisma';
import { createSuccessResponse, createUnauthorizedResponse } from '@/lib/api/responseHelpers';
import { handleApiError } from '@/lib/api/errorHandler';

/**
 * GET /api/live/items
 * Récupère le catalogue des items disponibles
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return createUnauthorizedResponse('Non authentifié');
    }

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
