'use client';

import Script from 'next/script';

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
  // Si le websiteId est vide ou "your-website-id-here", on ne charge pas le script
  if (!websiteId || websiteId === 'your-website-id-here') {
    return null;
  }

  // Vérifier si l'URL est valide et ne contient pas localhost
  if (umamiUrl.includes('localhost')) {
    console.warn(
      "L'URL Umami contient 'localhost', ce qui peut causer des problèmes de préchargement."
    );
    return null;
  }

  return (
    <Script
      async
      defer
      data-website-id={websiteId}
      src={umamiUrl}
      data-do-not-track="true" // Active le respect de l'option "Do Not Track" des navigateurs
      data-domains="djlarian.com" // Remplacez par votre domaine réel
      strategy="lazyOnload" // Chargement différé pour éviter les erreurs de préchargement
    />
  );
}
