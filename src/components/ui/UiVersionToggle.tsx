'use client';

import { useSession } from 'next-auth/react';

import { useUiVersion } from '@/hooks/useUiVersion';
import { UI_VERSION_PARAM } from '@/lib/ui-version';

/**
 * Interrupteur legacy / v2 pour comparer les deux interfaces (admins uniquement).
 * Recharge la page avec `?ui=...` : le proxy pose le cookie puis revient sur l'URL propre.
 */
export default function UiVersionToggle() {
  const { data: session } = useSession();
  const version = useUiVersion();

  if (session?.user?.role !== 'ADMIN') return null;

  const next = version === 'v2' ? 'legacy' : 'v2';

  const switchVersion = () => {
    const url = new URL(window.location.href);
    url.searchParams.set(UI_VERSION_PARAM, next);
    window.location.assign(url.toString());
  };

  return (
    <button
      type="button"
      onClick={switchVersion}
      aria-label={`Passer à l'interface ${next}`}
      className="fixed bottom-4 left-4 z-[9999] rounded-full border border-white/15 bg-black/70 px-3 py-1.5 text-xs font-medium text-white/80 backdrop-blur-md transition-colors hover:text-white"
    >
      UI : {version === 'v2' ? 'v2' : 'legacy'} → {next}
    </button>
  );
}
