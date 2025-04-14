'use client';

import { SessionProvider } from 'next-auth/react';
import ErrorBoundary from '@/components/ErrorBoundary';

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
      <SessionProvider>{children}</SessionProvider>
    </ErrorBoundary>
  );
}
