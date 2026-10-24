'use client';

import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { LineChart } from 'lucide-react';
import type { Dispatch, SetStateAction } from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart as RechartsLineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

import { type ComparisonMode, type ProjectMapping, type StreamsProject } from '../chartData';
import { getColorForIndex } from '../statusColors';
import { type StatisticsData, type StreamsChartData, type ViewMode } from '../types';

interface StreamsEvolutionChartProps {
  selectedProjectId: string | null;
  setSelectedProjectId: Dispatch<SetStateAction<string | null>>;
  viewMode: ViewMode;
  setViewMode: Dispatch<SetStateAction<ViewMode>>;
  selectedProjectsForComparison: string[];
  setSelectedProjectsForComparison: Dispatch<SetStateAction<string[]>>;
  comparisonMode: ComparisonMode;
  setComparisonMode: Dispatch<SetStateAction<ComparisonMode>>;
  comparisonYearFilter: number | null;
  setComparisonYearFilter: Dispatch<SetStateAction<number | null>>;
  availableYears: number[];
  displayStats: StatisticsData;
  selectedProject: StreamsProject | null;
  getFilteredProjectsForComparison: StreamsProject[];
  comparisonProjectMapping: ProjectMapping[];
  streamsChartData: StreamsChartData;
}

export function StreamsEvolutionChart({
  selectedProjectId,
  setSelectedProjectId,
  viewMode,
  setViewMode,
  selectedProjectsForComparison,
  setSelectedProjectsForComparison,
  comparisonMode,
  setComparisonMode,
  comparisonYearFilter,
  setComparisonYearFilter,
  availableYears,
  displayStats,
  selectedProject,
  getFilteredProjectsForComparison,
  comparisonProjectMapping,
  streamsChartData,
}: StreamsEvolutionChartProps) {
  return (
    <Card className="glass border border-purple-500/20 bg-black/30 backdrop-blur-md text-white">
      <CardHeader>
        <CardTitle className="flex items-center">
          <LineChart className="mr-2 h-5 w-5 text-purple-400" />
          Évolution des streams
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Toggle mode global/projet/comparaison */}
          <div className="flex items-center gap-4">
            <label className="text-sm text-gray-400">Mode d'affichage :</label>
            <div className="flex gap-2">
              <button
                onClick={() => setViewMode('project')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  viewMode === 'project'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-700/50 text-gray-300 hover:bg-gray-600/50'
                }`}
              >
                Projet
              </button>
              <button
                onClick={() => setViewMode('global')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  viewMode === 'global'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-700/50 text-gray-300 hover:bg-gray-600/50'
                }`}
              >
                Global
              </button>
              <button
                onClick={() => setViewMode('comparison')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  viewMode === 'comparison'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-700/50 text-gray-300 hover:bg-gray-600/50'
                }`}
              >
                Comparaison
              </button>
            </div>
          </div>

          {/* Sélecteur de projet (uniquement en mode projet) */}
          {viewMode === 'project' && displayStats.streamsEvolution.length > 0 && (
            <div>
              <label className="text-sm text-gray-400 mb-2 block">Sélectionner un projet :</label>
              <select
                value={selectedProjectId || ''}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="w-full sm:w-auto px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                {displayStats.streamsEvolution.map((project) => (
                  <option key={project.projectId} value={project.projectId}>
                    {project.projectName}
                    {project.releaseDate &&
                      ` (${format(new Date(project.releaseDate), 'yyyy', { locale: fr })})`}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Sélecteurs de projets (uniquement en mode comparaison) */}
          {viewMode === 'comparison' && displayStats.streamsEvolution.length > 0 && (
            <div className="space-y-4">
              {/* Toggle entre 2 projets et tous les projets */}
              <div className="flex items-center gap-4">
                <label className="text-sm text-gray-400">Type de comparaison :</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setComparisonMode('two');
                      setSelectedProjectsForComparison([]);
                    }}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      comparisonMode === 'two'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700/50 text-gray-300 hover:bg-gray-600/50'
                    }`}
                  >
                    2 projets
                  </button>
                  <button
                    onClick={() => {
                      setComparisonMode('all');
                      // Ne pas mettre à jour selectedProjectsForComparison ici,
                      // on utilisera getFilteredProjectsForComparison directement dans le rendu
                    }}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      comparisonMode === 'all'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700/50 text-gray-300 hover:bg-gray-600/50'
                    }`}
                  >
                    Tous les projets
                  </button>
                </div>
              </div>

              {/* Filtre par année */}
              <div className="flex items-center gap-4">
                <label className="text-sm text-gray-400">Filtrer par année :</label>
                <div className="flex gap-2 items-center">
                  <button
                    onClick={() => setComparisonYearFilter(null)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      comparisonYearFilter === null
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-700/50 text-gray-300 hover:bg-gray-600/50'
                    }`}
                  >
                    Toutes
                  </button>
                  <select
                    value={comparisonYearFilter || ''}
                    onChange={(e) => {
                      const year = e.target.value ? parseInt(e.target.value, 10) : null;
                      setComparisonYearFilter(year !== null && Number.isFinite(year) ? year : null);
                    }}
                    className="px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="">Sélectionner une année</option>
                    {availableYears.map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Sélecteurs pour 2 projets */}
              {comparisonMode === 'two' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-400 mb-2 block">Projet 1 :</label>
                    <select
                      value={selectedProjectsForComparison[0] || ''}
                      onChange={(e) => {
                        const newSelection = [...selectedProjectsForComparison];
                        newSelection[0] = e.target.value;
                        if (newSelection.length > 1 && newSelection[0] === newSelection[1]) {
                          newSelection[1] = '';
                        }
                        setSelectedProjectsForComparison(newSelection);
                      }}
                      className="w-full px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="">Sélectionner un projet</option>
                      {getFilteredProjectsForComparison.map((project) => (
                        <option
                          key={project.projectId}
                          value={project.projectId}
                          disabled={selectedProjectsForComparison[1] === project.projectId}
                        >
                          {project.projectName}
                          {project.style ? ` - ${project.style}` : ''}
                          {project.releaseDate &&
                            ` (${format(new Date(project.releaseDate), 'yyyy', { locale: fr })})`}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm text-gray-400 mb-2 block">Projet 2 :</label>
                    <select
                      value={selectedProjectsForComparison[1] || ''}
                      onChange={(e) => {
                        const newSelection = [...selectedProjectsForComparison];
                        newSelection[1] = e.target.value;
                        if (newSelection.length > 0 && newSelection[0] === newSelection[1]) {
                          newSelection[1] = '';
                        }
                        setSelectedProjectsForComparison(newSelection);
                      }}
                      className="w-full px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="">Sélectionner un projet</option>
                      {getFilteredProjectsForComparison.map((project) => (
                        <option
                          key={project.projectId}
                          value={project.projectId}
                          disabled={selectedProjectsForComparison[0] === project.projectId}
                        >
                          {project.projectName}
                          {project.style ? ` - ${project.style}` : ''}
                          {project.releaseDate &&
                            ` (${format(new Date(project.releaseDate), 'yyyy', { locale: fr })})`}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Message pour tous les projets */}
              {comparisonMode === 'all' && (
                <div className="p-3 rounded-lg border border-blue-500/30 bg-blue-500/10">
                  <p className="text-sm text-blue-400">
                    Comparaison de tous les projets ({getFilteredProjectsForComparison.length}{' '}
                    projet{getFilteredProjectsForComparison.length > 1 ? 's' : ''}
                    {comparisonYearFilter !== null && ` en ${comparisonYearFilter}`})
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Graphique */}
          {streamsChartData.length > 0 && (
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsLineChart data={streamsChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                  <XAxis
                    dataKey="day"
                    stroke="rgba(255, 255, 255, 0.5)"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="rgba(255, 255, 255, 0.5)"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  {viewMode === 'comparison' && (
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgba(0, 0, 0, 0.9)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: '8px',
                        color: '#fff',
                      }}
                      content={({ active, payload, label }) => {
                        if (!active || !payload || !payload.length) return null;
                        const projectMapping = comparisonProjectMapping;
                        const projectsToShow =
                          comparisonMode === 'all'
                            ? projectMapping
                            : projectMapping.filter((m: ProjectMapping) =>
                                selectedProjectsForComparison.includes(m.projectId)
                              );

                        if (projectsToShow.length === 0) return null;

                        return (
                          <div className="bg-gray-900/95 border border-gray-700 rounded-lg p-3 shadow-xl">
                            <div className="text-white font-semibold mb-2 text-center border-b border-gray-700 pb-2">
                              {label}
                            </div>
                            <div className="space-y-1">
                              {projectsToShow.map((mapping: ProjectMapping, index: number) => {
                                const data = payload.find((p) => p.dataKey === mapping.dataKey);
                                if (!data || data.value === null || data.value === undefined)
                                  return null;
                                const numValue = Number(data.value);
                                if (!Number.isFinite(numValue) || numValue < 0) return null;
                                const color = getColorForIndex(index, projectsToShow.length);
                                return (
                                  <div
                                    key={mapping.projectId}
                                    className="flex items-center justify-between gap-3 text-sm"
                                  >
                                    <div className="flex items-center gap-2">
                                      <div
                                        className="w-3 h-3 rounded-full"
                                        style={{ backgroundColor: color }}
                                      />
                                      <span className="text-white">
                                        {mapping.projectName}
                                        {mapping.style && (
                                          <span className="text-gray-400 ml-1">
                                            ({mapping.style})
                                          </span>
                                        )}
                                      </span>
                                    </div>
                                    <span className="text-white font-medium">
                                      {numValue.toLocaleString()} streams
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      }}
                    />
                  )}
                  {viewMode === 'comparison' && (
                    <Legend
                      content={({ payload }) => {
                        if (!payload || payload.length === 0) return null;
                        const projectMapping = comparisonProjectMapping;
                        const projectsToShow =
                          comparisonMode === 'all'
                            ? projectMapping
                            : projectMapping.filter((m: ProjectMapping) =>
                                selectedProjectsForComparison.includes(m.projectId)
                              );

                        if (projectsToShow.length === 0) return null;

                        return (
                          <div className="flex flex-wrap items-center justify-center gap-4 mt-4">
                            {projectsToShow.map((mapping: ProjectMapping, index: number) => {
                              const color = getColorForIndex(index, projectsToShow.length);
                              return (
                                <div key={mapping.projectId} className="flex items-center gap-2">
                                  <div
                                    className="w-4 h-4 rounded-full"
                                    style={{ backgroundColor: color }}
                                  />
                                  <span className="text-sm text-gray-300">
                                    {mapping.projectName}
                                    {mapping.style && (
                                      <span className="text-gray-500 ml-1">({mapping.style})</span>
                                    )}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        );
                      }}
                    />
                  )}
                  {viewMode === 'comparison' &&
                    comparisonMode === 'all' &&
                    comparisonProjectMapping.map((mapping: ProjectMapping, index: number) => {
                      const color = getColorForIndex(index, comparisonProjectMapping.length);
                      return (
                        <Line
                          key={mapping.projectId}
                          type="monotone"
                          dataKey={mapping.dataKey}
                          stroke={color}
                          strokeWidth={2}
                          dot={{ r: 4, fill: color }}
                          activeDot={{ r: 6, strokeWidth: 2, fill: color }}
                          name={`${mapping.projectName}${mapping.style ? ` (${mapping.style})` : ''}`}
                          connectNulls={false}
                          isAnimationActive={false}
                        />
                      );
                    })}
                  {viewMode === 'comparison' &&
                    comparisonMode === 'two' &&
                    comparisonProjectMapping
                      .filter((m: ProjectMapping) =>
                        selectedProjectsForComparison.includes(m.projectId)
                      )
                      .map((mapping: ProjectMapping, index: number) => {
                        const filteredProjects = comparisonProjectMapping.filter(
                          (m: ProjectMapping) => selectedProjectsForComparison.includes(m.projectId)
                        );
                        const color = getColorForIndex(index, filteredProjects.length);
                        return (
                          <Line
                            key={mapping.projectId}
                            type="monotone"
                            dataKey={mapping.dataKey}
                            stroke={color}
                            strokeWidth={2}
                            dot={{ r: 4, fill: color }}
                            activeDot={{ r: 6, strokeWidth: 2, fill: color }}
                            name={`${mapping.projectName}${mapping.style ? ` (${mapping.style})` : ''}`}
                            connectNulls={true}
                            isAnimationActive={false}
                          />
                        );
                      })}
                  {viewMode !== 'comparison' && (
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        border: 'none',
                        borderRadius: '8px',
                        color: '#fff',
                      }}
                      formatter={(value: number | undefined) => {
                        const v = value ?? 0;
                        const numValue = Number.isFinite(v) && v >= 0 ? v : 0;
                        return [
                          `${numValue.toLocaleString()} streams`,
                          viewMode === 'global' ? 'Total' : 'Streams',
                        ];
                      }}
                    />
                  )}
                  {viewMode !== 'comparison' && (
                    <Legend
                      formatter={() => (viewMode === 'global' ? 'Total Streams' : 'Streams')}
                    />
                  )}
                  {viewMode !== 'comparison' && (
                    <Line
                      type="monotone"
                      dataKey="streams"
                      stroke="#a855f7"
                      strokeWidth={2}
                      dot={{ r: 4, fill: '#a855f7' }}
                      activeDot={{ r: 6, strokeWidth: 2, fill: '#a855f7' }}
                      name={viewMode === 'global' ? 'Total Streams' : 'Streams'}
                    />
                  )}
                </RechartsLineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Message si aucune donnée en mode projet */}
          {viewMode === 'project' &&
            !selectedProject &&
            displayStats.streamsEvolution.length > 0 && (
              <div className="text-center text-gray-400 py-8">
                Sélectionnez un projet pour voir son évolution
              </div>
            )}

          {/* Message si aucune donnée en mode comparaison */}
          {viewMode === 'comparison' &&
            streamsChartData.length === 0 &&
            displayStats.streamsEvolution.length > 0 && (
              <div className="text-center text-gray-400 py-8">
                {comparisonMode === 'two'
                  ? 'Sélectionnez 2 projets pour les comparer'
                  : getFilteredProjectsForComparison.length === 0
                    ? `Aucun projet trouvé${comparisonYearFilter !== null ? ` pour l'année ${comparisonYearFilter}` : ''}`
                    : 'Aucune donnée disponible'}
              </div>
            )}
        </div>
      </CardContent>
    </Card>
  );
}
