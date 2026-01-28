'use client';

import { AdminLiveActions } from './AdminLiveActions';
import { AdminLivePlayer } from './AdminLivePlayer';
import { AdminLiveSubmissionsTable } from './AdminLiveSubmissionsTable';
import { LivePoolStats } from './LivePoolStats';
import { AdminLivePlayerProvider } from '../context/AdminLivePlayerContext';
import { AdminLiveSubmissionsProvider } from '../context/AdminLiveSubmissionsContext';

import { SubmissionsFilters } from './SubmissionsFilters';
import { useSearchParams } from 'next/navigation';

export function AdminLiveDashboard() {
  const searchParams = useSearchParams();
  const search = searchParams.get('search') || '';
  const status = searchParams.get('status') || '';

  return (
    <AdminLivePlayerProvider>
      <AdminLiveSubmissionsProvider>
        <div className="h-[calc(100vh-4rem)] overflow-y-auto pt-4 sm:pt-8 pb-6 lg:pb-8 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
            {/* Pool Stats */}
            <LivePoolStats />

            {/* Section ACTIONS */}
            <AdminLiveActions />

            {/* Filtres globaux */}
            <SubmissionsFilters searchValue={search} statusValue={status} />

            {/* Waveform Player */}
            <AdminLivePlayer />

            {/* Tableau SUBMISSIONS */}
            <AdminLiveSubmissionsTable />
          </div>
        </div>
      </AdminLiveSubmissionsProvider>
    </AdminLivePlayerProvider>
  );
}
