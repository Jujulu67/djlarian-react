import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  eslint: {
    // Désactiver ESLint pendant le build pour éviter les erreurs de compatibilité
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Continuer le build même s'il y a des erreurs TypeScript (pour le moment)
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
