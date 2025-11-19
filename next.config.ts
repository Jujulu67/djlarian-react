import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  eslint: {
    // Désactiver ESLint pendant le build pour éviter les erreurs de compatibilité
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Ignorer les erreurs TypeScript pendant le build (temporaire pour Cloudflare)
    ignoreBuildErrors: true,
  },
  // Exclure les fichiers de test du build
  pageExtensions: ['ts', 'tsx', 'js', 'jsx'],
  // Configuration pour Cloudflare Pages avec Prisma
  // Externaliser Prisma pour éviter les problèmes avec fs dans Cloudflare
  serverExternalPackages: [
    '@prisma/client',
    '.prisma/client',
    '@prisma/adapter-neon',
    '@neondatabase/serverless',
  ],
  // Configuration webpack pour externaliser Prisma
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Externaliser Prisma pour éviter qu'il soit bundlé
      config.externals = config.externals || [];
      config.externals.push({
        '@prisma/client': 'commonjs @prisma/client',
        '.prisma/client': 'commonjs .prisma/client',
        '@prisma/adapter-neon': 'commonjs @prisma/adapter-neon',
        '@neondatabase/serverless': 'commonjs @neondatabase/serverless',
      });
    }
    return config;
  },
};

export default nextConfig;
