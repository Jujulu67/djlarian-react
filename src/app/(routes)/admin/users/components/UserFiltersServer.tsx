'use client';

import { debounce } from 'lodash';
import { Search, Star, RotateCcw } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useCallback, useEffect, useMemo } from 'react';

import { LegacySelect as Select } from '@/components/ui/LegacySelect';

interface UserFiltersServerProps {
  searchValue?: string;
  roleValue?: string;
  statusValue?: string;
}

export const UserFiltersServer = ({
  searchValue = '',
  roleValue = '',
  statusValue = '',
}: UserFiltersServerProps) => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState(searchValue);
  const [role, setRole] = useState(roleValue);
  const [isVipOnly, setIsVipOnly] = useState(statusValue === 'true');

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

      router.push(`/admin/users?${newParams.toString()}`);
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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSearch(searchValue);
    setRole(roleValue);
    setIsVipOnly(statusValue === 'true');
  }, [searchValue, roleValue, statusValue]);

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

  // Handle role selection change
  const handleRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setRole(value);
    updateSearchParams({ role: value });
  };

  // Handle VIP checkbox change
  const handleVipChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const isChecked = e.target.checked;
    setIsVipOnly(isChecked);
    updateSearchParams({ isVip: isChecked ? 'true' : '' });
  };

  // Reset all filters
  const handleReset = () => {
    setSearch('');
    setRole('');
    setIsVipOnly(false);
    router.push('/admin/users');
  };

  return (
    <div className="grid gap-4 grid-cols-1 md:grid-cols-12 mb-6 items-center">
      {/* Barre de recherche */}
      <div className="relative md:col-span-5">
        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
          <Search className="w-4 h-4 text-gray-400" />
        </div>
        <input
          placeholder="Rechercher un utilisateur..."
          className="w-full rounded-md border border-gray-600 pl-10 pr-4 py-2.5 text-sm bg-gray-800/70 text-gray-100 transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50"
          value={search}
          onChange={handleSearchChange}
        />
      </div>

      {/* Filtre par rôle */}
      <div className="md:col-span-2">
        <Select
          options={[
            { value: '', label: 'Tous les rôles' },
            { value: 'ADMIN', label: 'Admin' },
            { value: 'MODERATOR', label: 'Modérateur' },
            { value: 'USER', label: 'Utilisateur' },
          ]}
          value={role}
          onChange={handleRoleChange}
          className="w-full bg-gray-800/70 border-gray-600 text-gray-100 rounded-md focus:border-purple-500 focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50"
        />
      </div>

      {/* Checkbox pour VIP */}
      <div className="md:col-span-3 flex items-center">
        <label className="inline-flex items-center cursor-pointer">
          <div className="relative">
            <input
              type="checkbox"
              checked={isVipOnly}
              onChange={handleVipChange}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-700 rounded-full peer peer-focus:ring-2 peer-focus:ring-purple-500 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
          </div>
          <span className="ml-3 text-gray-100 flex items-center">
            <Star className="h-4 w-4 text-amber-400 mr-1" />
            VIP uniquement
          </span>
        </label>
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
};
