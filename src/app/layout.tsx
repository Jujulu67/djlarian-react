import type { Metadata } from 'next';
import { Audiowide, Montserrat } from 'next/font/google';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';

import ClientLayout from '@/components/layout/ClientLayout';
import './globals.css';
import HydrationWrapper from '@/components/HydrationWrapper';
import ClientOnly from '@/components/ClientOnly';
import UmamiAnalytics from '@/components/analytics/UmamiScript';
import prisma from '@/lib/prisma';
import { defaultConfigs } from '@/config/defaults';

const audiowide = Audiowide({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-audiowide',
});

const montserrat = Montserrat({
  subsets: ['latin'],
  variable: '--font-montserrat',
});

export const metadata: Metadata = {
  title: 'DJ Larian',
  description: 'Official website of DJ Larian',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const isProduction = process.env.NODE_ENV === 'production';

  // En local, récupérer la config depuis la DB
  // En production, utiliser les variables d'environnement
  let umamiEnabled = defaultConfigs.api.umamiEnabled;
  let umamiSiteId = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID || defaultConfigs.api.umamiSiteId;
  let rawUmamiUrl = process.env.NEXT_PUBLIC_UMAMI_URL;

  if (!isProduction) {
    // En local, essayer de récupérer depuis la DB
    try {
      const configs = await prisma.siteConfig.findMany({
        where: { section: 'api' },
      });

      configs.forEach((config) => {
        if (config.key === 'umamiEnabled') {
          umamiEnabled = config.value === 'true';
        } else if (config.key === 'umamiSiteId' && config.value) {
          umamiSiteId = config.value;
        }
      });
    } catch (error) {
      // Si erreur DB, utiliser les valeurs par défaut/env
      // (normal en cas de première migration ou DB non prête)
    }
  }

  // Construire l'URL Umami
  let umamiUrl: string | undefined;
  const websiteId =
    umamiSiteId !== 'your-umami-site-id' && umamiSiteId !== 'your-website-id-here'
      ? umamiSiteId
      : undefined;

  // Si Umami est activé dans la config
  if (umamiEnabled && websiteId && rawUmamiUrl) {
    // En production, ne pas utiliser localhost
    if (isProduction && rawUmamiUrl.includes('localhost')) {
      umamiUrl = undefined; // Désactiver Umami si localhost en prod
    } else {
      // Ajouter /script.js si pas déjà présent
      umamiUrl = rawUmamiUrl.endsWith('/script.js') ? rawUmamiUrl : `${rawUmamiUrl}/script.js`;
    }
  }

  return (
    <html lang="en" className={`${audiowide.variable} ${montserrat.variable}`}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <UmamiAnalytics websiteId={websiteId} umamiUrl={umamiUrl} />
      </head>
      <body suppressHydrationWarning className="bg-black text-white antialiased">
        <HydrationWrapper>
          <ClientOnly>
            <ClientLayout>{children}</ClientLayout>
          </ClientOnly>
        </HydrationWrapper>
        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  );
}
