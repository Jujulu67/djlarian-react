import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import {
  Archivo,
  Audiowide,
  JetBrains_Mono,
  Manrope,
  Montserrat,
  Unbounded,
} from 'next/font/google';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';

import ClientLayout from '@/components/layout/ClientLayout';
import './globals.css';
import HydrationWrapper from '@/components/HydrationWrapper';
import ClientOnly from '@/components/ClientOnly';
import { initializePrisma } from '@/lib/prisma';
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

// Polices de l'UI v3 : Unbounded (titres), Manrope (texte), Archivo variable pour le nom du hero
// (axe de largeur, animé au tempo) et une mono pour les métadonnées
const unbounded = Unbounded({
  subsets: ['latin'],
  variable: '--font-unbounded',
});

const manrope = Manrope({
  subsets: ['latin'],
  variable: '--font-manrope',
});

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

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const isProduction = process.env.NODE_ENV === 'production';

  // Initialiser le système Prisma avec hot swap (au premier chargement)
  if (!isProduction) {
    await initializePrisma();
  }

  // Récupérer la session côté serveur pour la passer au SessionProvider
  // Cela évite le délai de chargement initial de la session côté client
  const session = await auth();

  // Version de l'UI (legacy, v2 ou v3) posée côté serveur pour éviter tout flash au chargement
  const uiVersion = resolveUiVersion((await cookies()).get(UI_VERSION_COOKIE)?.value);

  return (
    <html
      lang="fr"
      data-ui={uiVersion}
      className={`${audiowide.variable} ${montserrat.variable} ${archivo.variable} ${jetbrainsMono.variable} ${unbounded.variable} ${manrope.variable}`}
      suppressHydrationWarning
    >
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
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
