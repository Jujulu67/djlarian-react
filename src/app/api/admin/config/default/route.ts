import { NextResponse } from 'next/server';

import { defaultConfigs } from '@/config/defaults';
import { logger } from '@/lib/logger';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/api/requireAuth';

// Endpoint pour récupérer les configurations par défaut
export async function GET() {
  try {
    // Vérifier que l'utilisateur est admin
    const { session, error: authError } = await requireAdmin({ nonAdminStatus: 401 });
    if (authError) return authError;

    // Transformer les valeurs pour qu'elles soient au bon format (booléens, nombres, etc.)
    const processedConfig: Record<string, Record<string, any>> = {};

    // Traiter chaque section
    Object.keys(defaultConfigs).forEach((section) => {
      processedConfig[section] = {};

      // Pour chaque clé dans la section
      const sectionData = defaultConfigs[section as keyof typeof defaultConfigs];
      Object.keys(sectionData).forEach((key) => {
        const value = sectionData[key as keyof typeof sectionData];

        if (value === 'true' || value === 'false') {
          processedConfig[section][key] = value === 'true';
        } else if (!isNaN(Number(value)) && value !== '') {
          processedConfig[section][key] = Number(value);
        } else {
          processedConfig[section][key] = value;
        }
      });
    });

    return NextResponse.json(processedConfig, { status: 200 });
  } catch (error) {
    logger.error('Erreur lors de la récupération des configurations par défaut:', error);
    return NextResponse.json(
      { error: 'Erreur serveur lors de la récupération des configurations par défaut' },
      { status: 500 }
    );
  }
}
