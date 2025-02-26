import type { Metadata } from 'next';
import { Audiowide, Montserrat } from 'next/font/google';
import ClientLayout from '@/components/layout/ClientLayout';
import './globals.css';

const audiowide = Audiowide({
  weight: '400',
  variable: '--font-audiowide',
  subsets: ['latin'],
});

const montserrat = Montserrat({
  variable: '--font-montserrat',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'DJ Larian | Electronic Music Producer & DJ',
  description:
    'Official website of DJ Larian - Electronic music producer, performer, and innovator. Experience the future of electronic music.',
  keywords: 'DJ Larian, electronic music, DJ, producer, EDM, techno, house music, live streaming',
  openGraph: {
    title: 'DJ Larian | Electronic Music Producer & DJ',
    description: 'Experience the future of electronic music with DJ Larian',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'DJ Larian | Electronic Music Producer & DJ',
    description: 'Experience the future of electronic music with DJ Larian',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${audiowide.variable} ${montserrat.variable}`}>
      <body className="bg-black text-white antialiased">
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
