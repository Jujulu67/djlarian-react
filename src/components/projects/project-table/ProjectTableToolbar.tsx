'use client';

import { BarChart3, Download, RefreshCw, Trash2, Upload } from 'lucide-react';
import type { Dispatch, SetStateAction } from 'react';

import { AddProjectRow } from '../AddProjectRow';
import { ProjectStatus } from '../types';

interface ProjectTableToolbarProps {
  defaultStatus: ProjectStatus | 'ALL';
  isAdding: boolean;
  isLoading: boolean;
  onCreate: (data: { name: string; status: ProjectStatus }) => Promise<void>;
  onExport: (() => void) | undefined;
  onImport: (() => void) | undefined;
  onImportStreams: (() => void) | undefined;
  onPurge: (() => void) | undefined;
  onRefresh: (() => void) | undefined;
  onStatistics: (() => void) | undefined;
  projectsCount: number;
  setIsAdding: Dispatch<SetStateAction<boolean>>;
}

export function ProjectTableToolbar({
  defaultStatus,
  isAdding,
  isLoading,
  onCreate,
  onExport,
  onImport,
  onImportStreams,
  onPurge,
  onRefresh,
  onStatistics,
  projectsCount,
  setIsAdding,
}: ProjectTableToolbarProps) {
  return (
    <div className="flex items-center gap-3 flex-wrap justify-between">
      <AddProjectRow
        onAdd={onCreate}
        isAdding={isAdding}
        setIsAdding={setIsAdding}
        defaultStatus={defaultStatus}
      />
      <div className="flex items-center gap-2">
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="px-3 py-2 h-[38px] text-gray-400 hover:text-white hover:bg-white/10 rounded-lg border border-gray-700/70 hover:border-gray-500/70 transition-all disabled:opacity-50 flex items-center justify-center"
            title="Rafraîchir"
            aria-label="Rafraîchir la liste des projets"
          >
            <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} aria-hidden="true" />
          </button>
        )}
        {onStatistics && (
          <button
            onClick={onStatistics}
            className="px-3 py-2 h-[38px] glass-modern glass-modern-hover rounded-lg transition-all flex items-center gap-2 text-sm font-medium text-white border border-violet-500/30 hover:border-violet-400/50 hover:shadow-[0_8px_32px_0_rgba(139,92,246,0.35)] backdrop-blur-xl"
            style={{
              background: 'rgba(139, 92, 246, 0.28)',
            }}
            title="Voir les statistiques"
            aria-label="Voir les statistiques des projets"
          >
            <BarChart3 size={16} aria-hidden="true" />
            <span className="hidden sm:inline">Statistiques</span>
          </button>
        )}
        {onImport && (
          <button
            onClick={onImport}
            className="px-3 py-2 h-[38px] glass-modern glass-modern-hover rounded-lg transition-all flex items-center gap-2 text-sm font-medium text-white border border-fuchsia-500/30 hover:border-fuchsia-400/50 hover:shadow-[0_8px_32px_0_rgba(217,70,239,0.35)] backdrop-blur-xl"
            style={{
              background: 'rgba(217, 70, 239, 0.28)',
            }}
            title="Importer depuis Excel ou CSV"
            aria-label="Importer des projets depuis Excel ou CSV"
          >
            <Upload size={16} aria-hidden="true" />
            <span className="hidden sm:inline">Importer Excel/CSV</span>
          </button>
        )}
        {onImportStreams && (
          <button
            onClick={onImportStreams}
            className="px-3 py-2 h-[38px] glass-modern glass-modern-hover rounded-lg transition-all flex items-center gap-2 text-sm font-medium text-white border border-cyan-500/30 hover:border-cyan-400/50 hover:shadow-[0_8px_32px_0_rgba(6,182,212,0.35)] backdrop-blur-xl"
            style={{
              background: 'rgba(6, 182, 212, 0.28)',
            }}
            title="Importer des streams depuis CSV"
            aria-label="Importer des streams depuis CSV"
          >
            <Upload size={16} aria-hidden="true" />
            <span className="hidden sm:inline">Importer Streams CSV</span>
          </button>
        )}
        {onExport && (
          <button
            onClick={onExport}
            className="px-3 py-2 h-[38px] glass-modern glass-modern-hover rounded-lg transition-all flex items-center gap-2 text-sm font-medium text-white border border-teal-500/30 hover:border-teal-400/50 hover:shadow-[0_8px_32px_0_rgba(20,184,166,0.35)] backdrop-blur-xl"
            style={{
              background: 'rgba(20, 184, 166, 0.28)',
            }}
            title="Exporter vers Excel"
            aria-label="Exporter les projets vers Excel"
          >
            <Download size={16} aria-hidden="true" />
            <span className="hidden sm:inline">Exporter Excel</span>
          </button>
        )}
        {onPurge && (
          <button
            onClick={onPurge}
            disabled={isLoading || projectsCount === 0}
            className="px-4 py-2 h-[38px] glass-modern glass-modern-hover rounded-lg transition-all flex items-center gap-2 text-sm font-medium text-white border border-red-500/30 hover:border-red-400/50 hover:shadow-[0_8px_32px_0_rgba(239,68,68,0.35)] backdrop-blur-xl disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-none disabled:hover:border-red-500/30"
            style={{
              background:
                isLoading || projectsCount === 0
                  ? 'rgba(75, 85, 99, 0.25)'
                  : 'rgba(239, 68, 68, 0.28)',
            }}
            title="Supprimer tous les projets"
            aria-label="Purger tous les projets"
          >
            <Trash2 size={18} />
            <span className="hidden sm:inline">Purger</span>
          </button>
        )}
      </div>
    </div>
  );
}
