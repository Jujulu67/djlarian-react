import * as Sentry from '@sentry/nextjs';

/**
 * Point d'entrée d'instrumentation de Next.js : charge la configuration Sentry du runtime
 * courant. Sans ce fichier, `sentry.server.config.ts` et `sentry.edge.config.ts` ne sont
 * jamais exécutés et aucune erreur serveur n'est remontée.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('../sentry.server.config');
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('../sentry.edge.config');
  }
}

// Remonte les erreurs des Server Components, route handlers et server actions
export const onRequestError = Sentry.captureRequestError;
