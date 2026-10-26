import Link from 'next/link';
import type { ReactNode } from 'react';

interface PosterStateProps {
  /** Petit code en mono au-dessus (ex. « 403 », « Bientôt ») */
  code: string;
  /** Le mot affiché en très grand */
  word: string;
  title: string;
  description: ReactNode;
  action?: { label: string; href?: string; onClick?: () => void };
}

const ACTION_CLASS =
  'inline-flex h-12 items-center gap-3 bg-[rgb(var(--ink))] px-6 text-sm font-medium text-[rgb(5_5_6)] transition-colors hover:bg-white';

/**
 * État vide de l'UI v3 en format affiche : un mot géant en filigrane qui occupe l'écran,
 * le message et une seule action. Remplace les petites cartes centrées dans le vide.
 */
export default function PosterState({ code, word, title, description, action }: PosterStateProps) {
  return (
    <section className="relative flex min-h-[calc(100svh-4rem)] flex-col justify-end overflow-hidden px-4 pb-16 md:px-8">
      <p
        aria-hidden="true"
        className="font-poster pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 select-none whitespace-nowrap text-center text-[26vw] text-white/[0.05]"
      >
        {word}
      </p>
      <div className="relative mx-auto w-full max-w-[1376px]">
        <p className="font-mono-signal text-xs uppercase text-white/50">[ {code} ]</p>
        <h1 className="mt-4 max-w-4xl text-display text-5xl text-white md:text-8xl">{title}</h1>
        <p className="mt-6 max-w-xl text-lg text-white/70">{description}</p>
        {action &&
          (action.href ? (
            <Link href={action.href} className={`mt-8 ${ACTION_CLASS}`}>
              {action.label} →
            </Link>
          ) : (
            <button type="button" onClick={action.onClick} className={`mt-8 ${ACTION_CLASS}`}>
              {action.label} →
            </button>
          ))}
      </div>
    </section>
  );
}
