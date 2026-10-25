'use client';

import { useEffect, useState } from 'react';

const formatter = new Intl.DateTimeFormat('fr-FR', {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  timeZone: 'Europe/Paris',
});

/** Heure de Paris qui défile à la seconde, façon timecode */
export default function ParisClock({ className }: { className?: string }) {
  // Rendu vide côté serveur : l'heure n'existe que dans le navigateur (pas d'écart d'hydratation)
  const [now, setNow] = useState<string | null>(null);

  useEffect(() => {
    const tick = () => setNow(formatter.format(new Date()));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <span className={className} suppressHydrationWarning>
      PAR {now ?? '--:--:--'}
    </span>
  );
}
