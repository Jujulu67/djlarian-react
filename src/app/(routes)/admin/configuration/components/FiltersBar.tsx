'use client';

import { Search, SlidersHorizontal, Filter } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Checkbox } from '@/components/ui/Checkbox';
import { Button } from '@/components/ui/Button';
import type { ImageMeta } from '@/app/api/admin/images/shared';
import type { SortOption } from '../types';
import { logger } from '@/lib/logger';

interface FiltersBarProps {
  images: ImageMeta[];
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  filter: string;
  setFilter: (filter: string) => void;
  sortOption: SortOption;
  setSortOption: (option: SortOption) => void;
  showDuplicates: boolean;
  setShowDuplicates: (show: boolean) => void;
  itemsPerPage: number;
  setItemsPerPage: (items: number) => void;
  setCurrentPage: (page: number) => void;
  isMultiSelectMode: boolean;
  setIsMultiSelectMode: (mode: boolean) => void;
  setSelectedImageIds: (ids: string[]) => void;
  onReset: () => void;
}

export function FiltersBar({
  images,
  searchTerm,
  setSearchTerm,
  filter,
  setFilter,
  sortOption,
  setSortOption,
  showDuplicates,
  setShowDuplicates,
  itemsPerPage,
  setItemsPerPage,
  setCurrentPage,
  isMultiSelectMode,
  setIsMultiSelectMode,
  setSelectedImageIds,
  onReset,
}: FiltersBarProps) {
  // Filtrer les types qui ne sont pas "Autre"
  const filteredTypes = [
    ...Array.from(new Set(images.map((img) => img.type))).filter((type) => type !== 'Autre'),
  ];

  return (
    <div className="mb-6 flex flex-wrap items-center bg-gray-900/70 border border-gray-800 rounded-xl px-5 py-4 shadow-md">
      <div className="w-full flex items-center gap-3 mb-3 justify-between">
        <div className="relative flex-grow w-full">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-gray-400" />
          </div>
          <Input
            placeholder="Rechercher..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-gray-800/80 border-gray-700 focus:border-purple-500"
            aria-label="Rechercher une image"
          />
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {filteredTypes.length > 0 && (
            <div className="flex items-center gap-2 min-w-[120px]">
              <Filter className="h-4 w-4 text-gray-400" />
              <Select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                options={filteredTypes.map((type) => ({ value: type, label: type }))}
                className="w-full"
                aria-label="Filtrer par type"
              />
            </div>
          )}
          <div className="flex items-center gap-2 min-w-[160px]">
            <SlidersHorizontal className="h-4 w-4 text-gray-400" />
            <Select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value as SortOption)}
              options={[
                { value: 'date-desc', label: 'Plus récent' },
                { value: 'date-asc', label: 'Plus ancien' },
                { value: 'name-asc', label: 'Nom A-Z' },
                { value: 'name-desc', label: 'Nom Z-A' },
                { value: 'size-asc', label: 'Taille croissante' },
                { value: 'size-desc', label: 'Taille décroissante' },
                { value: 'type', label: 'Type' },
                { value: 'linked', label: 'Liées en premier' },
              ]}
              className="w-full"
              aria-label="Trier les images"
            />
          </div>
        </div>
      </div>

      <div className="w-full flex flex-wrap items-center gap-3 justify-between">
        <div className="flex items-center gap-3">
          <Checkbox
            checked={showDuplicates}
            onCheckedChange={(checked) => {
              setShowDuplicates(checked);
              logger.debug('[DEBUG] Checkbox Doublons changé:', checked);
            }}
            label="Doublons"
            aria-label="Afficher uniquement les doublons"
          />

          <div className="flex items-center gap-2 min-w-[160px]">
            <Select
              value={String(itemsPerPage)}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              options={[
                { value: '25', label: '25 par page' },
                { value: '50', label: '50 par page' },
                { value: '100', label: '100 par page' },
              ]}
              className="w-full"
              aria-label="Nombre d'images par page"
            />
          </div>
        </div>

        <div className="flex gap-2">
          {!showDuplicates && (
            <Button
              variant={isMultiSelectMode ? 'secondary' : 'default'}
              size="sm"
              onClick={() => {
                setIsMultiSelectMode(!isMultiSelectMode);
                setSelectedImageIds([]);
              }}
              aria-pressed={isMultiSelectMode}
              aria-label="Activer le mode sélection multiple"
              className={`whitespace-nowrap min-w-[140px] px-4 py-2 transition-all duration-200 ${
                isMultiSelectMode
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20'
                  : 'bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white'
              }`}
            >
              {isMultiSelectMode ? '✓ Mode sélection' : '+ Sélection multiple'}
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={onReset}
            aria-label="Réinitialiser les filtres"
            className="bg-gradient-to-r from-gray-800 to-gray-700 hover:from-gray-700 hover:to-gray-600 text-white border-gray-600 hover:border-gray-500 px-4 py-2"
          >
            Réinitialiser
          </Button>
        </div>
      </div>
    </div>
  );
}

