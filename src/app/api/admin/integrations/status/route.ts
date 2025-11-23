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

    // Récupérer les statuts des intégrations
    const umamiUrl = process.env.NEXT_PUBLIC_UMAMI_URL;
    const umamiWebsiteId = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID;
    const sentryDsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
    const isVercel = !!process.env.VERCEL;

    // Récupérer le nom du projet Vercel et le team slug si disponibles
    const vercelProjectName = process.env.VERCEL_PROJECT_NAME || 'djlarian-react';
    const vercelTeamSlug = process.env.VERCEL_TEAM_SLUG || 'larians-projects-a2dc5026';
    const vercelUrl = process.env.VERCEL_URL || process.env.NEXT_PUBLIC_VERCEL_URL || null;

    // Construire les URLs des dashboards (avec environment=all comme dans l'exemple)
    const analyticsUrl = `https://vercel.com/${vercelTeamSlug}/${vercelProjectName}/analytics?environment=all`;
    const speedInsightsUrl = `https://vercel.com/${vercelTeamSlug}/${vercelProjectName}/speed-insights?environment=all`;

    return NextResponse.json({
      vercel: {
        analytics: {
          enabled: true, // Toujours actif si le composant est dans le code
          type: 'web-analytics',
          limit: '5,000 événements/mois',
          dashboardUrl: analyticsUrl,
        },
        speedInsights: {
          enabled: true, // Toujours actif si le composant est dans le code
          type: 'performance',
          metrics: 'LCP, FID, CLS, TTFB, INP',
          dashboardUrl: speedInsightsUrl,
        },
        isVercel,
        projectName: vercelProjectName,
        teamSlug: vercelTeamSlug,
        url: vercelUrl,
      },
      sentry: {
        enabled: !!sentryDsn,
        dsn: sentryDsn ? 'configured' : 'not-configured',
      },
      umami: {
        enabled: !!umamiUrl && !!umamiWebsiteId && umamiWebsiteId !== 'your-website-id-here',
        isLocalhost: umamiUrl?.includes('localhost') || false,
        url: umamiUrl,
        websiteId: umamiWebsiteId,
      },
    });
  } catch (error) {
    logger.error('Erreur lors de la récupération du statut des intégrations:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération du statut' },
      { status: 500 }
    );
  }
}
