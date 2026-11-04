/**
 * Content-Security-Policy du site.
 *
 * Elle liste les origines dont le navigateur peut charger scripts, iframes, requêtes, etc.
 * Elle est d'abord servie en mode `Report-Only` : le navigateur ne bloque rien, il signale
 * seulement à Sentry ce qu'il aurait bloqué. Une fois les rapports vides, on pourra passer
 * l'en-tête en `Content-Security-Policy` pour l'appliquer.
 */

export const CSP_HEADER_REPORT_ONLY = 'Content-Security-Policy-Report-Only';

interface CspOptions {
  /** URL du script Umami (NEXT_PUBLIC_UMAMI_URL) */
  umamiUrl?: string;
  /** DSN public Sentry (NEXT_PUBLIC_SENTRY_DSN), sert à construire l'adresse des rapports */
  sentryDsn?: string;
}

function originOf(url: string | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

/**
 * Adresse de rapport CSP de Sentry, dérivée du DSN :
 * https://<clé>@o<org>.ingest.<région>.sentry.io/<projet>
 *   → https://o<org>.ingest.<région>.sentry.io/api/<projet>/security/?sentry_key=<clé>
 */
export function sentryCspReportUri(dsn: string | undefined): string | null {
  if (!dsn) return null;
  try {
    const url = new URL(dsn);
    const projectId = url.pathname.replace(/^\//, '');
    if (!url.username || !projectId) return null;
    return `${url.origin}/api/${projectId}/security/?sentry_key=${url.username}`;
  } catch {
    return null;
  }
}

export function buildCsp({ umamiUrl, sentryDsn }: CspOptions = {}): string {
  // Seule une origine HTTPS est autorisée : une valeur de dev (http://localhost) ne doit pas
  // se retrouver dans la CSP de prod.
  const umamiOrigin = originOf(umamiUrl);
  const umami = umamiOrigin?.startsWith('https://') ? umamiOrigin : 'https://analytics.umami.is';
  const reportUri = sentryCspReportUri(sentryDsn);

  const directives: Record<string, string[]> = {
    'default-src': ["'self'"],
    // Next.js injecte des scripts inline (hydratation) : 'unsafe-inline' tant qu'il n'y a pas de nonce
    'script-src': [
      "'self'",
      "'unsafe-inline'",
      umami,
      'https://va.vercel-scripts.com',
      'https://www.youtube.com',
      'https://s.ytimg.com',
      'https://w.soundcloud.com',
    ],
    'style-src': ["'self'", "'unsafe-inline'"],
    // Pochettes, avatars et miniatures viennent de nombreux services
    'img-src': ["'self'", 'data:', 'blob:', 'https:'],
    'font-src': ["'self'", 'data:'],
    'media-src': ["'self'", 'blob:', 'https:'],
    'connect-src': [
      "'self'",
      umami,
      'https://*.ingest.sentry.io',
      'https://*.ingest.de.sentry.io',
      'https://*.ingest.us.sentry.io',
      'https://vitals.vercel-insights.com',
      'https://*.public.blob.vercel-storage.com',
      'https://blob.vercel-storage.com',
    ],
    'frame-src': [
      'https://www.youtube.com',
      'https://www.youtube-nocookie.com',
      'https://w.soundcloud.com',
      'https://open.spotify.com',
      'https://player.twitch.tv',
      'https://embed.twitch.tv',
      'https://widget.deezer.com',
      'https://embed.music.apple.com',
    ],
    'worker-src': ["'self'", 'blob:'],
    'frame-ancestors': ["'self'"],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    // Les connexions OAuth passent par des redirections de formulaire vers ces fournisseurs
    'form-action': ["'self'", 'https://accounts.google.com', 'https://id.twitch.tv'],
  };

  if (reportUri) directives['report-uri'] = [reportUri];

  return Object.entries(directives)
    .map(([name, values]) => `${name} ${[...new Set(values)].join(' ')}`)
    .join('; ');
}
