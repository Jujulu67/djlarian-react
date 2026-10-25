'use client';

import { Filter, Search } from 'lucide-react';
import { useState } from 'react';

import { useUiVersion } from '@/hooks/useUiVersion';
import { cn } from '@/lib/utils/cn';

import { MUSIC_TYPES } from '../constants';
import type { MusicFiltersState } from '../hooks/useMusicCatalog';

const V2_FIELD =
  'w-full rounded-xl border border-white/10 bg-white/[0.03] text-sm text-white backdrop-blur-md transition-[border-color,box-shadow] duration-200 placeholder:text-white/40 focus:border-brand/70 focus:outline-none focus:ring-4 focus:ring-brand/15';

const V2_CHIP =
  'inline-flex h-9 items-center whitespace-nowrap rounded-full px-4 text-sm font-medium transition-colors duration-200 active:scale-[0.98]';
const V2_CHIP_ACTIVE = 'bg-white text-zinc-950';
const V2_CHIP_IDLE =
  'bg-white/[0.04] text-white/70 ring-1 ring-inset ring-white/10 hover:text-white';

/**
 * Recherche, filtres par type et filtres additionnels (plateforme, mise en avant, tri).
 */
export function MusicFilters({
  searchTerm,
  setSearchTerm,
  selectedType,
  setSelectedType,
  platformFilter,
  setPlatformFilter,
  featuredFilter,
  setFeaturedFilter,
  sortBy,
  setSortBy,
  resetAdditionalFilters,
}: MusicFiltersState) {
  const isV2 = useUiVersion() === 'v2';
  const [showFilters, setShowFilters] = useState(false);
  const hasAdditionalFilters = !!platformFilter || !!featuredFilter || sortBy !== 'recent';

  if (isV2) {
    return (
      <div className="mb-10 flex flex-col gap-4 md:mb-12">
        <div className="flex gap-2.5">
          <div className="relative min-w-0 flex-1">
            <Search
              className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40"
              aria-hidden="true"
            />
            <input
              type="search"
              aria-label="Rechercher un morceau"
              placeholder="Rechercher un titre, un genre..."
              className={cn(V2_FIELD, 'h-12 pl-11 pr-4')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            aria-expanded={showFilters}
            aria-controls="music-more-filters"
            aria-label="Plus de filtres"
            title="Filtres additionnels"
            className={cn(
              'relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-colors duration-200 active:scale-[0.98]',
              showFilters ? V2_CHIP_ACTIVE : V2_CHIP_IDLE
            )}
          >
            <Filter className="h-4 w-4" aria-hidden="true" />
            {hasAdditionalFilters && !showFilters && (
              <span className="absolute right-2.5 top-2.5 h-1.5 w-1.5 rounded-full bg-brand" />
            )}
          </button>
        </div>

        <div className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0">
          <div className="flex min-w-max gap-2" role="group" aria-label="Type de morceau">
            {MUSIC_TYPES.map((type) => {
              const active = selectedType === type.value;
              return (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setSelectedType(type.value)}
                  aria-pressed={active}
                  className={cn(V2_CHIP, active ? V2_CHIP_ACTIVE : V2_CHIP_IDLE)}
                >
                  {type.label}
                </button>
              );
            })}
          </div>
        </div>

        {showFilters && (
          <div
            id="music-more-filters"
            className="grid grid-cols-1 gap-4 rounded-2xl p-4 surface-1 sm:p-5 md:grid-cols-3"
          >
            <V2Select
              id="music-platform"
              label="Plateforme"
              value={platformFilter}
              onChange={setPlatformFilter}
              options={[
                ['', 'Toutes les plateformes'],
                ['youtube', 'YouTube'],
                ['soundcloud', 'SoundCloud'],
                ['spotify', 'Spotify'],
                ['apple', 'Apple Music'],
                ['deezer', 'Deezer'],
              ]}
            />
            <V2Select
              id="music-featured"
              label="En vedette"
              value={featuredFilter}
              onChange={setFeaturedFilter}
              options={[
                ['', 'Tous'],
                ['featured', 'En vedette uniquement'],
              ]}
            />
            <V2Select
              id="music-sort"
              label="Trier par"
              value={sortBy}
              onChange={setSortBy}
              options={[
                ['recent', 'Plus récent'],
                ['oldest', 'Plus ancien'],
                ['title', 'Titre (A-Z)'],
              ]}
            />
            {hasAdditionalFilters && (
              <div className="md:col-span-3">
                <button
                  type="button"
                  onClick={resetAdditionalFilters}
                  className="text-sm text-white/60 transition-colors hover:text-white"
                >
                  Réinitialiser les filtres
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="mb-12">
      <div className="glass-modern rounded-2xl p-4 sm:p-6">
        <div className="flex flex-col gap-4">
          {/* Ligne 1: Recherche */}
          <div className="relative w-full">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Rechercher un titre, un genre..."
              className="bg-gray-900/70 text-white w-full pl-12 pr-4 py-3 rounded-xl border border-gray-700/70 focus:border-purple-500/70 focus:ring-1 focus:ring-purple-500/70 transition-all shadow-inner"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Ligne 2: Filtres par type et bouton filtre */}
          <div className="flex gap-3 items-center">
            {/* Filtres par type - scrollables sur mobile */}
            <div className="bg-gray-800/70 backdrop-blur-md rounded-xl p-1.5 flex items-center border border-gray-700/70 shadow-lg overflow-x-auto flex-1 min-w-0">
              <div className="flex gap-1 min-w-max">
                {MUSIC_TYPES.map((type) => (
                  <button
                    key={type.value}
                    onClick={() => setSelectedType(type.value)}
                    className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
                      selectedType === type.value
                        ? 'bg-gradient-to-r from-purple-600 to-purple-800 text-white shadow-md'
                        : 'text-gray-300 hover:bg-gray-700/60'
                    }`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`bg-gray-800/70 p-3 rounded-xl border transition-all flex-shrink-0 ${
                showFilters
                  ? 'border-purple-500/70 text-purple-400 bg-purple-500/10'
                  : 'border-gray-700/70 text-gray-300 hover:border-gray-500/70'
              }`}
              aria-label="Plus de filtres"
              title="Filtres additionnels"
            >
              <Filter className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filtres additionnels */}
        {showFilters && (
          <div className="mt-6 pt-6 border-t border-gray-700/50 animate-fadeIn">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-white flex items-center gap-2">
                <span className="w-8 h-8 bg-purple-500/10 rounded-full flex items-center justify-center">
                  <Filter className="w-4 h-4 text-purple-400" />
                </span>
                Filtres additionnels
              </h3>
              {(platformFilter || featuredFilter || sortBy !== 'recent') && (
                <button
                  onClick={resetAdditionalFilters}
                  className="text-sm text-gray-400 hover:text-purple-400 transition-colors flex items-center gap-1"
                >
                  <span>Réinitialiser</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Plateforme</label>
                <select
                  value={platformFilter}
                  onChange={(e) => setPlatformFilter(e.target.value)}
                  className="bg-gray-900/70 text-white w-full px-4 py-2.5 rounded-xl border border-gray-700/70 focus:border-purple-500/70 focus:ring-1 focus:ring-purple-500/70 transition-all shadow-inner"
                >
                  <option value="">Toutes les plateformes</option>
                  <option value="youtube">YouTube</option>
                  <option value="soundcloud">SoundCloud</option>
                  <option value="spotify">Spotify</option>
                  <option value="apple">Apple Music</option>
                  <option value="deezer">Deezer</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">En vedette</label>
                <select
                  value={featuredFilter}
                  onChange={(e) => setFeaturedFilter(e.target.value)}
                  className="bg-gray-900/70 text-white w-full px-4 py-2.5 rounded-xl border border-gray-700/70 focus:border-purple-500/70 focus:ring-1 focus:ring-purple-500/70 transition-all shadow-inner"
                >
                  <option value="">Tous</option>
                  <option value="featured">En vedette uniquement</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Trier par</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-gray-900/70 text-white w-full px-4 py-2.5 rounded-xl border border-gray-700/70 focus:border-purple-500/70 focus:ring-1 focus:ring-purple-500/70 transition-all shadow-inner"
                >
                  <option value="recent">Plus récent</option>
                  <option value="oldest">Plus ancien</option>
                  <option value="title">Titre (A-Z)</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/** Sélecteur v2 (champ verre) avec son libellé */
export function V2Select({
  id,
  label,
  value,
  onChange,
  options,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: [string, string][];
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-2 block text-xs font-medium uppercase tracking-[0.15em] text-white/50"
      >
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(V2_FIELD, 'h-11 px-3.5 [&>option]:bg-zinc-900')}
      >
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>
            {optionLabel}
          </option>
        ))}
      </select>
    </div>
  );
}
