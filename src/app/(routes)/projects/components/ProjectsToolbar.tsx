'use client';

import { Filter, Search } from 'lucide-react';

import { PROJECT_STATUSES, Project, ProjectStatus } from '@/components/projects';
import { Checkbox } from '@/components/ui/Checkbox';

import { type FieldFilters, type SortDirection, type SortField } from '../projectsFiltering';

interface ProjectsToolbarProps {
  allProjects: Project[];
  counts: { total: number; statusBreakdown: Record<string, number> } | null;
  fieldFilters: FieldFilters;
  getFieldOptions: (field: keyof FieldFilters) => string[];
  handleFieldFilterChange: (field: keyof FieldFilters, value: string) => void;
  searchTerm: string;
  setFieldFilters: React.Dispatch<React.SetStateAction<FieldFilters>>;
  setSearchTerm: React.Dispatch<React.SetStateAction<string>>;
  setShowFilters: React.Dispatch<React.SetStateAction<boolean>>;
  setShowReleasedProjects: React.Dispatch<React.SetStateAction<boolean>>;
  setShowStats: React.Dispatch<React.SetStateAction<boolean>>;
  setSortDirection: React.Dispatch<React.SetStateAction<SortDirection>>;
  setSortField: React.Dispatch<React.SetStateAction<SortField>>;
  setStatusFilter: React.Dispatch<React.SetStateAction<ProjectStatus | 'ALL'>>;
  showFilters: boolean;
  showReleasedProjects: boolean;
  showStats: boolean;
  sortField: SortField;
  statusFilter: ProjectStatus | 'ALL';
}

export function ProjectsToolbar({
  allProjects,
  counts,
  fieldFilters,
  getFieldOptions,
  handleFieldFilterChange,
  searchTerm,
  setFieldFilters,
  setSearchTerm,
  setShowFilters,
  setShowReleasedProjects,
  setShowStats,
  setSortDirection,
  setSortField,
  setStatusFilter,
  showFilters,
  showReleasedProjects,
  showStats,
  sortField,
  statusFilter,
}: ProjectsToolbarProps) {
  return (
    <div className="glass-modern rounded-2xl p-4 sm:p-6">
      <div className="flex flex-col gap-4">
        {/* Ligne 1: Recherche */}
        <div className="flex gap-3 items-center flex-wrap">
          {/* Champ de recherche */}
          <div className="relative flex-1 min-w-[200px]">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Rechercher un projet..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-gray-900/70 text-white w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-700/70 focus:border-purple-500/70 focus:ring-1 focus:ring-purple-500/70 transition-all shadow-inner text-sm"
            />
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-3 lg:items-center">
          {/* Ligne 2: Checkboxes */}
          <div className="flex gap-3 items-center flex-wrap lg:flex-nowrap">
            {/* Checkbox pour masquer/afficher les projets sortis */}
            <div className="px-3 py-2 bg-gray-800/70 backdrop-blur-md rounded-xl border border-gray-700/70 flex-1 sm:flex-none">
              <Checkbox
                checked={showReleasedProjects}
                onCheckedChange={setShowReleasedProjects}
                label={
                  <>
                    <span className="sm:hidden">Projets sortis</span>
                    <span className="hidden sm:inline">Afficher les projets sortis</span>
                  </>
                }
                labelClassName="text-sm text-gray-300 whitespace-nowrap"
              />
            </div>

            {/* Checkbox pour masquer/afficher les stats */}
            <div className="px-3 py-2 bg-gray-800/70 backdrop-blur-md rounded-xl border border-gray-700/70 flex-1 sm:flex-none">
              <Checkbox
                checked={showStats}
                onCheckedChange={setShowStats}
                label={
                  <>
                    <span className="sm:hidden">Stats</span>
                    <span className="hidden sm:inline">Afficher les stats</span>
                  </>
                }
                labelClassName="text-sm text-gray-300 whitespace-nowrap"
              />
            </div>
          </div>

          {/* Ligne 3: Filtres par statut */}
          <div className="flex gap-3 items-center flex-1 min-w-0">
            {/* Filtres par statut - scrollables sur mobile */}
            <div className="bg-gray-800/70 backdrop-blur-md rounded-xl p-1.5 flex items-center border border-gray-700/70 shadow-lg overflow-x-auto flex-1 min-w-0">
              <div className="flex gap-1 min-w-max">
                <button
                  onClick={() => setStatusFilter('ALL')}
                  className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
                    statusFilter === 'ALL'
                      ? 'bg-gradient-to-r from-purple-600 to-purple-800 text-white shadow-md'
                      : 'text-gray-300 hover:bg-gray-700/60'
                  }`}
                >
                  Tous ({counts?.total ?? allProjects.length})
                </button>
                {PROJECT_STATUSES.map((status) => {
                  const count =
                    counts?.statusBreakdown?.[status.value] ??
                    allProjects.filter((p) => p.status === status.value).length;
                  return (
                    <button
                      key={status.value}
                      onClick={() => setStatusFilter(status.value)}
                      className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
                        statusFilter === status.value
                          ? 'bg-gradient-to-r from-purple-600 to-purple-800 text-white shadow-md'
                          : 'text-gray-300 hover:bg-gray-700/60'
                      }`}
                    >
                      {status.label} ({count})
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              {(searchTerm ||
                Object.values(fieldFilters).some((v) => v.trim()) ||
                sortField !== null) && (
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setFieldFilters({
                      name: '',
                      style: '',
                      collab: '',
                      label: '',
                      labelFinal: '',
                      externalLink: '',
                    });
                    setSortField(null);
                    setSortDirection('asc');
                  }}
                  className="text-sm text-gray-400 hover:text-purple-400 transition-colors px-3 py-2 bg-gray-800/70 rounded-xl border border-gray-700/70 hover:border-purple-500/70"
                  title="Réinitialiser les filtres"
                >
                  Réinitialiser
                </button>
              )}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`bg-gray-800/70 p-3 rounded-xl border transition-all ${
                  showFilters
                    ? 'border-purple-500/70 text-purple-400 bg-purple-500/10'
                    : 'border-gray-700/70 text-gray-300 hover:border-gray-500/70'
                }`}
                aria-label="Plus de filtres"
                title="Filtres additionnels"
              >
                <Filter className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Filtres additionnels par champ */}
        {showFilters && (
          <div className="mt-2 pt-4 border-t border-gray-700/50 animate-fadeIn">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Nom */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Nom Projet</label>
                <select
                  value={fieldFilters.name}
                  onChange={(e) => handleFieldFilterChange('name', e.target.value)}
                  className="bg-gray-900/70 text-white w-full px-4 py-2.5 rounded-xl border border-gray-700/70 focus:border-purple-500/70 focus:ring-1 focus:ring-purple-500/70 transition-all shadow-inner text-sm"
                >
                  <option value="">Tous les noms</option>
                  {getFieldOptions('name').map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Style */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Style</label>
                <select
                  value={fieldFilters.style}
                  onChange={(e) => handleFieldFilterChange('style', e.target.value)}
                  className="bg-gray-900/70 text-white w-full px-4 py-2.5 rounded-xl border border-gray-700/70 focus:border-purple-500/70 focus:ring-1 focus:ring-purple-500/70 transition-all shadow-inner text-sm"
                >
                  <option value="">Tous les styles</option>
                  {getFieldOptions('style').map((style) => (
                    <option key={style} value={style}>
                      {style}
                    </option>
                  ))}
                </select>
              </div>

              {/* Collab */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Collab</label>
                <select
                  value={fieldFilters.collab}
                  onChange={(e) => handleFieldFilterChange('collab', e.target.value)}
                  className="bg-gray-900/70 text-white w-full px-4 py-2.5 rounded-xl border border-gray-700/70 focus:border-purple-500/70 focus:ring-1 focus:ring-purple-500/70 transition-all shadow-inner text-sm"
                >
                  <option value="">Toutes les collabs</option>
                  {getFieldOptions('collab').map((collab) => (
                    <option key={collab} value={collab}>
                      {collab}
                    </option>
                  ))}
                </select>
              </div>

              {/* Label */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Label</label>
                <select
                  value={fieldFilters.label}
                  onChange={(e) => handleFieldFilterChange('label', e.target.value)}
                  className="bg-gray-900/70 text-white w-full px-4 py-2.5 rounded-xl border border-gray-700/70 focus:border-purple-500/70 focus:ring-1 focus:ring-purple-500/70 transition-all shadow-inner text-sm"
                >
                  <option value="">Tous les labels</option>
                  {getFieldOptions('label').map((label) => (
                    <option key={label} value={label}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Label Final */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Label Final</label>
                <select
                  value={fieldFilters.labelFinal}
                  onChange={(e) => handleFieldFilterChange('labelFinal', e.target.value)}
                  className="bg-gray-900/70 text-white w-full px-4 py-2.5 rounded-xl border border-gray-700/70 focus:border-purple-500/70 focus:ring-1 focus:ring-purple-500/70 transition-all shadow-inner text-sm"
                >
                  <option value="">Tous les labels finaux</option>
                  {getFieldOptions('labelFinal').map((labelFinal) => (
                    <option key={labelFinal} value={labelFinal}>
                      {labelFinal}
                    </option>
                  ))}
                </select>
              </div>

              {/* Lien */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Lien</label>
                <select
                  value={fieldFilters.externalLink}
                  onChange={(e) => handleFieldFilterChange('externalLink', e.target.value)}
                  className="bg-gray-900/70 text-white w-full px-4 py-2.5 rounded-xl border border-gray-700/70 focus:border-purple-500/70 focus:ring-1 focus:ring-purple-500/70 transition-all shadow-inner text-sm"
                >
                  <option value="">Tous les liens</option>
                  {getFieldOptions('externalLink').map((link) => (
                    <option key={link} value={link}>
                      {link}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
