import type { ReactNode } from 'react';

import { cn } from '@/lib/utils/cn';

interface MarqueeProps {
  items: ReactNode[];
  /** Durée d'un tour complet, en secondes */
  duration?: number;
  className?: string;
  separator?: ReactNode;
}

/**
 * Bandeau défilant infini. Le contenu est dupliqué (la 2e copie est masquée aux lecteurs d'écran)
 * et l'animation, en CSS, s'arrête si prefers-reduced-motion.
 */
export default function Marquee({ items, duration = 40, className, separator }: MarqueeProps) {
  const sep = separator ?? (
    <span aria-hidden="true" className="mx-6 inline-block h-1.5 w-1.5 bg-[rgb(var(--signal))]" />
  );
  const row = (hidden: boolean) => (
    <div aria-hidden={hidden || undefined} className="flex shrink-0 items-center">
      {items.map((item, index) => (
        <span key={index} className="flex items-center whitespace-nowrap">
          {item}
          {sep}
        </span>
      ))}
    </div>
  );

  return (
    <div className={cn('overflow-hidden', className)}>
      <div
        className="signal-marquee"
        style={{ '--marquee-duration': `${duration}s` } as React.CSSProperties}
      >
        {row(false)}
        {row(true)}
      </div>
    </div>
  );
}
