import { NextRequest, NextResponse } from 'next/server';

import { logger } from '@/lib/logger';
import prisma from '@/lib/prisma';
import { defaultConfigs } from '@/config/defaults';

/**
 * GET /api/config/umami
 * Récupère la configuration Umami depuis la DB (pour usage local)
 */
export async function GET(req: NextRequest) {
  try {
    // Récupérer la configuration Umami depuis la DB
    const configs = await prisma.siteConfig.findMany({
      where: { section: 'api' },
    });

    const umamiConfig = {
      umamiEnabled: defaultConfigs.api.umamiEnabled,
      umamiSiteId: defaultConfigs.api.umamiSiteId,
    };

    configs.forEach((config) => {
      if (config.key === 'umamiEnabled') {
        umamiConfig.umamiEnabled = config.value === 'true';
      } else if (config.key === 'umamiSiteId') {
        umamiConfig.umamiSiteId = config.value || defaultConfigs.api.umamiSiteId;
      }
    });

    return NextResponse.json(umamiConfig, { status: 200 });
  } catch (error) {
    logger.error('Erreur lors de la récupération de la config Umami:', error);
    // Retourner les valeurs par défaut en cas d'erreur
    return NextResponse.json(
      {
        umamiEnabled: defaultConfigs.api.umamiEnabled,
        umamiSiteId: defaultConfigs.api.umamiSiteId,
      },
      { status: 200 }
    );
  }
}
