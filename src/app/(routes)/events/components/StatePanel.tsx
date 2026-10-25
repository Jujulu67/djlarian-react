import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils/cn';

interface StatePanelProps {
  icon: LucideIcon;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  /** Ton de l'icône : neutre (vide, chargement) ou erreur */
  tone?: 'neutral' | 'error';
  /** Fait tourner l'icône (état de chargement) */
  spin?: boolean;
  className?: string;
}

/**
 * État vide / erreur / chargement de l'UI v2 : carte surface-1 centrée,
 * icône dans un cercle discret, phrase courte, action optionnelle.
 */
export function StatePanel({
  icon: Icon,
  title,
  description,
  action,
  tone = 'neutral',
  spin = false,
  className,
}: StatePanelProps) {
  return (
    <div
      className={cn(
        'mx-auto flex max-w-md flex-col items-center rounded-2xl px-6 py-12 text-center surface-1 md:px-10',
        className
      )}
      role={tone === 'error' ? 'alert' : spin ? 'status' : undefined}
    >
      <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-white/[0.04] ring-1 ring-inset ring-white/10">
        <Icon
          className={cn(
            'h-6 w-6',
            tone === 'error' ? 'text-red-400' : 'text-white/60',
            spin && 'animate-spin'
          )}
          aria-hidden="true"
        />
      </div>
      <h2 className="text-lg font-semibold text-white">{title}</h2>
      {description && <p className="mt-2 text-sm leading-relaxed text-white/60">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
