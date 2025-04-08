import type { Metadata } from 'next';
import { Audiowide, Montserrat } from 'next/font/google';
import ClientLayout from '@/components/layout/ClientLayout';
import './globals.css';
import HydrationWrapper from '@/components/HydrationWrapper';
import ClientOnly from '@/components/ClientOnly';

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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${audiowide.variable} ${montserrat.variable}`}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body suppressHydrationWarning className="bg-black text-white antialiased">
        <HydrationWrapper>
          <ClientOnly>
            <ClientLayout>{children}</ClientLayout>
          </ClientOnly>
        </HydrationWrapper>
      </body>
    </html>
  );
}
