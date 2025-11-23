import { Search } from 'lucide-react';
import React from 'react';

import { logger } from '@/lib/logger';
import type { DetectedRelease } from '@/lib/services/types';

interface ReleaseFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  hideImported: boolean;
  onHideImportedChange: (value: boolean) => void;
  showScheduledOnly: boolean;
  onShowScheduledOnlyChange: (value: boolean) => void;
  releases: DetectedRelease[];
}

export function ReleaseFilters({
  searchTerm,
  onSearchChange,
  hideImported,
  onHideImportedChange,
  showScheduledOnly,
  onShowScheduledOnlyChange,
  releases,
}: ReleaseFiltersProps) {
  if (!releases.length) return null;

  return (
    <div className="mb-6 space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
        <input
          placeholder="Filtrer…"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-9 pr-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:ring-purple-500 text-sm"
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex items-center">
          <label className="flex items-center cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showScheduledOnly}
              onChange={() => {
                const newValue = !showScheduledOnly;
                logger.debug('[AUTO-DETECT] Switch - changement showScheduledOnly:', {
                  from: showScheduledOnly,
                  to: newValue,
                });
                logger.debug(
                  '[AUTO-DETECT] Switch - releases scheduled:',
                  releases.filter((r) => r.isScheduled).length
                );
                onShowScheduledOnlyChange(newValue);
              }}
              className="sr-only"
            />
            <div
              className={`w-10 h-5 rounded-full ${showScheduledOnly ? 'bg-purple-600' : 'bg-gray-700'} relative`}
            >
              <div
                className={`absolute left-0.5 top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${showScheduledOnly ? 'translate-x-5' : ''}`}
              />
            </div>
            <span className="ml-2 text-sm text-gray-300">Afficher uniquement les pré-releases</span>
          </label>
        </div>
        <div className="flex items-center">
          <label className="flex items-center cursor-pointer select-none">
            <input
              type="checkbox"
              checked={hideImported}
              onChange={() => {
                const newValue = !hideImported;
                logger.debug('[AUTO-DETECT] Switch - changement hideImported:', {
                  from: hideImported,
                  to: newValue,
                });
                logger.debug('[AUTO-DETECT] Switch - releases totales:', releases.length);
                logger.debug(
                  '[AUTO-DETECT] Switch - releases avec exists=true:',
                  releases.filter((r) => r.exists).length
                );
                onHideImportedChange(newValue);
              }}
              className="sr-only"
            />
            <div
              className={`w-10 h-5 rounded-full ${hideImported ? 'bg-purple-600' : 'bg-gray-700'} relative`}
            >
              <div
                className={`absolute left-0.5 top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${hideImported ? 'translate-x-5' : ''}`}
              />
            </div>
            <span className="ml-2 text-sm text-gray-300">Masquer les déjà importées</span>
          </label>
        </div>
      </div>
    </div>
  );
}
