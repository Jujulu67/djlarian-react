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
import { useState, useEffect, useMemo, Fragment } from 'react';
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

// Types pour les composants Recharts
interface TooltipProps {
  active?: boolean;
  payload?: Array<{
    payload?: Record<string, unknown>;
    value?: number;
    dataKey?: string;
  }>;
  label?: string | number;
}

interface SegmentLabelProps {
  x?: string | number;
  y?: string | number;
  width?: string | number;
  height?: string | number;
  payload?: Record<string, unknown>;
  value?: number;
}

interface StatisticsClientProps {
  initialProjects: Project[];
}

interface StatisticsData {
  totalProjects: number;
  statusBreakdown: {
    TERMINE: number;
    EN_COURS: number;
    ANNULE: number;
    A_REWORK: number;
    GHOST_PRODUCTION: number;
  };
  projectsByYear: Array<{
    year: string;
    TERMINE: number;
    GHOST_PRODUCTION: number;
    total: number;
  }>;
  projectsByYearDetails: Record<string, Array<{ id: string; name: string; releaseDate: string }>>;
  streamsEvolution: Array<{
    projectId: string;
    projectName: string;
    style: string | null;
    releaseDate: string | null;
    streams: Array<{ day: number; value: number }>;
  }>;
  globalStreamsEvolution: Array<{ day: number; value: number }>;
  metrics: {
    averageStreams: {
      J7: number;
      J14: number;
      J21: number;
      J28: number;
      J56: number;
      J84: number;
      J180?: number;
      J365?: number;
    };
    totalStreams: number;
    maxStreams: number;
    projectsWithStreams: number;
  };
}

// Constante pour les jalons de jours
const MILESTONE_DAYS = [7, 14, 21, 28, 56, 84, 180, 365] as const;
const MILESTONE_LABELS = ['J7', 'J14', 'J21', 'J28', 'J56', 'J84', 'J180', 'J365'] as const;

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

    // Filtrer par année (projets créés dans l'année sélectionnée, même sans date de sortie)
    const yearStr = selectedYear.toString();
    const filteredProjects = initialProjects.filter((p) => {
      // Utiliser createdAt pour déterminer l'année de création
      if (!p.createdAt) return false;
      const projectYear = new Date(p.createdAt).getFullYear().toString();
      return projectYear === yearStr;
    });

    // Recalculer les statistiques pour l'année sélectionnée
    const totalProjects = filteredProjects.length;

    const statusBreakdown = {
      TERMINE: filteredProjects.filter((p) => p.status === 'TERMINE').length,
      EN_COURS: filteredProjects.filter((p) => p.status === 'EN_COURS').length,
      ANNULE: filteredProjects.filter((p) => p.status === 'ANNULE').length,
      A_REWORK: filteredProjects.filter((p) => p.status === 'A_REWORK').length,
      GHOST_PRODUCTION: filteredProjects.filter((p) => p.status === 'GHOST_PRODUCTION').length,
    };

    // Projets avec streams pour l'année
    const projectsWithStreams = filteredProjects.filter(
      (p) =>
        p.streamsJ7 ||
        p.streamsJ14 ||
        p.streamsJ21 ||
        p.streamsJ28 ||
        p.streamsJ56 ||
        p.streamsJ84 ||
        p.streamsJ180 ||
        p.streamsJ365
    );

    // Calculer les moyennes pour tous les jalons
    const calculateAverage = (day: number) => {
      const fieldMap: Record<
        number,
        | 'streamsJ7'
        | 'streamsJ14'
        | 'streamsJ21'
        | 'streamsJ28'
        | 'streamsJ56'
        | 'streamsJ84'
        | 'streamsJ180'
        | 'streamsJ365'
      > = {
        7: 'streamsJ7',
        14: 'streamsJ14',
        21: 'streamsJ21',
        28: 'streamsJ28',
        56: 'streamsJ56',
        84: 'streamsJ84',
        180: 'streamsJ180',
        365: 'streamsJ365',
      };
      const field = fieldMap[day];
      const values = projectsWithStreams.map((p) => p[field] || 0).filter((s) => s > 0);
      return values.length > 0 ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : 0;
    };

    const averageStreams = {
      J7: calculateAverage(7),
      J14: calculateAverage(14),
      J21: calculateAverage(21),
      J28: calculateAverage(28),
      J56: calculateAverage(56),
      J84: calculateAverage(84),
      J180: calculateAverage(180),
      J365: calculateAverage(365),
    };

    const totalStreams = projectsWithStreams.reduce((sum, p) => {
      return (
        sum +
        (p.streamsJ365 ||
          p.streamsJ180 ||
          p.streamsJ84 ||
          p.streamsJ56 ||
          p.streamsJ28 ||
          p.streamsJ21 ||
          p.streamsJ14 ||
          p.streamsJ7 ||
          0)
      );
    }, 0);

    // Évolution des streams par projet pour l'année
    const streamsEvolution = filteredProjects
      .filter(
        (p) =>
          p.status === 'TERMINE' &&
          (p.streamsJ7 ||
            p.streamsJ14 ||
            p.streamsJ21 ||
            p.streamsJ28 ||
            p.streamsJ56 ||
            p.streamsJ84 ||
            p.streamsJ180 ||
            p.streamsJ365)
      )
      .map((p) => ({
        projectId: p.id,
        projectName: p.name,
        releaseDate: p.releaseDate ? new Date(p.releaseDate).toISOString() : null,
        style: p.style,
        streams: [
          {
            day: 7,
            value:
              p.streamsJ7 != null && Number.isFinite(p.streamsJ7) && p.streamsJ7 >= 0
                ? p.streamsJ7
                : 0,
          },
          {
            day: 14,
            value:
              p.streamsJ14 != null && Number.isFinite(p.streamsJ14) && p.streamsJ14 >= 0
                ? p.streamsJ14
                : 0,
          },
          {
            day: 21,
            value:
              p.streamsJ21 != null && Number.isFinite(p.streamsJ21) && p.streamsJ21 >= 0
                ? p.streamsJ21
                : 0,
          },
          {
            day: 28,
            value:
              p.streamsJ28 != null && Number.isFinite(p.streamsJ28) && p.streamsJ28 >= 0
                ? p.streamsJ28
                : 0,
          },
          {
            day: 56,
            value:
              p.streamsJ56 != null && Number.isFinite(p.streamsJ56) && p.streamsJ56 >= 0
                ? p.streamsJ56
                : 0,
          },
          {
            day: 84,
            value:
              p.streamsJ84 != null && Number.isFinite(p.streamsJ84) && p.streamsJ84 >= 0
                ? p.streamsJ84
                : 0,
          },
          {
            day: 180,
            value:
              p.streamsJ180 != null && Number.isFinite(p.streamsJ180) && p.streamsJ180 >= 0
                ? p.streamsJ180
                : 0,
          },
          {
            day: 365,
            value:
              p.streamsJ365 != null && Number.isFinite(p.streamsJ365) && p.streamsJ365 >= 0
                ? p.streamsJ365
                : 0,
          },
        ],
      }));

    // Streams totaux par jalon pour l'année
    const globalStreamsEvolution = MILESTONE_DAYS.map((day) => {
      const fieldMap: Record<
        number,
        | 'streamsJ7'
        | 'streamsJ14'
        | 'streamsJ21'
        | 'streamsJ28'
        | 'streamsJ56'
        | 'streamsJ84'
        | 'streamsJ180'
        | 'streamsJ365'
      > = {
        7: 'streamsJ7',
        14: 'streamsJ14',
        21: 'streamsJ21',
        28: 'streamsJ28',
        56: 'streamsJ56',
        84: 'streamsJ84',
        180: 'streamsJ180',
        365: 'streamsJ365',
      };
      const field = fieldMap[day];
      const total = projectsWithStreams.reduce((sum, p) => sum + (p[field] || 0), 0);
      return { day, value: total };
    });

    // Projets terminés par année (pour l'année sélectionnée, seulement TERMINE et GHOST_PRODUCTION)
    const terminatedProjects = filteredProjects.filter(
      (p) => p.status === 'TERMINE' || p.status === 'GHOST_PRODUCTION'
    );
    const projectsByYear = [
      {
        year: yearStr,
        TERMINE: terminatedProjects.filter((p) => p.status === 'TERMINE').length,
        GHOST_PRODUCTION: terminatedProjects.filter((p) => p.status === 'GHOST_PRODUCTION').length,
        total: terminatedProjects.length,
      },
    ];

    return {
      ...statistics,
      totalProjects,
      statusBreakdown,
      projectsByYear,
      streamsEvolution,
      globalStreamsEvolution,
      metrics: {
        ...statistics.metrics,
        averageStreams,
        totalStreams,
        projectsWithStreams: projectsWithStreams.length,
      },
    };
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
    let projects: Array<{
      projectId: string;
      projectName: string;
      style: string | null;
      releaseDate: string | null;
      streams: Array<{ day: number; value: number }>;
    }> = displayStats.streamsEvolution;

    // Filtrer par année si une année est sélectionnée
    if (comparisonYearFilter !== null) {
      projects = projects.filter((project) => {
        if (!project.releaseDate) return false;
        const projectYear = new Date(project.releaseDate).getFullYear();
        return projectYear === comparisonYearFilter;
      });
    }

    return projects;
  }, [displayStats, comparisonYearFilter]);

  // Type pour le mapping des projets en mode comparaison
  type ProjectMapping = {
    index: number;
    projectId: string;
    projectName: string;
    style?: string | null;
    dataKey: string;
  };

  // Créer le mapping des projets pour le mode comparaison (AVANT les données)
  const comparisonProjectMapping = useMemo<ProjectMapping[]>(() => {
    if (!displayStats || viewMode !== 'comparison') return [];
    const filteredProjects = getFilteredProjectsForComparison;

    if (comparisonMode === 'all') {
      return filteredProjects.map((project, index) => ({
        index,
        projectId: project.projectId,
        projectName: project.projectName,
        style: project.style,
        dataKey: `project${index}`,
      }));
    } else {
      if (selectedProjectsForComparison.length < 2) return [];
      const project1 = filteredProjects.find(
        (p) => p.projectId === selectedProjectsForComparison[0]
      );
      const project2 = filteredProjects.find(
        (p) => p.projectId === selectedProjectsForComparison[1]
      );
      if (!project1 || !project2) return [];

      return [
        {
          index: 0,
          projectId: project1.projectId,
          projectName: project1.projectName,
          style: project1.style,
          dataKey: 'project0',
        },
        {
          index: 1,
          projectId: project2.projectId,
          projectName: project2.projectName,
          style: project2.style,
          dataKey: 'project1',
        },
      ];
    }
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
    const filteredProjects = getFilteredProjectsForComparison;

    if (comparisonMode === 'all') {
      // Tous les projets (filtrés par année si nécessaire)
      if (filteredProjects.length === 0) return [];

      // Créer un objet avec tous les jalons et les valeurs de chaque projet
      // Utiliser des noms de propriétés fixes (project0, project1, etc.) au lieu des UUIDs
      const days = [...MILESTONE_DAYS];
      const chartData = days
        .map((day) => {
          const dataPoint: Record<string, string | number | null> = { day: `J${day}` };
          let hasData = false;
          filteredProjects.forEach((project, index) => {
            const streamValue = project.streams.find((s) => s.day === day);
            const value = streamValue?.value;
            if (value != null && Number.isFinite(value) && value > 0) {
              hasData = true;
              dataPoint[`project${index}`] = value;
            } else {
              dataPoint[`project${index}`] = null;
            }
          });
          // Ne retourner que les jalons qui ont au moins une donnée
          return hasData ? dataPoint : null;
        })
        .filter((point) => point !== null);

      return chartData;
    } else {
      // 2 projets sélectionnés (filtrés par année si nécessaire)
      if (selectedProjectsForComparison.length < 2) return [];
      const project1 = filteredProjects.find(
        (p) => p.projectId === selectedProjectsForComparison[0]
      );
      const project2 = filteredProjects.find(
        (p) => p.projectId === selectedProjectsForComparison[1]
      );
      if (!project1 || !project2) return [];

      const days = [...MILESTONE_DAYS];
      return days
        .map((day) => {
          const stream1 = project1.streams.find((s) => s.day === day);
          const stream2 = project2.streams.find((s) => s.day === day);
          const value1 = stream1?.value;
          const value2 = stream2?.value;
          const hasValue1 = value1 != null && Number.isFinite(value1) && value1 > 0;
          const hasValue2 = value2 != null && Number.isFinite(value2) && value2 > 0;

          // Ne retourner que les jalons qui ont au moins une donnée
          if (!hasValue1 && !hasValue2) return null;

          return {
            day: `J${day}`,
            project0: hasValue1 ? value1 : null,
            project1: hasValue2 ? value2 : null,
          };
        })
        .filter((point) => point !== null);
    }
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

  // Fonction pour générer des couleurs distinctes (jusqu'à 25+ projets)
  const getColorForIndex = (index: number, total: number): string => {
    // Palette de base avec 8 couleurs distinctes
    const baseColors = [
      '#a855f7', // purple
      '#3b82f6', // blue
      '#10b981', // green
      '#f59e0b', // orange
      '#ef4444', // red
      '#8b5cf6', // violet
      '#06b6d4', // cyan
      '#f97316', // orange-500
    ];

    // Si on a moins de 8 projets, utiliser la palette de base
    if (total <= baseColors.length) {
      return baseColors[index % baseColors.length];
    }

    // Pour plus de 8 projets, générer des couleurs HSL équitablement réparties
    // Utiliser un angle de base pour chaque couleur
    const hue = (index * 360) / Math.max(total, 8);
    // Varier la saturation et la luminosité pour plus de distinction
    const saturation = 65 + (index % 3) * 10; // Entre 65% et 85%
    const lightness = 50 + (Math.floor(index / 3) % 3) * 5; // Entre 50% et 60%

    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  };

  // Calculer l'évolution annuelle des performances
  const yearlyProgressionData = useMemo(() => {
    if (!displayStats || !statistics) return [];
    const projectsByYearMap: Record<
      string,
      {
        year: number;
        totalStreams: number;
        averageStreams: number;
        projectCount: number;
      }
    > = {};

    // Grouper les projets par année de sortie
    displayStats.streamsEvolution.forEach((project) => {
      if (!project.releaseDate) return;
      const year = new Date(project.releaseDate).getFullYear();
      const yearKey = year.toString();

      if (!projectsByYearMap[yearKey]) {
        projectsByYearMap[yearKey] = {
          year,
          totalStreams: 0,
          averageStreams: 0,
          projectCount: 0,
        };
      }

      // Utiliser J84 comme référence (ou le dernier jalon disponible)
      const streamValues = project.streams
        .map((s) => s.value)
        .filter((v) => typeof v === 'number' && !isNaN(v) && v >= 0);

      if (streamValues.length === 0) return; // Ignorer les projets sans données valides

      const maxStreams = Math.max(...streamValues, 0);
      if (isNaN(maxStreams) || maxStreams < 0) return; // Ignorer les valeurs invalides

      projectsByYearMap[yearKey].totalStreams += maxStreams;
      projectsByYearMap[yearKey].projectCount += 1;
    });

    // Calculer les moyennes
    Object.values(projectsByYearMap).forEach((data) => {
      if (data.projectCount > 0 && !isNaN(data.totalStreams)) {
        data.averageStreams = Math.round(data.totalStreams / data.projectCount);
      } else {
        data.averageStreams = 0;
      }
      // S'assurer que les valeurs ne sont pas NaN
      if (isNaN(data.totalStreams)) data.totalStreams = 0;
      if (isNaN(data.averageStreams)) data.averageStreams = 0;
      if (isNaN(data.projectCount)) data.projectCount = 0;
    });

    // Convertir en tableau et trier par année, filtrer les valeurs invalides
    return Object.values(projectsByYearMap)
      .filter((data) => !isNaN(data.year) && data.projectCount > 0)
      .sort((a, b) => a.year - b.year)
      .map((data) => ({
        year: data.year.toString(),
        totalStreams: Number.isFinite(data.totalStreams) ? data.totalStreams : 0,
        averageStreams: Number.isFinite(data.averageStreams) ? data.averageStreams : 0,
        projectCount: Number.isFinite(data.projectCount) ? data.projectCount : 0,
      }));
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

  const getStatusColor = (status: string) => {
    const statusConfig = PROJECT_STATUSES.find((s) => s.value === status);
    if (!statusConfig) return 'gray';

    const colorMap: Record<string, string> = {
      blue: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      green: 'bg-green-500/20 text-green-400 border-green-500/30',
      red: 'bg-red-500/20 text-red-400 border-red-500/30',
      orange: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
      purple: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    };

    return colorMap[statusConfig.color] || 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  };

  // Obtenir les couleurs pour les barres (même style que les cartes)
  const getStatusBarColors = (status: string) => {
    const statusConfig = PROJECT_STATUSES.find((s) => s.value === status);
    if (!statusConfig) {
      return {
        fill: 'rgba(107, 114, 128, 0.2)',
        stroke: 'rgba(107, 114, 128, 0.3)',
        text: '#9ca3af', // gray-400
      };
    }

    // Couleurs correspondant exactement aux cartes : bg-{color}-500/20, border-{color}-500/30, text-{color}-400
    // Opacité augmentée pour le contour (0.6) pour une meilleure visibilité
    const colorMap: Record<string, { fill: string; stroke: string; text: string }> = {
      blue: {
        fill: 'rgba(59, 130, 246, 0.2)', // bg-blue-500/20
        stroke: 'rgba(59, 130, 246, 0.6)', // border-blue-500/60 (augmenté pour plus de visibilité)
        text: '#60a5fa', // text-blue-400
      },
      green: {
        fill: 'rgba(34, 197, 94, 0.2)', // bg-green-500/20
        stroke: 'rgba(34, 197, 94, 0.6)', // border-green-500/60 (augmenté pour plus de visibilité)
        text: '#4ade80', // text-green-400
      },
      red: {
        fill: 'rgba(239, 68, 68, 0.2)', // bg-red-500/20
        stroke: 'rgba(239, 68, 68, 0.6)', // border-red-500/60 (augmenté pour plus de visibilité)
        text: '#f87171', // text-red-400
      },
      orange: {
        fill: 'rgba(249, 115, 22, 0.2)', // bg-orange-500/20
        stroke: 'rgba(249, 115, 22, 0.6)', // border-orange-500/60 (augmenté pour plus de visibilité)
        text: '#fb923c', // text-orange-400
      },
      purple: {
        fill: 'rgba(168, 85, 247, 0.2)', // bg-purple-500/20
        stroke: 'rgba(168, 85, 247, 0.6)', // border-purple-500/60 (augmenté pour plus de visibilité)
        text: '#c084fc', // text-purple-400
      },
    };

    return colorMap[statusConfig.color] || colorMap.blue;
  };

  // Tooltip personnalisé pour afficher les détails des projets
  const CustomTooltip = ({ active, payload, label }: TooltipProps) => {
    if (!active || !payload || !payload.length) return null;

    const year = String(label || '');
    const yearData = payload[0]?.payload;
    if (!yearData || !year || !statistics?.projectsByYearDetails[year]) return null;

    // projectsByYearDetails contient déjà seulement TERMINE et GHOST_PRODUCTION
    const allProjects = statistics.projectsByYearDetails[year];
    const termines = allProjects.filter((p: { id: string }) => {
      const project = initialProjects.find((proj) => proj.id === p.id);
      return project?.status === 'TERMINE';
    });
    const ghostProds = allProjects.filter((p: { id: string }) => {
      const project = initialProjects.find((proj) => proj.id === p.id);
      return project?.status === 'GHOST_PRODUCTION';
    });

    const total = typeof yearData.total === 'number' ? yearData.total : 0;

    return (
      <div className="bg-gray-900/95 border border-gray-700 rounded-lg p-4 shadow-xl min-w-[250px] max-w-[400px]">
        <div className="text-white font-semibold mb-3 text-center border-b border-gray-700 pb-2">
          {year} - Total: {total}
        </div>

        {termines.length > 0 &&
          (() => {
            const colors = getStatusBarColors('TERMINE');
            return (
              <div className="mb-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-3 h-3 rounded" style={{ backgroundColor: colors.text }} />
                  <span className="text-sm font-medium" style={{ color: colors.text }}>
                    Terminé ({termines.length} projet{termines.length > 1 ? 's' : ''})
                  </span>
                </div>
                <div className="pl-5 space-y-1 max-h-[150px] overflow-y-auto">
                  {termines.map((p: { id: string; name: string; releaseDate?: string }) => (
                    <div
                      key={p.id}
                      className="text-xs flex items-center justify-between gap-2"
                      style={{ color: colors.text }}
                    >
                      <span className="flex-1">{p.name}</span>
                      {p.releaseDate ? (
                        <span className="text-xs opacity-70">
                          {format(new Date(p.releaseDate), 'dd/MM/yyyy', { locale: fr })}
                        </span>
                      ) : (
                        <span className="text-xs opacity-50 italic">Sans date</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

        {ghostProds.length > 0 &&
          (() => {
            const colors = getStatusBarColors('GHOST_PRODUCTION');
            return (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-3 h-3 rounded" style={{ backgroundColor: colors.text }} />
                  <span className="text-sm font-medium" style={{ color: colors.text }}>
                    Ghost Prod ({ghostProds.length} projet{ghostProds.length > 1 ? 's' : ''})
                  </span>
                </div>
                <div className="pl-5 space-y-1 max-h-[150px] overflow-y-auto">
                  {ghostProds.map((p: { id: string; name: string; releaseDate?: string }) => (
                    <div
                      key={p.id}
                      className="text-xs flex items-center justify-between gap-2"
                      style={{ color: colors.text }}
                    >
                      <span className="flex-1">{p.name}</span>
                      {p.releaseDate ? (
                        <span className="text-xs opacity-70">
                          {format(new Date(p.releaseDate), 'dd/MM/yyyy', { locale: fr })}
                        </span>
                      ) : (
                        <span className="text-xs opacity-50 italic">Sans date</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
      </div>
    );
  };

  // Composant pour afficher le total au-dessus de la barre (seulement les barres visibles)
  const renderTotalLabel = (props: SegmentLabelProps) => {
    const { x, y, width, payload } = props;
    if (!payload) return null;

    // Calculer le total des barres visibles pour cette année spécifique
    let visibleTotal = 0;
    if (!hiddenStatuses.has('TERMINE')) {
      const termineValue = payload?.TERMINE;
      visibleTotal += typeof termineValue === 'number' ? termineValue : 0;
    }
    if (!hiddenStatuses.has('GHOST_PRODUCTION')) {
      const ghostValue = payload?.GHOST_PRODUCTION;
      visibleTotal += typeof ghostValue === 'number' ? ghostValue : 0;
    }

    if (visibleTotal === 0) return null;

    // Utiliser le total calculé, pas payload.total qui pourrait être incorrect
    const xNum = typeof x === 'number' ? x : 0;
    const yNum = typeof y === 'number' ? y : 0;
    const widthNum = typeof width === 'number' ? width : 0;
    return (
      <text
        x={xNum + widthNum / 2}
        y={yNum - 5}
        fill="#fff"
        textAnchor="middle"
        fontSize={12}
        fontWeight="bold"
      >
        {visibleTotal}
      </text>
    );
  };

  // Composant pour afficher la valeur de l'année pour chaque segment
  const createSegmentLabelRenderer = (status: 'TERMINE' | 'GHOST_PRODUCTION') => {
    const SegmentLabel = (props: SegmentLabelProps) => {
      const { x, y, width, height, payload, value } = props;
      // Pour les barres empilées, payload devrait contenir toutes les données de la ligne
      // Mais si payload n'est pas disponible, value contient la valeur du segment pour cette barre spécifique
      let segmentValue = 0;

      // Essayer d'abord payload[status]
      if (payload && typeof payload[status] === 'number') {
        segmentValue = payload[status] as number;
      }
      // Sinon, pour Ghost Prod, value est le total cumulé, on doit soustraire Terminé
      else if (status === 'GHOST_PRODUCTION' && payload && typeof payload.TERMINE === 'number') {
        segmentValue = (value || 0) - (payload.TERMINE as number);
      }
      // Pour Terminé ou si on n'a que value, utiliser value directement
      else if (typeof value === 'number') {
        segmentValue = value;
      }

      const heightNum = typeof height === 'number' ? height : 0;
      if (!segmentValue || segmentValue === 0 || !heightNum || heightNum < 15) return null;

      // Obtenir la couleur de texte (même que le contour des cartes) avec opacité augmentée
      const colors = getStatusBarColors(status);

      // Position au centre du segment
      const widthNum = typeof width === 'number' ? width : 0;
      const segmentY = (typeof y === 'number' ? y : 0) + heightNum / 2;
      const segmentX = (typeof x === 'number' ? x : 0) + widthNum / 2;

      return (
        <text
          x={segmentX}
          y={segmentY}
          fill={colors.text}
          textAnchor="middle"
          fontSize={12}
          fontWeight="bold"
          style={{
            textShadow: '0 0 4px rgba(0,0,0,0.9)',
            opacity: 1,
            fillOpacity: 1,
          }}
        >
          {segmentValue}
        </text>
      );
    };
    SegmentLabel.displayName = `SegmentLabel-${status}`;
    return SegmentLabel;
  };

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
                    content={<CustomTooltip />}
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
                            content={renderTermineLabel as any}
                            position="center"
                            dataKey="TERMINE"
                          />
                          {isTopBar && (
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
                            content={renderGhostProdLabel as any}
                            position="center"
                            dataKey="GHOST_PRODUCTION"
                          />
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
