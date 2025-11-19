export default {
  default: {
    override: {
      wrapper: 'cloudflare-node',
      converter: 'edge',
      proxyExternalRequest: 'fetch',
      incrementalCache: 'dummy',
      tagCache: 'dummy',
      queue: 'dummy',
    },
    // Ne pas externaliser Prisma pour que le bundling fonctionne avec nos alias/polyfills
    external: [],
  },
  edgeExternals: ['node:crypto', 'node:os', 'node:path'], // Retrait de node:fs pour forcer l'usage de notre polyfill
  middleware: {
    external: true,
    override: {
      wrapper: 'cloudflare-edge',
      converter: 'edge',
      proxyExternalRequest: 'fetch',
      incrementalCache: 'dummy',
      tagCache: 'dummy',
      queue: 'dummy',
    },
  },
};
