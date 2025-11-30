'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';

export default function AuthErrorPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const error = searchParams.get('error');

  useEffect(() => {
    const checkMergeToken = async () => {
      try {
        // Essayer plusieurs fois avec un petit délai pour laisser le temps au cache de se synchroniser
        let attempts = 0;
        const maxAttempts = 5;

        while (attempts < maxAttempts) {
          attempts++;
          console.log(`[AuthError] Tentative ${attempts}/${maxAttempts} de récupération du token`);

          // Récupérer le token depuis le cache
          // On essaie d'abord sans email, puis avec l'email du cookie si disponible
          const response = await fetch('/api/auth/merge-accounts/check');
          if (response.ok) {
            const data = await response.json();
            console.log('[AuthError] Réponse check merge token:', data);
            if (data.hasToken && data.token) {
              console.log('[AuthError] Redirection vers la page de fusion');
              // Rediriger immédiatement vers la page de fusion avec le token
              router.replace(`/auth/merge-accounts?token=${encodeURIComponent(data.token)}`);
              return;
            }
          }

          // Attendre un peu avant de réessayer (seulement si ce n'est pas la dernière tentative)
          if (attempts < maxAttempts) {
            // Augmenter le délai progressivement
            const delay = Math.min(200 * attempts, 1000);
            await new Promise((resolve) => setTimeout(resolve, delay));
          }
        }

        console.log('[AuthError] Aucun token de fusion trouvé après toutes les tentatives');
      } catch (error) {
        console.error('[AuthError] Erreur lors de la vérification du token:', error);
      }

      setChecking(false);
    };

    if (error === 'AccessDenied') {
      // Attendre un peu pour laisser le temps au cache de se synchroniser
      const timeout = setTimeout(() => {
        checkMergeToken();
      }, 300);

      return () => clearTimeout(timeout);
    } else {
      setChecking(false);
    }
  }, [error, router]);

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-gray-900 to-black">
        <div className="text-center">
          <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-purple-600 border-t-transparent mx-auto" />
          <p className="text-gray-300">Redirection en cours...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-gray-900 to-black p-4">
      <div className="w-full max-w-md text-center rounded-xl bg-gray-800/40 backdrop-blur-sm border border-gray-700/50 p-8">
        <h1 className="mb-4 text-2xl font-bold text-white">Erreur d'authentification</h1>
        <p className="mb-6 text-gray-300">
          {error === 'AccessDenied'
            ? 'Accès refusé. Veuillez réessayer.'
            : `Une erreur est survenue : ${error || 'Erreur inconnue'}`}
        </p>
        <Button onClick={() => router.push('/')}>Retour à l'accueil</Button>
      </div>
    </div>
  );
}
