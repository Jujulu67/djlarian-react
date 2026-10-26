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
        'mb-10 flex flex-col gap-6 md:mb-14',
        !centered && actions && 'md:flex-row md:items-end md:justify-between',
        centered && 'items-center text-center',
        className
      )}
    >
      <div className={cn('max-w-2xl', centered && 'mx-auto')}>
        {eyebrow && (
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.25em] text-brand v3:text-[rgb(var(--ice))]">
            {eyebrow}
          </p>
        )}
        <h1 className="text-display text-4xl text-white md:text-5xl lg:text-6xl v3:chrome-text">
          {title}
        </h1>
        {description && (
          <p className="mt-4 text-base leading-relaxed text-white/60 md:text-lg">{description}</p>
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
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.25em] text-brand v3:text-[rgb(var(--ice))]">
            {eyebrow}
          </p>
        )}
        <h2 className="text-display text-3xl text-white md:text-4xl v3:chrome-text">{title}</h2>
      </div>
      {children}
    </div>
  );
}
