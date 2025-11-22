import { NextResponse } from 'next/server';

import { defaultConfigs } from '@/config/defaults';
import { logger } from '@/lib/logger';
import prisma from '@/lib/prisma';
import { isNotEmpty } from '@/lib/utils/arrayHelpers';
import { HomepageConfig } from '@/types/config';

// API publique pour récupérer la configuration de la page d'accueil
// Accessible sans authentification pour permettre le chargement de la page d'accueil
export async function GET() {
  try {
    // Vérifier si les tables nécessaires existent et sont accessibles
    let areTablesReady = true;
    try {
      await prisma.siteConfig.count();
    } catch (tableError) {
      areTablesReady = false;
    }

    let homepageConfig: HomepageConfig;

    if (areTablesReady) {
      // Récupérer uniquement la section homepage
      const configs = await prisma.siteConfig.findMany({
        where: { section: 'homepage' },
        orderBy: { createdAt: 'asc' },
      });

      if (isNotEmpty(configs)) {
        // Construire l'objet de configuration depuis la base de données
        const configObject: Record<string, string | number | boolean | null> = {};
        configs.forEach((config) => {
          const typedConfig = config as { key: string; value: string | null };
          // Convertir les valeurs en types appropriés
          let value: string | number | boolean | null = typedConfig.value;
          if (typedConfig.value === 'true' || typedConfig.value === 'false') {
            value = typedConfig.value === 'true';
          } else if (
            typedConfig.value !== null &&
            typedConfig.value !== '' &&
            !isNaN(Number(typedConfig.value))
          ) {
            value = Number(typedConfig.value);
          }
          configObject[typedConfig.key] = value;
        });

        // Utiliser la config de la DB si elle existe, sinon les valeurs par défaut
        homepageConfig = {
          ...defaultConfigs.homepage,
          ...configObject,
        } as HomepageConfig;
      } else {
        // Aucune config trouvée, utiliser les valeurs par défaut
        homepageConfig = defaultConfigs.homepage;
      }
    } else {
      // Tables non prêtes, utiliser les valeurs par défaut
      homepageConfig = defaultConfigs.homepage;
    }

    return NextResponse.json(homepageConfig, { status: 200 });
  } catch (error) {
    logger.error('Erreur lors de la récupération de la configuration homepage', error);
    // En cas d'erreur, retourner les valeurs par défaut
    return NextResponse.json(defaultConfigs.homepage, { status: 200 });
  }
}
