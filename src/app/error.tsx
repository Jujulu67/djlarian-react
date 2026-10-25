'use client';

import Link from 'next/link';
import { useEffect } from 'react';

import { Button } from '@/components/ui/Button';
import { logger } from '@/lib/logger';

export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logger.error('Erreur de rendu de page', error);
  }, [error]);

  return (
    <section className="flex min-h-[70vh] items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-semibold text-white md:text-3xl">
          Quelque chose s&apos;est mal passé
        </h1>
        <p className="mt-3 text-white/60">
          Le chargement de cette page a échoué. Réessaie, ou reviens à l&apos;accueil.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button onClick={reset}>Réessayer</Button>
          <Button asChild variant="outline">
            <Link href="/">Accueil</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
