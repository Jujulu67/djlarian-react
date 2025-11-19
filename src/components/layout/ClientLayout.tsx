'use client';

import { useEffect } from 'react';
import Navigation from '@/components/layout/Navigation';
import CustomCursor from '@/components/ui/CustomCursor';
import AuthProvider from '@/providers/AuthProvider';
import { Toaster } from 'react-hot-toast';
// import { SessionProvider } from 'next-auth/react';

interface ClientLayoutProps {
  children: React.ReactNode;
}

const ClientLayout = ({ children }: ClientLayoutProps) => {
  return (
    <AuthProvider>
      <CustomCursor />
      <Navigation />
      <main className="pt-16">{children}</main>
      <Toaster
        position="bottom-center"
        containerStyle={{
          zIndex: 10000,
        }}
        toastOptions={{
          duration: 5000,
          style: {
            background: '#1a1a1a',
            color: '#fff',
            borderRadius: '0.5rem',
            border: '1px solid rgba(139, 92, 246, 0.2)',
            zIndex: 10000,
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
  );
};

export default ClientLayout;
