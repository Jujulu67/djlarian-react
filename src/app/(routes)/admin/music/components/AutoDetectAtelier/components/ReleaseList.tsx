import { Plus, RefreshCw } from 'lucide-react';
import React from 'react';

import type { DetectedRelease } from '@/lib/services/types';

import { ReleaseItem } from './ReleaseItem';

interface ReleaseListProps {
  releases: DetectedRelease[];
  filteredReleases: DetectedRelease[];
  selectedReleases: string[];
  onToggleSelection: (id: string) => void;
  onStartImport: () => void;
  isSubmitting: boolean;
}

export function ReleaseList({
  releases,
  filteredReleases,
  selectedReleases,
  onToggleSelection,
  onStartImport,
  isSubmitting,
}: ReleaseListProps) {
  if (!releases.length) return null;

  return (
    <div className="mb-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-white font-medium">{filteredReleases.length} releases trouvées</h3>
        <button
          onClick={onStartImport}
          disabled={isSubmitting || !selectedReleases.length}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm flex items-center gap-2 disabled:opacity-50"
        >
          {isSubmitting ? (
            <>
              <RefreshCw className="w-3 h-3 animate-spin" /> Import…
            </>
          ) : (
            <>
              <Plus className="w-3 h-3" /> Importer la sélection ({selectedReleases.length})
            </>
          )}
        </button>
      </div>
      <div className="space-y-4">
        {filteredReleases.map((r) => (
          <ReleaseItem
            key={r.id}
            release={r}
            isSelected={selectedReleases.includes(r.id)}
            onToggle={onToggleSelection}
          />
        ))}
      </div>
    </div>
  );
}
