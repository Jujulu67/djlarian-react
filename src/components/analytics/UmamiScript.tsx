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
  websiteId: string;
  umamiUrl?: string;
}) {
  // Check 1: Si le websiteId est vide ou la valeur par défaut, on ne charge pas
  if (!websiteId || websiteId === 'your-website-id-here') {
    return null;
  }

  const isLocalhost = umamiUrl.includes('localhost');
  const isDevelopment = process.env.NODE_ENV === 'development';

  // Check 2: Si c'est localhost en prod, on n'affiche pas (ne devrait pas s'appliquer en dev)
  if (isLocalhost && !isDevelopment) {
    logger.warn(
      "L'URL Umami contient 'localhost', ce qui peut causer des problèmes de préchargement."
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
    />
  );
}
