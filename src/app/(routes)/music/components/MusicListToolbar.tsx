'use client';

import { useUiVersion } from '@/hooks/useUiVersion';

import { ITEMS_PER_PAGE_OPTIONS } from '../hooks/useMusicCatalog';

interface MusicListToolbarProps {
  first: number;
  last: number;
  total: number;
  itemsPerPage: number;
  onItemsPerPageChange: (value: number) => void;
}

/** Compteur de résultats + sélecteur « Par page » (discret en v2) */
export function MusicListToolbar({
  first,
  last,
  total,
  itemsPerPage,
  onItemsPerPageChange,
}: MusicListToolbarProps) {
  const isV2 = useUiVersion() === 'v2';

  if (isV2) {
    return (
      <div className="mb-8 flex items-center justify-between gap-3 text-xs text-white/50 sm:text-sm">
        <p>
          {first}–{last} sur {total} morceaux
        </p>
        <label className="flex items-center gap-1.5">
          <span>Par page</span>
          <select
            className="cursor-pointer rounded-lg bg-transparent py-1 pl-1.5 pr-1 font-medium text-white/80 transition-colors hover:text-white focus:outline-none [&>option]:bg-zinc-900"
            value={itemsPerPage}
            onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
          >
            {ITEMS_PER_PAGE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
      </div>
    );
  }

  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
      <div className="text-xs sm:text-sm text-gray-400">
        Affichage de {first}-{last} sur {total} morceaux
      </div>
      <div className="flex items-center gap-2 sm:gap-3">
        <label
          htmlFor="itemsPerPage"
          className="text-xs sm:text-sm text-gray-300 whitespace-nowrap"
        >
          Par page:
        </label>
        <select
          id="itemsPerPage"
          className="bg-gray-800/70 text-white rounded-lg px-2 sm:px-3 py-1.5 border border-gray-700/50 text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-purple-500"
          value={itemsPerPage}
          onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
        >
          {ITEMS_PER_PAGE_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
