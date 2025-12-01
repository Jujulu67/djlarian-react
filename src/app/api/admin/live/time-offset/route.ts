import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { createUnauthorizedResponse, createSuccessResponse } from '@/lib/api/responseHelpers';
import { handleApiError } from '@/lib/api/errorHandler';
import prisma from '@/lib/prisma';
import { logger } from '@/lib/logger';

/**
 * GET /api/admin/live/time-offset
 * Récupère l'offset de temps simulé
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== 'ADMIN') {
      return createUnauthorizedResponse('Non autorisé');
    }

    const setting = await prisma.adminSettings.findUnique({
      where: { key: 'timeOffsetMinutes' },
    });

    const timeOffsetMinutes = setting ? parseInt(JSON.parse(setting.value) || '0', 10) : 0;

    return createSuccessResponse({ timeOffsetMinutes }, 200, 'Offset de temps récupéré');
  } catch (error) {
    return handleApiError(error, 'GET /api/admin/live/time-offset');
  }
}

/**
 * POST /api/admin/live/time-offset
 * Met à jour l'offset de temps simulé
 * Body: { increment: number } - nombre de minutes à ajouter (peut être négatif)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== 'ADMIN') {
      return createUnauthorizedResponse('Non autorisé');
    }

    const body = await request.json();
    const { increment } = body;

    if (typeof increment !== 'number') {
      return NextResponse.json({ error: 'increment doit être un nombre' }, { status: 400 });
    }

    // Récupérer l'offset actuel
    const currentSetting = await prisma.adminSettings.findUnique({
      where: { key: 'timeOffsetMinutes' },
    });

    const currentOffset = currentSetting
      ? parseInt(JSON.parse(currentSetting.value) || '0', 10)
      : 0;

    // Calculer le nouvel offset
    const newOffset = currentOffset + increment;

    // Sauvegarder le nouvel offset
    await prisma.adminSettings.upsert({
      where: { key: 'timeOffsetMinutes' },
      update: { value: JSON.stringify(newOffset) },
      create: { key: 'timeOffsetMinutes', value: JSON.stringify(newOffset) },
    });

    logger.debug(`[Admin Time Offset] Mis à jour: ${newOffset} minutes (incrément: ${increment})`);

    return createSuccessResponse(
      { timeOffsetMinutes: newOffset },
      200,
      `Temps avancé de ${increment} minutes`
    );
  } catch (error) {
    return handleApiError(error, 'POST /api/admin/live/time-offset');
  }
}

/**
 * DELETE /api/admin/live/time-offset
 * Réinitialise l'offset de temps à 0
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== 'ADMIN') {
      return createUnauthorizedResponse('Non autorisé');
    }

    await prisma.adminSettings.upsert({
      where: { key: 'timeOffsetMinutes' },
      update: { value: JSON.stringify(0) },
      create: { key: 'timeOffsetMinutes', value: JSON.stringify(0) },
    });

    logger.debug('[Admin Time Offset] Réinitialisé à 0');

    return createSuccessResponse({ timeOffsetMinutes: 0 }, 200, 'Offset de temps réinitialisé');
  } catch (error) {
    return handleApiError(error, 'DELETE /api/admin/live/time-offset');
  }
}
