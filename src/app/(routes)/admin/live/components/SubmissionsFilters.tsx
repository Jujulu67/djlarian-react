'use client';

import { debounce } from 'lodash';
import { Search, RotateCcw } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useCallback, useEffect, useMemo } from 'react';

import { LegacySelect as Select } from '@/components/ui/LegacySelect';
import { LiveSubmissionStatus } from '@/types/live';

interface SubmissionsFiltersProps {
  // Les props peuvent être optionnelles car elles sont lues depuis searchParams dans le composant
  searchValue?: string;
  statusValue?: string;
}

export function SubmissionsFilters({
  searchValue = '',
  statusValue = '',
}: SubmissionsFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState(searchValue || searchParams.get('search') || '');
  const [status, setStatus] = useState(statusValue || searchParams.get('status') || '');
  const [showRolled, setShowRolled] = useState(searchParams.get('showRolled') !== 'false');
  const [onlyActive, setOnlyActive] = useState(searchParams.get('onlyActive') === 'true');

  // Update URL with new params
  const updateSearchParams = useCallback(
    (params: Record<string, string | boolean | null>) => {
      const newParams = new URLSearchParams(searchParams.toString());

      // Update or remove params
      Object.entries(params).forEach(([key, value]) => {
        if (value === null || value === '' || value === undefined) {
          newParams.delete(key);
        } else {
          newParams.set(key, String(value));
        }
      });

      // Toujours revenir à la première page quand on change les filtres
      newParams.delete('page');

      router.push(`/admin/live?${newParams.toString()}`);
    },
    [searchParams, router]
  );

  // Debounced search function
  const debouncedSearch = useMemo(
    () =>
      debounce((value: string) => {
        updateSearchParams({ search: value });
      }, 300),
    [updateSearchParams]
  );

  // Initialiser l'état local avec les valeurs issues de l'URL
  useEffect(() => {
    setSearch(searchParams.get('search') || '');
    setStatus(searchParams.get('status') || '');
    setShowRolled(searchParams.get('showRolled') !== 'false');
    setOnlyActive(searchParams.get('onlyActive') === 'true');
  }, [searchParams]);

  useEffect(() => {
    return () => {
      debouncedSearch.cancel();
    };
  }, [debouncedSearch]);

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearch(value);
    debouncedSearch(value);
  };

  // Handle status selection change
  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setStatus(value);
    updateSearchParams({ status: value });
  };

  // Handle Checkboxes
  const handleToggleShowRolled = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    setShowRolled(checked);
    updateSearchParams({ showRolled: checked ? null : 'false' }); // null supprime le param (par défaut true)
  };

  const handleToggleOnlyActive = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    setOnlyActive(checked);
    updateSearchParams({ onlyActive: checked ? 'true' : null });
  };

  // Reset all filters
  const handleReset = () => {
    setSearch('');
    setStatus('');
    setShowRolled(true);
    setOnlyActive(false);
    router.push('/admin/live');
  };

  return (
    <div className="glass-modern p-4 sm:p-6 rounded-2xl mb-6">
      <div className="grid gap-4 grid-cols-1 md:grid-cols-12 items-center">
        {/* Barre de recherche */}
        <div className="relative md:col-span-12 lg:col-span-5">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <Search className="w-4 h-4 text-gray-400" />
          </div>
          <input
            placeholder="Rechercher par titre, utilisateur..."
            className="w-full rounded-lg border border-white/10 pl-10 pr-4 py-2 text-sm bg-white/5 text-white transition-colors focus:border-purple-500/50 focus:outline-none focus:ring-2 focus:ring-purple-500/30"
            value={search}
            onChange={handleSearchChange}
          />
        </div>

        {/* Filtre par statut */}
        <div className="md:col-span-6 lg:col-span-3">
          <Select
            options={[
              { value: '', label: 'Tous les statuts' },
              { value: LiveSubmissionStatus.PENDING, label: 'En attente' },
              { value: LiveSubmissionStatus.APPROVED, label: 'Approuvées' },
              { value: LiveSubmissionStatus.REJECTED, label: 'Rejetées' },
            ]}
            value={status}
            onChange={handleStatusChange}
            className="w-full bg-white/5 border-white/10 text-white rounded-lg focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/30"
          />
        </div>

        {/* Checkboxes */}
        <div className="md:col-span-6 lg:col-span-3 flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer group">
            <input
              type="checkbox"
              checked={showRolled}
              onChange={handleToggleShowRolled}
              className="w-4 h-4 text-purple-600 rounded border-white/10 bg-white/5 focus:ring-purple-500/50"
            />
            <span className="text-sm text-gray-400 group-hover:text-gray-200 transition-colors">
              Rolled
            </span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer group">
            <input
              type="checkbox"
              checked={onlyActive}
              onChange={handleToggleOnlyActive}
              className="w-4 h-4 text-purple-600 rounded border-white/10 bg-white/5 focus:ring-purple-500/50"
            />
            <span className="text-sm text-gray-400 group-hover:text-gray-200 transition-colors">
              Active
            </span>
          </label>
        </div>

        {/* Bouton de réinitialisation */}
        <div className="lg:col-span-1 flex justify-end">
          <button
            onClick={handleReset}
            className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-all"
            title="Réinitialiser les filtres"
          >
            <RotateCcw className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
