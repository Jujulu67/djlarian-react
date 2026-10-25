'use client';

import { MotionConfig } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { Session } from 'next-auth';
import { Toaster } from 'sonner';

import AmbientBackground from '@/components/layout/AmbientBackground';
import Footer from '@/components/layout/Footer';
import SignalBackdrop from '@/components/layout/SignalBackdrop';
import Navigation from '@/components/layout/Navigation';
import CustomCursor from '@/components/ui/CustomCursor';
import UiVersionToggle from '@/components/ui/UiVersionToggle';
import FooterSignal from '@/components/v3/FooterSignal';
import { useUiVersion } from '@/hooks/useUiVersion';
import AuthProvider from '@/providers/AuthProvider';
// import { SessionProvider } from 'next-auth/react';

interface ClientLayoutProps {
  children: React.ReactNode;
  session?: Session | null; // Session serveur passée depuis le layout
}

const ClientLayout = ({ children, session }: ClientLayoutProps) => {
  const uiVersion = useUiVersion();
  const isV2 = uiVersion !== 'legacy';
  const isV3 = uiVersion === 'v3';
  const pathname = usePathname();
  // Pas de footer sur les espaces de travail (admin, projets)
  const showFooter = isV2 && !/^\/(admin|projects)(\/|$)/.test(pathname ?? '');

  return (
    <AuthProvider session={session}>
      {/* Respecte prefers-reduced-motion pour toutes les animations framer-motion */}
      <MotionConfig reducedMotion="user">
        {isV3 ? <SignalBackdrop /> : isV2 && <AmbientBackground />}
        <CustomCursor />
        <Navigation />
        <main className="pt-16 v2:pt-20 v3:pt-16">{children}</main>
        {showFooter && (isV3 ? <FooterSignal /> : <Footer />)}
        {/* Même rendu que l'ancien toaster en legacy ; habillage verre en v2 (globals.css) */}
        <Toaster
          position="bottom-center"
          theme="dark"
          duration={5000}
          style={{ zIndex: 10000 }}
          toastOptions={{
            style: {
              background: 'var(--toast-bg, #1a1a1a)',
              color: '#fff',
              border: 'var(--toast-border, 1px solid rgba(139, 92, 246, 0.2))',
              borderRadius: 'var(--toast-radius, 0.5rem)',
            },
          }}
        />
        <UiVersionToggle />
      </MotionConfig>
    </AuthProvider>
  );
};

export default ClientLayout;
