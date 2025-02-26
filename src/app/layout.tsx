import type { Metadata } from 'next';
import { Audiowide, Montserrat } from 'next/font/google';
import Navigation from '@/components/layout/Navigation';
import CustomCursor from '@/components/ui/CustomCursor';
import AuthProvider from '@/providers/AuthProvider';
import './globals.css';
import { Toaster } from 'react-hot-toast';

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
        <AuthProvider>
          <CustomCursor />
          <Navigation />
          <main className="pt-16">{children}</main>
          <Toaster
            position="top-center"
            toastOptions={{
              duration: 5000,
              style: {
                background: '#1a1a1a',
                color: '#fff',
                borderRadius: '0.5rem',
                border: '1px solid rgba(139, 92, 246, 0.2)',
              },
              success: {
                iconTheme: {
                  primary: '#10B981',
                  secondary: '#fff',
                },
              },
              error: {
                iconTheme: {
                  primary: '#EF4444',
                  secondary: '#fff',
                },
              },
            }}
          />
        </AuthProvider>
      </body>
    </html>
  );
}
