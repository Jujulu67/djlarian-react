import { NextRequest, NextResponse } from 'next/server';

import { auth } from '@/auth';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    // Vérifier l'authentification et les permissions administrateur
    const session = await auth();
    if (!session || session.user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const sentryDsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
    const enabled = !!sentryDsn;

    // Si Sentry n'est pas configuré, retourner simplement le statut
    if (!enabled) {
      return NextResponse.json({
        enabled: false,
        message: "Sentry n'est pas configuré. Configurez NEXT_PUBLIC_SENTRY_DSN dans Vercel.",
      });
    }

    // Extraire l'organisation et le projet depuis le DSN
    // Format: https://[key]@[org].ingest.[region].sentry.io/[project]
    let sentryOrg: string | undefined;
    let sentryProject: string | undefined;
    let region = 'us'; // Par défaut

    try {
      const dsnMatch = sentryDsn.match(
        /https:\/\/([^@]+)@([^.]+)\.ingest\.([^.]+)\.sentry\.io\/(.+)/
      );

      if (dsnMatch) {
        const [, , orgSlug, dsnRegion, projectId] = dsnMatch;
        // Si l'org commence par "o" suivi de chiffres, c'est un ID numérique
        // L'API Sentry accepte soit le slug soit l'ID (avec ou sans le "o")
        // On garde le "o" car c'est le format dans le DSN
        const orgId = orgSlug.startsWith('o') ? orgSlug : orgSlug;

        // Utiliser les variables d'environnement si disponibles (slugs préférés)
        // Sinon utiliser les IDs du DSN
        // Note: L'API peut accepter les deux formats
        sentryOrg = process.env.SENTRY_ORG || orgId;
        sentryProject = process.env.SENTRY_PROJECT || projectId;
        region = dsnRegion || 'us';

        logger.debug(
          `DSN extrait - org: ${orgSlug} (utilisé: ${sentryOrg}), project: ${projectId} (utilisé: ${sentryProject}), region: ${dsnRegion}`
        );
      } else {
        // Si le format ne correspond pas, utiliser les variables d'environnement
        sentryOrg = process.env.SENTRY_ORG;
        sentryProject = process.env.SENTRY_PROJECT;
        logger.warn("Format de DSN Sentry non standard, utilisation des variables d'environnement");
      }
    } catch (error) {
      logger.error("Erreur lors de l'extraction du DSN Sentry:", error);
      // Utiliser les variables d'environnement en fallback
      sentryOrg = process.env.SENTRY_ORG;
      sentryProject = process.env.SENTRY_PROJECT;
    }

    // Si on n'a pas d'org ou de project, retourner un statut basique
    if (!sentryOrg || !sentryProject) {
      return NextResponse.json({
        enabled: true,
        errorCount: 0,
        message:
          "Sentry est configuré mais les informations d'organisation/projet sont manquantes. Configurez SENTRY_ORG et SENTRY_PROJECT.",
      });
    }

    const sentryAuthToken = process.env.SENTRY_AUTH_TOKEN;

    // Si on a un token d'authentification, on peut récupérer les stats
    if (sentryAuthToken) {
      try {
        // Pour la région API, utiliser directement la région du DSN
        // de.sentry.io pour l'Europe (Allemagne) - votre organisation est hébergée ici
        // eu.sentry.io pour l'Europe (nouvelle région, nécessite migration)
        // us.sentry.io pour les USA
        // On peut forcer une région via SENTRY_API_REGION si nécessaire
        const apiRegion =
          process.env.SENTRY_API_REGION || (region === 'de' ? 'de' : region === 'eu' ? 'eu' : 'us');

        // D'après la documentation Sentry :
        // 1. L'endpoint GET /api/0/projects/{org}/{project}/issues/ est déprécié
        //    Il nécessite seulement event:read mais retourne souvent une erreur 500
        // 2. L'endpoint GET /api/0/organizations/{org}/issues/ est le remplacement recommandé
        //    Il nécessite org:read ET event:read

        // Essayer d'abord avec l'endpoint au niveau de l'organisation (recommandé)
        // L'API nécessite l'ID numérique du projet, pas le slug
        // Si SENTRY_PROJECT est un slug, utiliser l'ID extrait du DSN
        const projectIdForApi = sentryProject.match(/^\d+$/)
          ? sentryProject
          : process.env.NEXT_PUBLIC_SENTRY_DSN?.match(
              /https:\/\/[^@]+@[^.]+\.ingest\.[^.]+\.sentry\.io\/(.+)/
            )?.[1] || sentryProject;

        let issuesUrl = `https://${apiRegion}.sentry.io/api/0/organizations/${sentryOrg}/issues/`;
        let queryParams = new URLSearchParams({
          project: projectIdForApi,
          statsPeriod: '24h',
          query: 'is:unresolved',
        });

        let fullUrl = `${issuesUrl}?${queryParams.toString()}`;
        logger.debug(`Appel API Sentry (org level): ${fullUrl}`);

        let response = await fetch(fullUrl, {
          headers: {
            Authorization: `Bearer ${sentryAuthToken}`,
            'Content-Type': 'application/json',
          },
        });

        // Si l'endpoint org retourne 403 (permissions insuffisantes), essayer l'endpoint déprécié
        if (response.status === 403) {
          logger.debug(
            "Endpoint org retourne 403, essai avec l'endpoint déprécié au niveau du projet"
          );
          issuesUrl = `https://${apiRegion}.sentry.io/api/0/projects/${sentryOrg}/${sentryProject}/issues/`;
          queryParams = new URLSearchParams({
            statsPeriod: '24h',
            query: 'is:unresolved',
          });
          fullUrl = `${issuesUrl}?${queryParams.toString()}`;
          logger.debug(`Appel API Sentry (project level, deprecated): ${fullUrl}`);

          response = await fetch(fullUrl, {
            headers: {
              Authorization: `Bearer ${sentryAuthToken}`,
              'Content-Type': 'application/json',
            },
          });
        }

        if (response.ok) {
          try {
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
              const issues = await response.json();
              // L'API peut retourner un tableau ou un objet avec une propriété results
              const issuesArray = Array.isArray(issues) ? issues : issues.results || [];
              const errorCount = issuesArray.length;
              const lastError =
                issuesArray.length > 0
                  ? issuesArray[0].title || issuesArray[0].metadata?.value || 'Erreur inconnue'
                  : undefined;

              // Construire l'URL Sentry avec la bonne région
              const sentryBaseUrl =
                region === 'de'
                  ? 'https://de.sentry.io'
                  : region === 'eu'
                    ? 'https://eu.sentry.io'
                    : 'https://sentry.io';
              return NextResponse.json({
                enabled: true,
                errorCount,
                lastError,
                sentryUrl: `${sentryBaseUrl}/organizations/${sentryOrg}/projects/${sentryProject}/`,
              });
            } else {
              logger.warn(`L'API Sentry a retourné un type de contenu inattendu: ${contentType}`);
            }
          } catch (parseError) {
            logger.error('Erreur lors du parsing de la réponse Sentry:', parseError);
          }
        } else {
          // Gérer les erreurs de l'API
          const contentType = response.headers.get('content-type');
          const statusText = response.statusText;

          if (contentType && contentType.includes('application/json')) {
            try {
              const errorData = await response.json();
              logger.warn(
                `Erreur API Sentry: ${response.status} ${statusText} - ${JSON.stringify(errorData)}`
              );

              // Si c'est une erreur de permission, donner un message clair
              if (
                response.status === 403 ||
                (errorData.detail && errorData.detail.includes('permission'))
              ) {
                return NextResponse.json({
                  enabled: true,
                  errorCount: 0,
                  message:
                    "Le token Sentry n'a pas les permissions nécessaires. Créez un nouveau token avec les permissions: org:read et event:read.",
                  sentryUrl: `${region === 'de' ? 'https://de.sentry.io' : region === 'eu' ? 'https://eu.sentry.io' : 'https://sentry.io'}/organizations/${sentryOrg}/projects/${sentryProject}/`,
                });
              }

              // Si c'est une erreur 500, c'est probablement un problème côté Sentry avec l'endpoint déprécié
              if (response.status === 500) {
                return NextResponse.json({
                  enabled: true,
                  errorCount: 0,
                  message:
                    "L'API REST Sentry rencontre un problème. Les erreurs sont toujours capturées via le DSN. Consultez le dashboard Sentry pour voir les stats.",
                  sentryUrl: `${region === 'de' ? 'https://de.sentry.io' : region === 'eu' ? 'https://eu.sentry.io' : 'https://sentry.io'}/organizations/${sentryOrg}/projects/${sentryProject}/`,
                });
              }
            } catch {
              logger.warn(`Erreur API Sentry: ${response.status} ${statusText}`);
            }
          } else if (contentType && contentType.includes('text/html')) {
            const htmlError = await response.text().catch(() => 'Impossible de lire la réponse');
            const truncatedError =
              htmlError.length > 500 ? htmlError.substring(0, 500) + '...' : htmlError;
            logger.warn(
              `L'API Sentry a retourné une erreur HTML (${response.status} ${statusText}). URL: ${fullUrl}`
            );
            logger.warn(`Contenu: ${truncatedError}`);
          } else {
            const errorText = await response.text().catch(() => 'Unknown error');
            const truncatedError =
              errorText.length > 200 ? errorText.substring(0, 200) + '...' : errorText;
            logger.warn(`Erreur API Sentry: ${response.status} ${statusText} - ${truncatedError}`);
          }
        }
      } catch (error) {
        logger.error("Erreur lors de l'appel à l'API Sentry:", error);
        // Ne pas retourner d'erreur 500, juste logger et continuer
      }
    }

    // Retourner le statut de base sans stats détaillées
    // Construire l'URL Sentry avec la bonne région
    const sentryBaseUrl =
      region === 'de'
        ? 'https://de.sentry.io'
        : region === 'eu'
          ? 'https://eu.sentry.io'
          : 'https://sentry.io';
    return NextResponse.json({
      enabled: true,
      errorCount: 0,
      message: sentryAuthToken
        ? 'Impossible de récupérer les stats. Vérifiez SENTRY_AUTH_TOKEN.'
        : 'Configurez SENTRY_AUTH_TOKEN pour voir les stats détaillées.',
      sentryUrl: `${sentryBaseUrl}/organizations/${sentryOrg}/projects/${sentryProject}/`,
    });
  } catch (error) {
    logger.error('Erreur lors de la récupération du statut Sentry:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération du statut Sentry' },
      { status: 500 }
    );
  }
}
