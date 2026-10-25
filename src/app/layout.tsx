import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { Archivo, Audiowide, JetBrains_Mono, Montserrat } from 'next/font/google';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';

import ClientLayout from '@/components/layout/ClientLayout';
import './globals.css';
import HydrationWrapper from '@/components/HydrationWrapper';
import ClientOnly from '@/components/ClientOnly';
import UmamiAnalytics from '@/components/analytics/UmamiScript';
import prisma, { initializePrisma } from '@/lib/prisma';
import { defaultConfigs } from '@/config/defaults';
import { auth } from '@/auth';
import { resolveUiVersion, UI_VERSION_COOKIE } from '@/lib/ui-version';

const audiowide = Audiowide({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-audiowide',
});

const montserrat = Montserrat({
  subsets: ['latin'],
  variable: '--font-montserrat',
});

// Polices de la V3 « Signal » : Archivo variable (axe de largeur, animé au tempo) et une mono façon DAW
const archivo = Archivo({
  subsets: ['latin'],
  axes: ['wdth'],
  variable: '--font-archivo',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono-v3',
});

export const metadata: Metadata = {
  title: 'Larian',
  description: 'Official website of Larian',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const isProduction = process.env.NODE_ENV === 'production';

  // Initialiser le système Prisma avec hot swap (au premier chargement)
  if (!isProduction) {
    await initializePrisma();
  }

  // Récupérer la session côté serveur pour la passer au SessionProvider
  // Cela évite le délai de chargement initial de la session côté client
  const session = await auth();

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

  // Version de l'UI (legacy, v2 ou v3) posée côté serveur pour éviter tout flash au chargement
  const uiVersion = resolveUiVersion((await cookies()).get(UI_VERSION_COOKIE)?.value);

  return (
    <html
      lang="fr"
      data-ui={uiVersion}
      className={`${audiowide.variable} ${montserrat.variable} ${archivo.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <UmamiAnalytics websiteId={websiteId} umamiUrl={umamiUrl} />
      </head>
      <body suppressHydrationWarning className="bg-black text-white antialiased">
        <HydrationWrapper>
          <ClientOnly>
            <ClientLayout session={session}>{children}</ClientLayout>
          </ClientOnly>
        </HydrationWrapper>
        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  );
}
