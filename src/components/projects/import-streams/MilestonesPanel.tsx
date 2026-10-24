'use client';

import { BarChart3 } from 'lucide-react';

import type { StreamsMilestones } from '@/lib/utils/calculateStreamsMilestones';

const SHORT_TERM_MILESTONES: ReadonlyArray<{ key: keyof StreamsMilestones; label: string }> = [
  { key: 'streamsJ7', label: 'J7' },
  { key: 'streamsJ14', label: 'J14' },
  { key: 'streamsJ21', label: 'J21' },
  { key: 'streamsJ28', label: 'J28' },
  { key: 'streamsJ56', label: 'J56' },
  { key: 'streamsJ84', label: 'J84' },
];

const LONG_TERM_MILESTONES: ReadonlyArray<{ key: keyof StreamsMilestones; label: string }> = [
  { key: 'streamsJ180', label: 'J180 (6 mois)' },
  { key: 'streamsJ365', label: 'J365 (1 an)' },
];

function MilestoneGrid({
  items,
  milestones,
  gridClassName,
}: {
  items: ReadonlyArray<{ key: keyof StreamsMilestones; label: string }>;
  milestones: StreamsMilestones;
  gridClassName: string;
}) {
  return (
    <div className={gridClassName}>
      {items.map((milestone) => {
        const value = milestones[milestone.key];
        return (
          <div
            key={milestone.key}
            className="bg-gray-800/50 p-3 rounded-lg border border-gray-700/50"
          >
            <span className="text-xs text-gray-400 block mb-1">{milestone.label}</span>
            <span className="text-white font-semibold text-sm">
              {value !== null ? (
                value.toLocaleString()
              ) : (
                <span className="text-gray-500 italic">N/A</span>
              )}
            </span>
          </div>
        );
      })}
    </div>
  );
}

interface MilestonesPanelProps {
  milestones: StreamsMilestones;
}

export function MilestonesPanel({ milestones }: MilestonesPanelProps) {
  return (
    <div className="mt-4 p-4 bg-gradient-to-br from-gray-900/80 to-gray-800/80 rounded-lg border border-gray-700/50">
      <p className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
        <BarChart3 className="w-4 h-4" />
        Jalons calculés:
      </p>

      {/* Jalons court terme (J7-J84) */}
      <div className="mb-4">
        <p className="text-xs text-gray-500 mb-2 uppercase tracking-wider">Court terme</p>
        <MilestoneGrid
          items={SHORT_TERM_MILESTONES}
          milestones={milestones}
          gridClassName="grid grid-cols-2 md:grid-cols-3 gap-3"
        />
      </div>

      {/* Jalons long terme (J180-J365) */}
      <div>
        <p className="text-xs text-gray-500 mb-2 uppercase tracking-wider">Long terme</p>
        <MilestoneGrid
          items={LONG_TERM_MILESTONES}
          milestones={milestones}
          gridClassName="grid grid-cols-2 gap-3"
        />
      </div>
    </div>
  );
}
