import { defaultConfigs } from '@/config/defaults';
import { logger } from '@/lib/logger';
import prisma from '@/lib/prisma';
import { isNotEmpty } from '@/lib/utils/arrayHelpers';
import { HomepageConfig } from '@/types/config';

/**
 * Récupère la configuration de la page d'accueil depuis la DB ou retourne les valeurs par défaut
 * Cette fonction peut être utilisée côté serveur pour précharger les données
 */
export async function getHomepageConfig(): Promise<HomepageConfig> {
  try {
    // Vérifier si les tables nécessaires existent et sont accessibles
    let areTablesReady = true;
    try {
      await prisma.siteConfig.count();
    } catch (tableError) {
      areTablesReady = false;
    }

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
        return {
          ...defaultConfigs.homepage,
          ...configObject,
        } as HomepageConfig;
      }
    }

    // Aucune config trouvée ou tables non prêtes, utiliser les valeurs par défaut
    return defaultConfigs.homepage;
  } catch (error) {
    logger.error('Erreur lors de la récupération de la configuration homepage', error);
    // En cas d'erreur, retourner les valeurs par défaut
    return defaultConfigs.homepage;
  }
}
