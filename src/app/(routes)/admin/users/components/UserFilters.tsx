'use client';

import debounce from 'lodash/debounce';
import { Search, X } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';

export const UserFilters = () => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const updateFilters = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', '1');

    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }

    router.push(`/admin/users?${params.toString()}`);
  };

  const handleSearch = debounce((value: string) => {
    updateFilters('query', value);
  }, 300);

  const handleReset = () => {
    router.push('/admin/users');
  };

  if (!mounted) return null;

  return (
    <div className="rounded-lg bg-white p-4 shadow-sm dark:bg-gray-850">
      <div className="flex flex-col space-y-3 md:flex-row md:items-center md:space-x-4 md:space-y-0">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Rechercher..."
            defaultValue={searchParams.get('query') || ''}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-10 pr-10"
          />
          {searchParams.get('query') && (
            <button
              onClick={() => updateFilters('query', '')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none dark:hover:text-gray-300"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="w-full md:w-48">
          <Select
            defaultValue={searchParams.get('role') || ''}
            onChange={(e) => updateFilters('role', e.target.value)}
            options={[
              { value: '', label: 'Tous les rôles' },
              { value: 'ADMIN', label: 'Admin' },
              { value: 'USER', label: 'Utilisateur' },
            ]}
          />
        </div>

        <div className="w-full md:w-48">
          <Select
            defaultValue={searchParams.get('status') || ''}
            onChange={(e) => updateFilters('status', e.target.value)}
            options={[
              { value: '', label: 'Tous les statuts' },
              { value: 'ACTIVE', label: 'Actif' },
              { value: 'BLOCKED', label: 'Bloqué' },
            ]}
          />
        </div>

        {(searchParams.get('query') || searchParams.get('role') || searchParams.get('status')) && (
          <Button onClick={handleReset} variant="outline" className="flex items-center space-x-1">
            <X className="h-4 w-4" />
            <span>Réinitialiser</span>
          </Button>
        )}
      </div>
    </div>
  );
};
