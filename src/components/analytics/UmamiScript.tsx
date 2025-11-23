'use client';

import Script from 'next/script';

import { logger } from '@/lib/logger';

/**
 * Composant pour intégrer Umami Analytics, une solution d'analyse web légère et respectueuse de la vie privée.
 * @param websiteId - L'identifiant de votre site web dans Umami
 * @param umamiUrl - L'URL de votre instance Umami (par défaut : https://analytics.umami.is/script.js)
 */
export default function UmamiAnalytics({
  websiteId,
  umamiUrl = 'https://analytics.umami.is/script.js',
}: {
  websiteId?: string;
  umamiUrl?: string;
}) {
  // Check 1: Si le websiteId est vide ou la valeur par défaut, on ne charge pas
  if (!websiteId || websiteId === 'your-website-id-here') {
    return null;
  }

  const isLocalhost = umamiUrl?.includes('localhost');
  const isDevelopment = process.env.NODE_ENV === 'development';
  // Permet de forcer le chargement en localhost même en dev (pour tester Umami localement)
  const forceLocalhost = process.env.NEXT_PUBLIC_UMAMI_FORCE_LOCALHOST === 'true';

  // Check 2: Si c'est localhost en prod, on n'affiche pas
  if (isLocalhost && !isDevelopment) {
    logger.warn(
      "L'URL Umami contient 'localhost' en production. Umami est désactivé. Configurez NEXT_PUBLIC_UMAMI_URL avec une URL de production dans Vercel."
    );
    return null;
  }

  // Check 3: Si c'est localhost en dev et que le serveur n'est pas forcé, ne pas charger
  // Cela évite les erreurs ERR_CONNECTION_REFUSED si Umami n'est pas en cours d'exécution
  if (isLocalhost && isDevelopment && !forceLocalhost) {
    logger.debug(
      `Umami Analytics désactivé en localhost (dev). Pour l'activer, définissez NEXT_PUBLIC_UMAMI_FORCE_LOCALHOST=true`
    );
    return null;
  }

  return (
    <Script
      async
      data-website-id={websiteId}
      src={umamiUrl}
      data-do-not-track="true" // Active le respect de l'option "Do Not Track" des navigateurs
      strategy="lazyOnload" // Chargement différé pour éviter les erreurs de préchargement
      onError={(e) => {
        // Gérer l'erreur silencieusement si le script ne peut pas être chargé
        logger.debug(
          'Erreur lors du chargement du script Umami (serveur peut-être indisponible):',
          e
        );
      }}
    />
  );
}
