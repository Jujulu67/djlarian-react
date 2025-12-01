'use client';

import { debounce } from 'lodash';
import { Search, RotateCcw } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useCallback, useEffect, useMemo } from 'react';

import { Select } from '@/components/ui/Select';
import { LiveSubmissionStatus } from '@/types/live';

interface SubmissionsFiltersProps {
  searchValue?: string;
  statusValue?: string;
}

export function SubmissionsFilters({
  searchValue = '',
  statusValue = '',
}: SubmissionsFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState(searchValue);
  const [status, setStatus] = useState(statusValue);

  // Update URL with new params
  const updateSearchParams = useCallback(
    (params: Record<string, string>) => {
      const newParams = new URLSearchParams(searchParams.toString());

      // Update or remove params
      Object.entries(params).forEach(([key, value]) => {
        if (value) {
          newParams.set(key, value);
        } else {
          newParams.delete(key);
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

  // Initialiser l'état local avec les valeurs issues des props
  useEffect(() => {
    setSearch(searchValue);
    setStatus(statusValue);
  }, [searchValue, statusValue]);

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

  // Reset all filters
  const handleReset = () => {
    setSearch('');
    setStatus('');
    router.push('/admin/live');
  };

  return (
    <div className="grid gap-4 grid-cols-1 md:grid-cols-12 mb-6 items-center">
      {/* Barre de recherche */}
      <div className="relative md:col-span-6">
        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
          <Search className="w-4 h-4 text-gray-400" />
        </div>
        <input
          placeholder="Rechercher par titre, utilisateur..."
          className="w-full rounded-md border border-gray-600 pl-10 pr-4 py-2.5 text-sm bg-gray-800/70 text-gray-100 transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50"
          value={search}
          onChange={handleSearchChange}
        />
      </div>

      {/* Filtre par statut */}
      <div className="md:col-span-4">
        <Select
          options={[
            { value: '', label: 'Tous les statuts' },
            { value: LiveSubmissionStatus.PENDING, label: 'En attente' },
            { value: LiveSubmissionStatus.APPROVED, label: 'Approuvées' },
            { value: LiveSubmissionStatus.REJECTED, label: 'Rejetées' },
          ]}
          value={status}
          onChange={handleStatusChange}
          className="w-full bg-gray-800/70 border-gray-600 text-gray-100 rounded-md focus:border-purple-500 focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50"
        />
      </div>

      {/* Bouton de réinitialisation */}
      <div className="md:col-span-2">
        <button
          onClick={handleReset}
          className="w-full inline-flex items-center justify-center px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-md transition-colors shadow-md"
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          Réinitialiser
        </button>
      </div>
    </div>
  );
}
