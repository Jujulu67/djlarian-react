'use client';

import { Music2 } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect, useMemo } from 'react';

import { Card, CardContent } from '@/components/ui/Card';

import {
  buildComparisonChartData,
  buildComparisonProjectMapping,
  buildYearlyProgressionData,
  filterProjectsForComparison,
  type ProjectMapping,
} from './chartData';
import { OverviewCard } from './components/OverviewCard';
import { ProjectsByYearChart } from './components/ProjectsByYearChart';
import { StatisticsHeader } from './components/StatisticsHeader';
import { StreamsEvolutionChart } from './components/StreamsEvolutionChart';
import { StreamsMetrics } from './components/StreamsMetrics';
import { YearlyProgressionChart } from './components/YearlyProgressionChart';
import { YearProjectsList } from './components/YearProjectsList';
import { computeYearStatistics } from './computeYearStatistics';
import type { StatisticsClientProps, StatisticsData } from './types';

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

  return (
    <div className="space-y-6">
      {/* Header avec bouton retour et sélecteur d'année */}
      <StatisticsHeader
        statistics={statistics}
        yearViewMode={yearViewMode}
        setYearViewMode={setYearViewMode}
        selectedYear={selectedYear}
        setSelectedYear={setSelectedYear}
        availableYears={availableYears}
      />

      {/* Carte principale - Total projets avec répartition par statut */}
      <OverviewCard
        yearViewMode={yearViewMode}
        selectedYear={selectedYear}
        displayStats={displayStats}
      />

      {/* Graphique - Projets terminés par année (mode global) */}
      {yearViewMode === 'global' && displayStats.projectsByYear.length > 0 && (
        <ProjectsByYearChart
          statistics={statistics}
          hiddenStatuses={hiddenStatuses}
          setHiddenStatuses={setHiddenStatuses}
          displayStats={displayStats}
          initialProjects={initialProjects}
        />
      )}

      {/* Liste des projets terminés de l'année sélectionnée (mode année) */}
      {yearViewMode === 'year' &&
        statistics?.projectsByYearDetails &&
        statistics.projectsByYearDetails[selectedYear.toString()] && (
          <YearProjectsList statistics={statistics} selectedYear={selectedYear} />
        )}

      {/* Métriques des streams - Moyennes par jalon */}
      <StreamsMetrics displayStats={displayStats} />

      {/* Graphique - Évolution des streams */}
      {(displayStats.streamsEvolution.length > 0 ||
        displayStats.globalStreamsEvolution.length > 0) && (
        <StreamsEvolutionChart
          selectedProjectId={selectedProjectId}
          setSelectedProjectId={setSelectedProjectId}
          viewMode={viewMode}
          setViewMode={setViewMode}
          selectedProjectsForComparison={selectedProjectsForComparison}
          setSelectedProjectsForComparison={setSelectedProjectsForComparison}
          comparisonMode={comparisonMode}
          setComparisonMode={setComparisonMode}
          comparisonYearFilter={comparisonYearFilter}
          setComparisonYearFilter={setComparisonYearFilter}
          availableYears={availableYears}
          displayStats={displayStats}
          selectedProject={selectedProject}
          getFilteredProjectsForComparison={getFilteredProjectsForComparison}
          comparisonProjectMapping={comparisonProjectMapping}
          streamsChartData={streamsChartData}
        />
      )}

      {/* Graphique d'évolution annuelle */}
      {yearlyProgressionData.length > 0 && (
        <YearlyProgressionChart yearlyProgressionData={yearlyProgressionData} />
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
