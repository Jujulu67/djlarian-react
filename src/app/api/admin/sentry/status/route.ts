import { NextResponse } from 'next/server';

import { logger } from '@/lib/logger';
import { requireAdmin } from '@/lib/api/requireAuth';

// Format du DSN : https://[key]@[org].ingest.[region].sentry.io/[project]
const DSN_PATTERN = /https:\/\/([^@]+)@([^.]+)\.ingest\.([^.]+)\.sentry\.io\/(.+)/;

interface SentryTarget {
  org?: string;
  project?: string;
  /** ID numérique du projet : l'endpoint au niveau de l'organisation n'accepte pas le slug */
  projectIdFromDsn?: string;
  region: string;
}

/** Organisation et projet : variables d'environnement d'abord, sinon les IDs du DSN. */
function resolveTarget(dsn: string): SentryTarget {
  const match = DSN_PATTERN.exec(dsn);
  if (!match) {
    logger.warn("Format de DSN Sentry non standard, utilisation des variables d'environnement");
    return {
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      region: 'us',
    };
  }
  const [, , orgId, region, projectId] = match;
  return {
    org: process.env.SENTRY_ORG || orgId,
    project: process.env.SENTRY_PROJECT || projectId,
    projectIdFromDsn: projectId,
    region: region || 'us',
  };
}

const isEuropeanRegion = (region: string) => region === 'de' || region === 'eu';

function dashboardUrl({ org, project, region }: SentryTarget): string {
  const base = isEuropeanRegion(region) ? `https://${region}.sentry.io` : 'https://sentry.io';
  return `${base}/organizations/${org}/projects/${project}/`;
}

/**
 * Issues non résolues des dernières 24 h. L'endpoint de l'organisation est le remplacement
 * recommandé (org:read + event:read) ; s'il répond 403, on essaie l'endpoint déprécié du projet,
 * qui ne demande que event:read.
 */
async function fetchIssues(target: SentryTarget, token: string): Promise<Response> {
  const apiRegion =
    process.env.SENTRY_API_REGION || (isEuropeanRegion(target.region) ? target.region : 'us');
  const apiBase = `https://${apiRegion}.sentry.io/api/0`;
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  const filters = { statsPeriod: '24h', query: 'is:unresolved' };

  const projectId = target.project?.match(/^\d+$/)
    ? target.project
    : target.projectIdFromDsn || target.project || '';
  const orgParams = new URLSearchParams({ project: projectId, ...filters });
  const response = await fetch(`${apiBase}/organizations/${target.org}/issues/?${orgParams}`, {
    headers,
  });
  if (response.status !== 403) return response;

  logger.debug("Endpoint org retourne 403, essai avec l'endpoint déprécié au niveau du projet");
  const projectParams = new URLSearchParams(filters);
  return fetch(`${apiBase}/projects/${target.org}/${target.project}/issues/?${projectParams}`, {
    headers,
  });
}

/** Nombre d'issues et titre de la plus récente, ou null si la réponse est illisible. */
async function readIssues(
  response: Response
): Promise<{ errorCount: number; lastError?: string } | null> {
  const contentType = response.headers.get('content-type');
  if (!contentType?.includes('application/json')) {
    logger.warn(`L'API Sentry a retourné un type de contenu inattendu: ${contentType}`);
    return null;
  }
  try {
    const issues = await response.json();
    // L'API peut retourner un tableau ou un objet avec une propriété results
    const list = Array.isArray(issues) ? issues : issues.results || [];
    const lastError = list[0] && (list[0].title || list[0].metadata?.value || 'Erreur inconnue');
    return { errorCount: list.length, lastError };
  } catch (parseError) {
    logger.error('Erreur lors du parsing de la réponse Sentry:', parseError);
    return null;
  }
}

/** Journalise une erreur de l'API et renvoie le message à afficher, s'il y en a un de précis. */
async function explainApiError(response: Response): Promise<string | null> {
  const { status, statusText } = response;
  const contentType = response.headers.get('content-type');

  if (!contentType?.includes('application/json')) {
    const limit = contentType?.includes('text/html') ? 500 : 200;
    const body = await response.text().catch(() => 'Impossible de lire la réponse');
    const excerpt = body.length > limit ? `${body.substring(0, limit)}...` : body;
    logger.warn(`Erreur API Sentry: ${status} ${statusText} - ${excerpt}`);
    return null;
  }

  try {
    const errorData = await response.json();
    logger.warn(`Erreur API Sentry: ${status} ${statusText} - ${JSON.stringify(errorData)}`);
    if (status === 403 || errorData.detail?.includes('permission')) {
      return "Le token Sentry n'a pas les permissions nécessaires. Créez un nouveau token avec les permissions: org:read et event:read.";
    }
    if (status === 500) {
      return "L'API REST Sentry rencontre un problème. Les erreurs sont toujours capturées via le DSN. Consultez le dashboard Sentry pour voir les stats.";
    }
  } catch {
    logger.warn(`Erreur API Sentry: ${status} ${statusText}`);
  }
  return null;
}

/** Statistiques ou message d'erreur précis ; null pour se rabattre sur le statut de base. */
async function fetchDetails(target: SentryTarget, token: string) {
  try {
    const response = await fetchIssues(target, token);
    if (response.ok) return await readIssues(response);
    const message = await explainApiError(response);
    return message ? { errorCount: 0, message } : null;
  } catch (error) {
    // Pas d'erreur 500 : le statut de base reste affichable
    logger.error("Erreur lors de l'appel à l'API Sentry:", error);
    return null;
  }
}

export async function GET() {
  try {
    // Vérifier l'authentification et les permissions administrateur
    const { error: authError } = await requireAdmin({ nonAdminStatus: 401 });
    if (authError) return authError;

    const sentryDsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
    if (!sentryDsn) {
      return NextResponse.json({
        enabled: false,
        message: "Sentry n'est pas configuré. Configurez NEXT_PUBLIC_SENTRY_DSN dans Vercel.",
      });
    }

    const target = resolveTarget(sentryDsn);
    if (!target.org || !target.project) {
      return NextResponse.json({
        enabled: true,
        errorCount: 0,
        message:
          "Sentry est configuré mais les informations d'organisation/projet sont manquantes. Configurez SENTRY_ORG et SENTRY_PROJECT.",
      });
    }

    const sentryUrl = dashboardUrl(target);
    const token = process.env.SENTRY_AUTH_TOKEN;
    if (token) {
      const details = await fetchDetails(target, token);
      if (details) return NextResponse.json({ enabled: true, ...details, sentryUrl });
    }

    return NextResponse.json({
      enabled: true,
      errorCount: 0,
      message: token
        ? 'Impossible de récupérer les stats. Vérifiez SENTRY_AUTH_TOKEN.'
        : 'Configurez SENTRY_AUTH_TOKEN pour voir les stats détaillées.',
      sentryUrl,
    });
  } catch (error) {
    logger.error('Erreur lors de la récupération du statut Sentry:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération du statut Sentry' },
      { status: 500 }
    );
  }
}
