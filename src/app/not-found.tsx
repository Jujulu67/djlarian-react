import { cookies } from 'next/headers';
import Link from 'next/link';

import { Button } from '@/components/ui/Button';
import PosterState from '@/components/v3/PosterState';
import { resolveUiVersion, UI_VERSION_COOKIE } from '@/lib/ui-version';

export default async function NotFound() {
  if (resolveUiVersion((await cookies()).get(UI_VERSION_COOKIE)?.value) === 'v3') {
    return (
      <PosterState
        code="404"
        word="404"
        title="Hors du mix"
        description="Cette page n'existe pas ou a été déplacée. Le son, lui, continue ailleurs."
        action={{ label: 'Retour au début', href: '/' }}
      />
    );
  }

  return (
    <section className="flex min-h-[70vh] items-center justify-center px-4">
      <div className="max-w-md text-center">
        <p className="text-display text-7xl text-white/10 md:text-8xl">404</p>
        <h1 className="mt-4 text-2xl font-semibold text-white md:text-3xl">Page introuvable</h1>
        <p className="mt-3 text-white/60">
          Cette page n&apos;existe pas ou a été déplacée. Le son, lui, continue ailleurs.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button asChild>
            <Link href="/">Retour à l&apos;accueil</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/music">Écouter la musique</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
