'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense } from 'react';
import { Button } from '@/components/ui/Button';

function AuthErrorContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const error = searchParams.get('error');
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-gray-900 to-black p-4 v2:bg-none v2:bg-transparent">
      <div className="w-full max-w-md text-center rounded-xl bg-gray-800/40 backdrop-blur-sm border border-gray-700/50 p-8 v2:rounded-2xl v2:surface-1 v2:px-6 v2:py-10">
        <h1 className="mb-4 text-2xl font-bold text-white v2:mb-2 v2:text-xl v2:font-semibold">
          Erreur d'authentification
        </h1>
        <p className="mb-6 text-gray-300 v2:text-sm v2:text-white/60">
          {error === 'AccessDenied'
            ? 'Accès refusé. Veuillez réessayer.'
            : `Une erreur est survenue : ${error || 'Erreur inconnue'}`}
        </p>
        <Button onClick={() => router.push('/')}>Retour à l'accueil</Button>
      </div>
    </div>
  );
}

export default function AuthErrorPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-gray-900 to-black v2:bg-none v2:bg-transparent">
          <div className="text-center">
            <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-purple-600 border-t-transparent mx-auto v2:h-8 v2:w-8 v2:border-2 v2:border-white/15 v2:border-t-brand" />
            <p className="text-gray-300 v2:text-white/60">Chargement...</p>
          </div>
        </div>
      }
    >
      <AuthErrorContent />
    </Suspense>
  );
}
