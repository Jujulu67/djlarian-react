import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { createUnauthorizedResponse, createSuccessResponse } from '@/lib/api/responseHelpers';
import { handleApiError } from '@/lib/api/errorHandler';
import prisma from '@/lib/prisma';
import { logger } from '@/lib/logger';

/**
 * GET /api/admin/live/settings
 * Récupère les paramètres admin
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== 'ADMIN') {
      return createUnauthorizedResponse('Non autorisé');
    }

    const settings = await prisma.adminSettings.findMany();

    // Convertir en objet avec les clés comme propriétés
    const settingsMap: Record<string, any> = {};
    for (const setting of settings) {
      try {
        settingsMap[setting.key] = JSON.parse(setting.value);
      } catch {
        settingsMap[setting.key] = setting.value;
      }
    }

    // Valeurs par défaut si elles n'existent pas
    const defaultSettings = {
      trackSubmissions: true,
      downloadsEnabled: true,
      koolKids: false,
      genreBlend: true,
    };

    const result = { ...defaultSettings, ...settingsMap };

    return createSuccessResponse(result, 200, 'Paramètres récupérés');
  } catch (error) {
    return handleApiError(error, 'GET /api/admin/live/settings');
  }
}

/**
 * PATCH /api/admin/live/settings
 * Met à jour un paramètre admin
 */
export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== 'ADMIN') {
      return createUnauthorizedResponse('Non autorisé');
    }

    const body = await request.json();
    const { key, value } = body;

    if (!key || value === undefined) {
      return NextResponse.json({ error: 'key et value requis' }, { status: 400 });
    }

    // Convertir la valeur en JSON string
    const valueString = typeof value === 'string' ? value : JSON.stringify(value);

    // Upsert le paramètre
    await prisma.adminSettings.upsert({
      where: { key },
      update: { value: valueString },
      create: { key, value: valueString },
    });

    logger.debug(`[Admin Settings] ${key} mis à jour: ${valueString}`);

    return createSuccessResponse({ key, value }, 200, 'Paramètre mis à jour');
  } catch (error) {
    return handleApiError(error, 'PATCH /api/admin/live/settings');
  }
}
