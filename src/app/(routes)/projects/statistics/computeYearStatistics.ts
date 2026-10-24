import type { Project } from '@/components/projects/types';

import { MILESTONE_DAYS, type StatisticsData } from './types';

/**
 * Recalcule les statistiques pour une année donnée (projets créés dans l'année,
 * même sans date de sortie), à partir des statistiques globales et des projets.
 */
export function computeYearStatistics(
  statistics: StatisticsData,
  initialProjects: Project[],
  selectedYear: number
): StatisticsData {
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
}
