import Link from 'next/link';
import type { ReactNode } from 'react';

interface PosterStateProps {
  /** Surtitre (ex. « 404 », « Bientôt ») */
  code: string;
  /** Le mot affiché en filigrane derrière le message */
  word: string;
  title: string;
  description: ReactNode;
  action?: { label: string; href?: string; onClick?: () => void };
}

const ACTION_CLASS =
  'chrome-pill mt-8 inline-flex h-12 items-center rounded-full px-7 text-[15px] font-bold transition-transform hover:-translate-y-0.5';

/**
 * État vide de l'UI v3 : un mot en filigrane chromé qui occupe l'écran, puis le message
 * et une seule action dans un panneau de verre. Remplace les petites cartes perdues dans le vide.
 */
export default function PosterState({ code, word, title, description, action }: PosterStateProps) {
  return (
    <section className="relative flex min-h-[calc(100svh-5rem)] items-center justify-center overflow-hidden px-4 py-16">
      <p
        aria-hidden="true"
        className="chrome-text pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 select-none whitespace-nowrap text-center text-display text-[24vw] opacity-[0.08]"
      >
        {word}
      </p>
      <div className="surface-2 relative w-full max-w-xl rounded-[2rem] p-8 text-center md:p-12">
        <p className="text-[13px] font-semibold uppercase tracking-[0.2em] text-[rgb(var(--ice))]">
          {code}
        </p>
        <h1 className="chrome-text mt-3 text-display text-3xl md:text-4xl">{title}</h1>
        <p className="mt-4 text-white/70">{description}</p>
        {action &&
          (action.href ? (
            <Link href={action.href} className={ACTION_CLASS}>
              {action.label}
            </Link>
          ) : (
            <button type="button" onClick={action.onClick} className={ACTION_CLASS}>
              {action.label}
            </button>
          ))}
      </div>
    </section>
  );
}
