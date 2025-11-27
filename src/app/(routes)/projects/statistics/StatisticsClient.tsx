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
    };
    totalStreams: number;
    maxStreams: number;
    projectsWithStreams: number;
  };
}

export const StatisticsClient = ({ initialProjects }: StatisticsClientProps) => {
  const [statistics, setStatistics] = useState<StatisticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'project' | 'global'>('project');
  const [yearViewMode, setYearViewMode] = useState<'global' | 'year'>('global');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [hiddenStatuses, setHiddenStatuses] = useState<Set<string>>(new Set());

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
        p.streamsJ7 || p.streamsJ14 || p.streamsJ21 || p.streamsJ28 || p.streamsJ56 || p.streamsJ84
    );

    // Calculer les moyennes pour tous les jalons
    const calculateAverage = (day: number) => {
      const fieldMap: Record<
        number,
        'streamsJ7' | 'streamsJ14' | 'streamsJ21' | 'streamsJ28' | 'streamsJ56' | 'streamsJ84'
      > = {
        7: 'streamsJ7',
        14: 'streamsJ14',
        21: 'streamsJ21',
        28: 'streamsJ28',
        56: 'streamsJ56',
        84: 'streamsJ84',
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
    };

    const totalStreams = projectsWithStreams.reduce((sum, p) => {
      return (
        sum +
        (p.streamsJ84 ||
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
            p.streamsJ84)
      )
      .map((p) => ({
        projectId: p.id,
        projectName: p.name,
        releaseDate: p.releaseDate ? new Date(p.releaseDate).toISOString() : null,
        streams: [
          { day: 7, value: p.streamsJ7 || 0 },
          { day: 14, value: p.streamsJ14 || 0 },
          { day: 21, value: p.streamsJ21 || 0 },
          { day: 28, value: p.streamsJ28 || 0 },
          { day: 56, value: p.streamsJ56 || 0 },
          { day: 84, value: p.streamsJ84 || 0 },
        ],
      }));

    // Streams totaux par jalon pour l'année
    const globalStreamsEvolution = [7, 14, 21, 28, 56, 84].map((day) => {
      const fieldMap: Record<
        number,
        'streamsJ7' | 'streamsJ14' | 'streamsJ21' | 'streamsJ28' | 'streamsJ56' | 'streamsJ84'
      > = {
        7: 'streamsJ7',
        14: 'streamsJ14',
        21: 'streamsJ21',
        28: 'streamsJ28',
        56: 'streamsJ56',
        84: 'streamsJ84',
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
    return statistics.projectsByYear.map((p) => parseInt(p.year)).sort((a, b) => b - a);
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

  const streamsChartData = useMemo(() => {
    if (!displayStats) return [];
    if (viewMode === 'global' && displayStats.globalStreamsEvolution) {
      return displayStats.globalStreamsEvolution.map((s) => ({
        day: `J${s.day}`,
        streams: s.value,
      }));
    }
    if (!selectedProject) return [];
    return selectedProject.streams.map((s) => ({
      day: `J${s.day}`,
      streams: s.value,
    }));
  }, [selectedProject, viewMode, displayStats]);

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
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;

    const year = label;
    const yearData = payload[0]?.payload;
    if (!yearData || !statistics?.projectsByYearDetails[year]) return null;

    // projectsByYearDetails contient déjà seulement TERMINE et GHOST_PRODUCTION
    const allProjects = statistics.projectsByYearDetails[year];
    const termines = allProjects.filter((p: any) => {
      const project = initialProjects.find((proj) => proj.id === p.id);
      return project?.status === 'TERMINE';
    });
    const ghostProds = allProjects.filter((p: any) => {
      const project = initialProjects.find((proj) => proj.id === p.id);
      return project?.status === 'GHOST_PRODUCTION';
    });

    const total = yearData.total || 0;

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
                  {termines.map((p: any) => (
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
                  {ghostProds.map((p: any) => (
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
  const renderTotalLabel = (props: any) => {
    const { x, y, width, payload } = props;
    if (!payload) return null;

    // Calculer le total des barres visibles pour cette année spécifique
    let visibleTotal = 0;
    if (!hiddenStatuses.has('TERMINE')) {
      visibleTotal += payload.TERMINE || 0;
    }
    if (!hiddenStatuses.has('GHOST_PRODUCTION')) {
      visibleTotal += payload.GHOST_PRODUCTION || 0;
    }

    if (visibleTotal === 0) return null;

    // Utiliser le total calculé, pas payload.total qui pourrait être incorrect
    return (
      <text
        x={x + width / 2}
        y={y - 5}
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
    return (props: any) => {
      const { x, y, width, height, payload, value } = props;
      // Pour les barres empilées, payload devrait contenir toutes les données de la ligne
      // Mais si payload n'est pas disponible, value contient la valeur du segment pour cette barre spécifique
      let segmentValue = 0;

      // Essayer d'abord payload[status]
      if (payload && typeof payload[status] === 'number') {
        segmentValue = payload[status];
      }
      // Sinon, pour Ghost Prod, value est le total cumulé, on doit soustraire Terminé
      else if (status === 'GHOST_PRODUCTION' && payload && typeof payload.TERMINE === 'number') {
        segmentValue = (value || 0) - payload.TERMINE;
      }
      // Pour Terminé ou si on n'a que value, utiliser value directement
      else if (typeof value === 'number') {
        segmentValue = value;
      }

      if (!segmentValue || segmentValue === 0 || !height || height < 15) return null;

      // Obtenir la couleur de texte (même que le contour des cartes) avec opacité augmentée
      const colors = getStatusBarColors(status);

      // Position au centre du segment
      const segmentY = y + height / 2;

      return (
        <text
          x={x + width / 2}
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
                            content={renderTermineLabel}
                            position="center"
                            dataKey="TERMINE"
                          />
                          {isTopBar && <LabelList content={renderTotalLabel} position="top" />}
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
                            content={renderGhostProdLabel}
                            position="center"
                            dataKey="GHOST_PRODUCTION"
                          />
                          <LabelList content={renderTotalLabel} position="top" />
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
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {(['J7', 'J14', 'J21', 'J28', 'J56', 'J84'] as const).map((jalon) => {
              const value = displayStats.metrics.averageStreams[jalon];
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
              {/* Toggle mode global/projet */}
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
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'rgba(0, 0, 0, 0.8)',
                          border: 'none',
                          borderRadius: '8px',
                          color: '#fff',
                        }}
                        formatter={(value: number) => [
                          `${value.toLocaleString()} streams`,
                          viewMode === 'global' ? 'Total' : null,
                        ]}
                      />
                      <Line
                        type="monotone"
                        dataKey="streams"
                        stroke="#a855f7"
                        strokeWidth={2}
                        dot={{ r: 4, fill: '#a855f7' }}
                        activeDot={{ r: 6, strokeWidth: 2, fill: '#a855f7' }}
                      />
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
