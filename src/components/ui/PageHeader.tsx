import type { ReactNode } from 'react';

import { cn } from '@/lib/utils/cn';

interface PageHeaderProps {
  /** Petit surtitre au-dessus du titre (ex. « Discographie ») */
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  /** Actions à droite (filtres, boutons) */
  actions?: ReactNode;
  align?: 'left' | 'center';
  className?: string;
}

/**
 * En-tête de page de l'UI v2 : surtitre, titre display, description.
 * Même grammaire sur toutes les pages publiques.
 */
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  align = 'left',
  className,
}: PageHeaderProps) {
  const centered = align === 'center';
  return (
    <header
      className={cn(
        'mb-10 flex flex-col gap-6 md:mb-14 v3:mb-12 v3:pb-8 v3:rule-b md:v3:mb-16',
        !centered && actions && 'md:flex-row md:items-end md:justify-between',
        centered && 'items-center text-center',
        className
      )}
    >
      <div className={cn('max-w-2xl v3:max-w-none v3:flex-1 v3:@container', centered && 'mx-auto')}>
        {eyebrow && (
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.25em] text-brand v3:mb-5 v3:font-mono-signal v3:font-normal v3:tracking-normal v3:text-[rgb(var(--signal))]">
            <span className="hidden v3:inline">[ </span>
            {eyebrow}
            <span className="hidden v3:inline"> ]</span>
          </p>
        )}
        {/* v3 : titre « affiche » qui remplit la largeur du conteneur, quelle que soit sa longueur
            (taille en unités de conteneur, divisée par le nombre de caractères) */}
        <h1
          className="text-display text-4xl text-white md:text-5xl lg:text-6xl v3:text-[min(12rem,calc(100cqw/(var(--chars,8)*0.92)))] v3:leading-[0.82]"
          style={
            typeof title === 'string'
              ? ({ '--chars': title.length } as React.CSSProperties)
              : undefined
          }
        >
          {title}
        </h1>
        {description && (
          <p className="mt-4 text-base leading-relaxed text-white/60 md:text-lg v3:mt-8 v3:max-w-xl v3:text-lg md:v3:text-xl">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
    </header>
  );
}

/** Titre de section (accueil, blocs de page) : surtitre + h2 */
export function SectionHeading({
  eyebrow,
  title,
  className,
  children,
}: {
  eyebrow?: string;
  title: ReactNode;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div className={cn('mb-8 flex items-end justify-between gap-4 md:mb-10', className)}>
      <div>
        {eyebrow && (
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.25em] text-brand v3:font-mono-signal v3:font-normal v3:tracking-normal v3:text-[rgb(var(--signal))]">
            {eyebrow}
          </p>
        )}
        <h2 className="text-display text-3xl text-white md:text-4xl v3:text-[clamp(2.5rem,7vw,6rem)]">
          {title}
        </h2>
      </div>
      {children}
    </div>
  );
}
