'use client';

import { Filter, Search } from 'lucide-react';

import { useUiVersion } from '@/hooks/useUiVersion';
import { cn } from '@/lib/utils/cn';

const STATUS_FILTERS = [
  { value: 'all', label: 'Tous' },
  { value: 'UPCOMING', label: 'À venir' },
  { value: 'COMPLETED', label: 'Terminés' },
  { value: 'CANCELLED', label: 'Annulés' },
];

const V2_CHIP =
  'inline-flex h-9 items-center whitespace-nowrap rounded-full px-4 text-sm font-medium transition-colors duration-200 active:scale-[0.98]';
const V2_CHIP_ACTIVE = 'bg-white text-zinc-950';
const V2_CHIP_IDLE =
  'bg-white/[0.04] text-white/70 ring-1 ring-inset ring-white/10 hover:text-white';

interface EventsFiltersProps {
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  selectedStatus: string;
  handleStatusChange: (status: string) => void;
  showFilters: boolean;
  setShowFilters: (value: boolean) => void;
}

export function EventsFilters({
  searchTerm,
  setSearchTerm,
  selectedStatus,
  handleStatusChange,
  showFilters,
  setShowFilters,
}: EventsFiltersProps) {
  const isV2 = useUiVersion() !== 'legacy';

  // v2 : recherche + chips de statut. Les « filtres additionnels » legacy (lieu, date, prix)
  // ne sont branchés à rien : ils ne sont pas repris en v2.
  if (isV2) {
    return (
      <div className="mb-10 flex flex-col gap-4 md:mb-12">
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40"
            aria-hidden="true"
          />
          <input
            type="search"
            aria-label="Rechercher un événement"
            placeholder="Rechercher un événement..."
            className="h-12 w-full rounded-xl border border-white/10 bg-white/[0.03] pl-11 pr-4 text-sm text-white backdrop-blur-md transition-[border-color,box-shadow] duration-200 placeholder:text-white/40 focus:border-brand/70 focus:outline-none focus:ring-4 focus:ring-brand/15"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0">
          <div className="flex min-w-max gap-2" role="group" aria-label="Statut de l'événement">
            {STATUS_FILTERS.map(({ value, label }) => {
              const active = selectedStatus === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => handleStatusChange(value)}
                  aria-pressed={active}
                  className={cn(V2_CHIP, active ? V2_CHIP_ACTIVE : V2_CHIP_IDLE)}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
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
              placeholder="Rechercher un événement..."
              className="bg-gray-900/70 text-white w-full pl-12 pr-4 py-3 rounded-xl border border-gray-700/70 focus:border-purple-500/70 focus:ring-1 focus:ring-purple-500/70 transition-all shadow-inner"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Ligne 2: Filtres par statut et bouton filtre */}
          <div className="flex gap-3 items-center">
            <div className="bg-gray-800/70 backdrop-blur-md rounded-xl p-1.5 flex items-center border border-gray-700/70 shadow-lg overflow-x-auto flex-1 min-w-0">
              <div className="flex gap-1 min-w-max">
                <button
                  onClick={() => handleStatusChange('all')}
                  className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
                    selectedStatus === 'all'
                      ? 'bg-gradient-to-r from-purple-600 to-purple-800 text-white shadow-md'
                      : 'text-gray-300 hover:bg-gray-700/60'
                  }`}
                >
                  Tous
                </button>
                <button
                  onClick={() => handleStatusChange('UPCOMING')}
                  className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
                    selectedStatus === 'UPCOMING'
                      ? 'bg-gradient-to-r from-blue-600 to-blue-800 text-white shadow-md'
                      : 'text-gray-300 hover:bg-gray-700/60'
                  }`}
                >
                  À venir
                </button>
                <button
                  onClick={() => handleStatusChange('COMPLETED')}
                  className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
                    selectedStatus === 'COMPLETED'
                      ? 'bg-gradient-to-r from-gray-600 to-gray-800 text-white shadow-md'
                      : 'text-gray-300 hover:bg-gray-700/60'
                  }`}
                >
                  Terminés
                </button>
                <button
                  onClick={() => handleStatusChange('CANCELLED')}
                  className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
                    selectedStatus === 'CANCELLED'
                      ? 'bg-gradient-to-r from-red-600 to-red-800 text-white shadow-md'
                      : 'text-gray-300 hover:bg-gray-700/60'
                  }`}
                >
                  Annulés
                </button>
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
            <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
              <span className="w-8 h-8 bg-purple-500/10 rounded-full flex items-center justify-center">
                <Filter className="w-4 h-4 text-purple-400" />
              </span>
              Filtres additionnels
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Lieu</label>
                <select className="bg-gray-900/70 text-white w-full px-4 py-2.5 rounded-xl border border-gray-700/70 focus:border-purple-500/70 focus:ring-1 focus:ring-purple-500/70 transition-all shadow-inner">
                  <option value="">Tous les lieux</option>
                  <option value="Paris">Paris</option>
                  <option value="Lyon">Lyon</option>
                  <option value="Marseille">Marseille</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Date</label>
                <select className="bg-gray-900/70 text-white w-full px-4 py-2.5 rounded-xl border border-gray-700/70 focus:border-purple-500/70 focus:ring-1 focus:ring-purple-500/70 transition-all shadow-inner">
                  <option value="">Toutes les dates</option>
                  <option value="this-week">Cette semaine</option>
                  <option value="this-month">Ce mois-ci</option>
                  <option value="next-month">Mois prochain</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Prix</label>
                <select className="bg-gray-900/70 text-white w-full px-4 py-2.5 rounded-xl border border-gray-700/70 focus:border-purple-500/70 focus:ring-1 focus:ring-purple-500/70 transition-all shadow-inner">
                  <option value="">Tous les prix</option>
                  <option value="free">Gratuit</option>
                  <option value="paid">Payant</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
