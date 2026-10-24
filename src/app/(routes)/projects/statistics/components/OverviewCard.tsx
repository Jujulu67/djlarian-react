'use client';

import { Music2 } from 'lucide-react';

import { PROJECT_STATUSES } from '@/components/projects/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

import { getStatusColor } from '../statusColors';
import { type StatisticsData, type YearViewMode } from '../types';

interface OverviewCardProps {
  yearViewMode: YearViewMode;
  selectedYear: number;
  displayStats: StatisticsData;
}

export function OverviewCard({ yearViewMode, selectedYear, displayStats }: OverviewCardProps) {
  return (
    <Card className="glass border border-purple-500/20 bg-black/30 backdrop-blur-md text-white">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Music2 className="mr-2 h-5 w-5 text-purple-400" />
          Vue d'ensemble
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="flex items-baseline gap-4">
            <div className="text-5xl font-bold text-purple-400">{displayStats.totalProjects}</div>
            <div className="text-gray-400">
              projets {yearViewMode === 'year' ? `en ${selectedYear}` : 'au total'}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {PROJECT_STATUSES.map((status) => {
              const count =
                displayStats.statusBreakdown[
                  status.value as keyof typeof displayStats.statusBreakdown
                ] || 0;
              const percentage =
                displayStats.totalProjects > 0
                  ? Math.round((count / displayStats.totalProjects) * 100)
                  : 0;

              return (
                <div
                  key={status.value}
                  className={`p-4 rounded-lg border ${getStatusColor(status.value)}`}
                >
                  <div className="text-2xl font-bold mb-1">{count}</div>
                  <div className="text-sm opacity-80">{status.label}</div>
                  <div className="text-xs mt-1 opacity-60">{percentage}%</div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
