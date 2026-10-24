'use client';

import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  BarChart3,
  ArrowLeft,
  TrendingUp,
  Music2,
  LineChart,
  Activity,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect, useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  LabelList,
  Cell,
} from 'recharts';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Project, PROJECT_STATUSES } from '@/components/projects/types';

import {
  buildComparisonChartData,
  buildComparisonProjectMapping,
  buildYearlyProgressionData,
  filterProjectsForComparison,
  type ProjectMapping,
} from './chartData';
import {
  createSegmentLabelRenderer,
  createTotalLabelRenderer,
  ProjectsByYearTooltip,
} from './chartLabels';
import { computeYearStatistics } from './computeYearStatistics';
import { getColorForIndex, getStatusBarColors, getStatusColor } from './statusColors';
import {
  MILESTONE_DAYS,
  MILESTONE_LABELS,
  type StatisticsClientProps,
  type StatisticsData,
} from './types';

export const StatisticsClient = ({ initialProjects }: StatisticsClientProps) => {
  const [statistics, setStatistics] = useState<StatisticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'project' | 'global' | 'comparison'>('project');
  const [yearViewMode, setYearViewMode] = useState<'global' | 'year'>('global');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [hiddenStatuses, setHiddenStatuses] = useState<Set<string>>(new Set());
  const [selectedProjectsForComparison, setSelectedProjectsForComparison] = useState<string[]>([]);
  const [comparisonMode, setComparisonMode] = useState<'two' | 'all'>('two');
  const [comparisonYearFilter, setComparisonYearFilter] = useState<number | null>(null);

  useEffect(() => {
    const fetchStatistics = async () => {
      try {
        const response = await fetch('/api/projects/statistics');
        if (response.ok) {
          const result = await response.json();
          const data = result.data || result;
          setStatistics(data);

          // Sélectionner le premier projet avec streams par défaut
          if (data.streamsEvolution && data.streamsEvolution.length > 0) {
            setSelectedProjectId(data.streamsEvolution[0].projectId);
            setViewMode('project');
          } else if (data.globalStreamsEvolution && data.globalStreamsEvolution.length > 0) {
            // Si pas de projets individuels mais des données globales, passer en mode global
            setViewMode('global');
          }
        } else {
          console.error('Erreur lors du chargement des statistiques');
        }
      } catch (error) {
        console.error('Erreur:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStatistics();
  }, []);

  // Filtrer les statistiques selon l'année sélectionnée
  const filteredStatistics = useMemo(() => {
    if (!statistics) return null;

    if (yearViewMode === 'global') {
      return statistics;
    }

    return computeYearStatistics(statistics, initialProjects, selectedYear);
  }, [statistics, yearViewMode, selectedYear, initialProjects]);

  // Obtenir les années disponibles
  const availableYears = useMemo(() => {
    if (!statistics?.projectsByYear) return [];
    return statistics.projectsByYear
      .map((p) => {
        const year = parseInt(p.year, 10);
        return Number.isFinite(year) ? year : null;
      })
      .filter((year): year is number => year !== null)
      .sort((a, b) => b - a);
  }, [statistics]);

  // Ajuster l'année sélectionnée si elle n'est pas disponible
  useEffect(() => {
    if (availableYears.length > 0 && !availableYears.includes(selectedYear)) {
      setSelectedYear(availableYears[0]);
    }
  }, [availableYears, selectedYear]);

  const displayStats = filteredStatistics || statistics;

  const selectedProject = useMemo(() => {
    if (!displayStats || !selectedProjectId) return null;
    return displayStats.streamsEvolution.find((p) => p.projectId === selectedProjectId) || null;
  }, [displayStats, selectedProjectId]);

  // Réinitialiser le projet sélectionné si nécessaire
  useEffect(() => {
    if (displayStats && displayStats.streamsEvolution.length > 0) {
      const currentProject = displayStats.streamsEvolution.find(
        (p) => p.projectId === selectedProjectId
      );
      if (!currentProject) {
        setSelectedProjectId(displayStats.streamsEvolution[0].projectId);
      }
    }
  }, [displayStats, selectedProjectId]);

  // Fonction pour filtrer les projets selon l'année
  const getFilteredProjectsForComparison = useMemo(() => {
    if (!displayStats) return [];
    return filterProjectsForComparison(displayStats.streamsEvolution, comparisonYearFilter);
  }, [displayStats, comparisonYearFilter]);

  // Créer le mapping des projets pour le mode comparaison (AVANT les données)
  const comparisonProjectMapping = useMemo<ProjectMapping[]>(() => {
    if (!displayStats || viewMode !== 'comparison') return [];
    return buildComparisonProjectMapping(
      getFilteredProjectsForComparison,
      comparisonMode,
      selectedProjectsForComparison
    );
  }, [
    displayStats,
    viewMode,
    comparisonMode,
    selectedProjectsForComparison,
    getFilteredProjectsForComparison,
  ]);

  // Fonction pour transformer les données en mode comparaison
  const getComparisonChartData = useMemo(() => {
    if (!displayStats || viewMode !== 'comparison') return [];
    return buildComparisonChartData(
      getFilteredProjectsForComparison,
      comparisonMode,
      selectedProjectsForComparison
    );
  }, [
    displayStats,
    viewMode,
    comparisonMode,
    selectedProjectsForComparison,
    getFilteredProjectsForComparison,
  ]);

  const streamsChartData = useMemo(() => {
    if (!displayStats) return [];

    if (viewMode === 'comparison') {
      return getComparisonChartData;
    }

    if (viewMode === 'global') {
      if (!displayStats.globalStreamsEvolution) return [];
      return displayStats.globalStreamsEvolution
        .filter((s) => Number.isFinite(s.value) && s.value > 0)
        .map((s) => ({
          day: `J${s.day}`,
          streams: s.value,
        }));
    }

    // Mode 'project'
    if (!selectedProject || !selectedProject.streams) return [];
    return selectedProject.streams
      .filter((s) => Number.isFinite(s.value) && s.value > 0)
      .map((s) => ({
        day: `J${s.day}`,
        streams: s.value,
      }));
  }, [selectedProject, viewMode, displayStats, getComparisonChartData]);

  // Calculer l'évolution annuelle des performances
  const yearlyProgressionData = useMemo(() => {
    if (!displayStats || !statistics) return [];
    return buildYearlyProgressionData(displayStats.streamsEvolution);
  }, [displayStats, statistics]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-400">Chargement des statistiques...</div>
      </div>
    );
  }

  if (!statistics || !displayStats) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-red-400">Erreur lors du chargement des statistiques</div>
      </div>
    );
  }

  const renderTotalLabel = createTotalLabelRenderer(hiddenStatuses);
  const renderTermineLabel = createSegmentLabelRenderer('TERMINE');
  const renderGhostProdLabel = createSegmentLabelRenderer('GHOST_PRODUCTION');

  return (
    <div className="space-y-6">
      {/* Header avec bouton retour et sélecteur d'année */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Statistiques des Projets</h1>
          <p className="text-gray-400">Vue d'ensemble de vos projets musicaux</p>
        </div>
        <div className="flex items-center gap-4">
          {/* Sélecteur d'année - à gauche du bouton retour */}
          {statistics && statistics.projectsByYear.length > 0 && (
            <div className="flex items-center gap-2">
              {/* Sélecteur de date (flèches) - à gauche */}
              <div
                className={`flex items-center gap-2 transition-opacity ${yearViewMode === 'year' ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
              >
                <button
                  onClick={() => {
                    const currentIndex = availableYears.indexOf(selectedYear);
                    if (currentIndex < availableYears.length - 1) {
                      setSelectedYear(availableYears[currentIndex + 1]); // Année plus ancienne (vers la fin du tableau)
                    }
                  }}
                  disabled={availableYears.indexOf(selectedYear) >= availableYears.length - 1}
                  className="p-2 rounded-lg bg-gray-700/50 hover:bg-gray-700/70 border border-gray-600/50 hover:border-purple-500/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Année précédente"
                >
                  <ChevronLeft className="w-5 h-5 text-gray-300" />
                </button>
                <div className="px-4 py-2 bg-gray-800/70 rounded-lg border border-gray-700/50 min-w-[80px] text-center">
                  <span className="text-lg font-semibold text-white">{selectedYear}</span>
                </div>
                <button
                  onClick={() => {
                    const currentIndex = availableYears.indexOf(selectedYear);
                    if (currentIndex > 0) {
                      setSelectedYear(availableYears[currentIndex - 1]); // Année plus récente (vers le début du tableau)
                    }
                  }}
                  disabled={availableYears.indexOf(selectedYear) <= 0}
                  className="p-2 rounded-lg bg-gray-700/50 hover:bg-gray-700/70 border border-gray-600/50 hover:border-purple-500/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Année suivante"
                >
                  <ChevronRight className="w-5 h-5 text-gray-300" />
                </button>
              </div>
              {/* Bouton toggle Global/Année */}
              <button
                onClick={() => setYearViewMode(yearViewMode === 'global' ? 'year' : 'global')}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  yearViewMode === 'global'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-700/50 text-gray-300 hover:bg-gray-600/50'
                }`}
              >
                {yearViewMode === 'global' ? 'Global' : 'Année'}
              </button>
            </div>
          )}
          <Link
            href="/projects"
            className="px-4 py-2 bg-gray-700/50 hover:bg-gray-600/50 text-white rounded-lg transition-colors flex items-center gap-2"
          >
            <ArrowLeft size={18} />
            Retour
          </Link>
        </div>
      </div>

      {/* Carte principale - Total projets avec répartition par statut */}
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

      {/* Graphique - Projets terminés par année (mode global) */}
      {yearViewMode === 'global' && displayStats.projectsByYear.length > 0 && (
        <Card className="glass border border-purple-500/20 bg-black/30 backdrop-blur-md text-white">
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart3 className="mr-2 h-5 w-5 text-purple-400" />
              Projets terminés par année
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] mb-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={displayStats.projectsByYear}
                  margin={{ top: 30, right: 30, left: 30, bottom: 5 }}
                  barGap={0}
                  barCategoryGap="20%"
                  barSize={60}
                  style={{ cursor: 'default' }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                  <XAxis
                    dataKey="year"
                    type="category"
                    stroke="rgba(255, 255, 255, 0.5)"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: 'rgba(255, 255, 255, 0.7)' }}
                    interval={0}
                    tickMargin={10}
                    padding={{ left: 100, right: 100 }}
                  />
                  <YAxis
                    stroke="rgba(255, 255, 255, 0.5)"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                    tick={{ fill: 'rgba(255, 255, 255, 0.7)' }}
                  />
                  <Tooltip
                    content={
                      <ProjectsByYearTooltip
                        projectsByYearDetails={statistics.projectsByYearDetails}
                        projects={initialProjects}
                      />
                    }
                    cursor={{ fill: 'transparent' }}
                    wrapperStyle={{ outline: 'none' }}
                  />
                  {!hiddenStatuses.has('TERMINE') &&
                    (() => {
                      const colors = getStatusBarColors('TERMINE');
                      const isTopBar = hiddenStatuses.has('GHOST_PRODUCTION');
                      return (
                        <Bar
                          dataKey="TERMINE"
                          stackId="a"
                          fill={colors.fill}
                          stroke={colors.stroke}
                          strokeWidth={2}
                          radius={isTopBar ? [8, 8, 0, 0] : [0, 0, 0, 0]}
                          isAnimationActive={false}
                          activeBar={{
                            fill: colors.fill,
                            stroke: colors.stroke,
                            strokeWidth: 2,
                            opacity: 1,
                          }}
                        >
                          <LabelList
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            content={renderTermineLabel as any}
                            position="center"
                            dataKey="TERMINE"
                          />
                          {isTopBar && (
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            <LabelList content={renderTotalLabel as any} position="top" />
                          )}
                        </Bar>
                      );
                    })()}
                  {!hiddenStatuses.has('GHOST_PRODUCTION') &&
                    (() => {
                      const colors = getStatusBarColors('GHOST_PRODUCTION');
                      return (
                        <Bar
                          dataKey="GHOST_PRODUCTION"
                          stackId="a"
                          fill={colors.fill}
                          stroke={colors.stroke}
                          strokeWidth={2}
                          radius={hiddenStatuses.has('TERMINE') ? [8, 8, 0, 0] : [8, 8, 0, 0]}
                          isAnimationActive={false}
                          activeBar={{
                            fill: colors.fill,
                            stroke: colors.stroke,
                            strokeWidth: 2,
                            opacity: 1,
                          }}
                        >
                          <LabelList
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            content={renderGhostProdLabel as any}
                            position="center"
                            dataKey="GHOST_PRODUCTION"
                          />
                          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                          <LabelList content={renderTotalLabel as any} position="top" />
                        </Bar>
                      );
                    })()}
                </BarChart>
              </ResponsiveContainer>
            </div>
            {/* Légende cliquable centrée par rapport au graphique */}
            <div className="flex items-center justify-center gap-6 flex-wrap">
              {[
                { key: 'TERMINE', label: 'Terminé', color: getStatusBarColors('TERMINE').text },
                {
                  key: 'GHOST_PRODUCTION',
                  label: 'Ghost Prod',
                  color: getStatusBarColors('GHOST_PRODUCTION').text,
                },
              ].map((item) => {
                const isHidden = hiddenStatuses.has(item.key);
                return (
                  <button
                    key={item.key}
                    onClick={() => {
                      const newHidden = new Set(hiddenStatuses);
                      if (isHidden) {
                        newHidden.delete(item.key);
                      } else {
                        newHidden.add(item.key);
                      }
                      setHiddenStatuses(newHidden);
                    }}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                      isHidden ? 'opacity-40 hover:opacity-60' : 'hover:bg-gray-700/30'
                    }`}
                  >
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: item.color }} />
                    <span className="text-sm text-gray-300">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Liste des projets terminés de l'année sélectionnée (mode année) */}
      {yearViewMode === 'year' &&
        statistics?.projectsByYearDetails &&
        statistics.projectsByYearDetails[selectedYear.toString()] && (
          <Card className="glass border border-purple-500/20 bg-black/30 backdrop-blur-md text-white">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Music2 className="mr-2 h-5 w-5 text-purple-400" />
                Projets terminés en {selectedYear}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {statistics.projectsByYearDetails[selectedYear.toString()].length > 0 ? (
                <div className="space-y-2">
                  {statistics.projectsByYearDetails[selectedYear.toString()].map((project) => (
                    <div
                      key={project.id}
                      className="p-3 rounded-lg border border-gray-700/50 bg-gray-800/30 hover:bg-gray-700/30 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-white font-medium">{project.name}</span>
                        <span className="text-sm text-gray-400">
                          {format(new Date(project.releaseDate), 'dd MMMM yyyy', { locale: fr })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-400 py-8">
                  Aucun projet terminé en {selectedYear}
                </div>
              )}
            </CardContent>
          </Card>
        )}

      {/* Métriques des streams - Moyennes par jalon */}
      <Card className="glass border border-blue-500/20 bg-black/30 backdrop-blur-md text-white">
        <CardHeader>
          <CardTitle className="flex items-center">
            <TrendingUp className="mr-2 h-5 w-5 text-blue-400" />
            Moyennes par jalon
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {MILESTONE_LABELS.map((jalon) => {
              const value = displayStats.metrics.averageStreams[jalon];
              if (value === undefined) return null;
              return (
                <div
                  key={jalon}
                  className="p-4 rounded-lg border border-blue-500/30 bg-blue-500/10"
                >
                  <div className="text-2xl font-bold text-blue-400 mb-1">
                    {value.toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-300">{jalon}</div>
                  <div className="text-xs text-gray-400 mt-1">moyenne</div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Autres métriques */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="glass border border-green-500/20 bg-black/30 backdrop-blur-md text-white">
          <CardHeader>
            <CardTitle className="flex items-center text-sm">
              <Activity className="mr-2 h-4 w-4 text-green-400" />
              Total Streams
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-400">
              {displayStats.metrics.totalStreams.toLocaleString()}
            </div>
            <div className="text-xs text-gray-400 mt-1">sur tous les projets</div>
          </CardContent>
        </Card>

        <Card className="glass border border-purple-500/20 bg-black/30 backdrop-blur-md text-white">
          <CardHeader>
            <CardTitle className="flex items-center text-sm">
              <Music2 className="mr-2 h-4 w-4 text-purple-400" />
              Projets avec streams
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-400">
              {displayStats.metrics.projectsWithStreams}
            </div>
            <div className="text-xs text-gray-400 mt-1">projets suivis</div>
          </CardContent>
        </Card>
      </div>

      {/* Graphique - Évolution des streams */}
      {(displayStats.streamsEvolution.length > 0 ||
        displayStats.globalStreamsEvolution.length > 0) && (
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
                  <label className="text-sm text-gray-400 mb-2 block">
                    Sélectionner un projet :
                  </label>
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
                          setComparisonYearFilter(
                            year !== null && Number.isFinite(year) ? year : null
                          );
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
                                    <div
                                      key={mapping.projectId}
                                      className="flex items-center gap-2"
                                    >
                                      <div
                                        className="w-4 h-4 rounded-full"
                                        style={{ backgroundColor: color }}
                                      />
                                      <span className="text-sm text-gray-300">
                                        {mapping.projectName}
                                        {mapping.style && (
                                          <span className="text-gray-500 ml-1">
                                            ({mapping.style})
                                          </span>
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
                              (m: ProjectMapping) =>
                                selectedProjectsForComparison.includes(m.projectId)
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
      )}

      {/* Graphique d'évolution annuelle */}
      {yearlyProgressionData.length > 0 && (
        <Card className="glass border border-purple-500/20 bg-black/30 backdrop-blur-md text-white">
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="mr-2 h-5 w-5 text-purple-400" />
              Évolution annuelle des performances
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsLineChart data={yearlyProgressionData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                  <XAxis
                    dataKey="year"
                    stroke="rgba(255, 255, 255, 0.5)"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: 'rgba(255, 255, 255, 0.7)' }}
                  />
                  <YAxis
                    stroke="rgba(255, 255, 255, 0.5)"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                    tick={{ fill: 'rgba(255, 255, 255, 0.7)' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(0, 0, 0, 0.9)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '8px',
                      color: '#fff',
                    }}
                    formatter={(value: number | undefined, name: string | undefined) => {
                      const v = value ?? 0;
                      const numValue = Number(v);
                      if (!Number.isFinite(numValue) || numValue < 0) {
                        return [
                          '0',
                          name === 'totalStreams'
                            ? 'Total'
                            : name === 'averageStreams'
                              ? 'Moyenne'
                              : name,
                        ];
                      }
                      if (name === 'totalStreams') {
                        return [`${numValue.toLocaleString()} streams`, 'Total'];
                      }
                      if (name === 'averageStreams') {
                        return [`${numValue.toLocaleString()} streams`, 'Moyenne'];
                      }
                      return [numValue.toString(), name];
                    }}
                    labelFormatter={(label) => `Année ${label}`}
                  />
                  <Legend
                    formatter={(value) => {
                      if (value === 'totalStreams') return 'Total streams';
                      if (value === 'averageStreams') return 'Moyenne streams';
                      return value;
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="totalStreams"
                    stroke="#a855f7"
                    strokeWidth={2}
                    dot={{ r: 4, fill: '#a855f7' }}
                    activeDot={{ r: 6, strokeWidth: 2, fill: '#a855f7' }}
                    name="totalStreams"
                  />
                  <Line
                    type="monotone"
                    dataKey="averageStreams"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={{ r: 4, fill: '#3b82f6' }}
                    activeDot={{ r: 6, strokeWidth: 2, fill: '#3b82f6' }}
                    name="averageStreams"
                  />
                </RechartsLineChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
              {yearlyProgressionData.map((data) => (
                <div
                  key={data.year}
                  className="p-3 rounded-lg border border-gray-700/50 bg-gray-800/30"
                >
                  <div className="text-sm text-gray-400 mb-1">{data.year}</div>
                  <div className="text-lg font-bold text-purple-400">
                    {Number.isFinite(data.totalStreams) ? data.totalStreams.toLocaleString() : '0'}
                  </div>
                  <div className="text-xs text-gray-500">
                    Moyenne:{' '}
                    {Number.isFinite(data.averageStreams)
                      ? data.averageStreams.toLocaleString()
                      : '0'}{' '}
                    ({data.projectCount} projet{data.projectCount > 1 ? 's' : ''})
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Message si aucune donnée */}
      {displayStats.totalProjects === 0 && (
        <Card className="glass border border-gray-500/20 bg-black/30 backdrop-blur-md text-white">
          <CardContent className="py-12 text-center">
            <Music2 className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-400">Aucun projet pour le moment</p>
            <Link
              href="/projects"
              className="mt-4 inline-block px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors"
            >
              Créer un projet
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
