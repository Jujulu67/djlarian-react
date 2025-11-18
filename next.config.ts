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
  // Optimisations pour Cloudflare Pages
  // Exclure les fichiers de cache du build
  experimental: {
    outputFileTracingExcludes: {
      '*': [
        'node_modules/@swc/core-*',
        'node_modules/webpack',
        '.next/cache/**/*',
      ],
    },
  },
  // Réduire la taille des chunks
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Optimiser les chunks côté client
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            default: false,
            vendors: false,
            // Créer des chunks plus petits
            framework: {
              name: 'framework',
              chunks: 'all',
              test: /(?<!node_modules.*)[\\/]node_modules[\\/](react|react-dom|scheduler|prop-types|use-subscription)[\\/]/,
              priority: 40,
              enforce: true,
            },
            lib: {
              test(module: any) {
                return (
                  module.size() > 160000 &&
                  /node_modules/.test(module.identifier())
                );
              },
              name(module: any) {
                const hash = require('crypto')
                  .createHash('sha1')
                  .update(module.identifier())
                  .digest('hex')
                  .substring(0, 8);
                return `lib-${hash}`;
              },
              priority: 30,
              minChunks: 1,
              reuseExistingChunk: true,
            },
            commons: {
              name: 'commons',
              minChunks: 2,
              priority: 20,
            },
            shared: {
              name(module: any, chunks: any) {
                return (
                  require('crypto')
                    .createHash('sha1')
                    .update(
                      chunks.reduce((acc: string, chunk: any) => {
                        return acc + chunk.name;
                      }, '')
                    )
                    .digest('hex')
                    .substring(0, 8)
                );
              },
              priority: 10,
              minChunks: 2,
              reuseExistingChunk: true,
            },
          },
        },
      };
    }
    return config;
  },
};

export default nextConfig;
