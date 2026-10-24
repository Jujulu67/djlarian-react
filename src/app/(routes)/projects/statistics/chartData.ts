import { MILESTONE_DAYS, type StatisticsData } from './types';

export type StreamsProject = StatisticsData['streamsEvolution'][number];

// Type pour le mapping des projets en mode comparaison
export type ProjectMapping = {
  index: number;
  projectId: string;
  projectName: string;
  style?: string | null;
  dataKey: string;
};

export type ComparisonMode = 'two' | 'all';

/** Projets comparables, filtrés par année de sortie si une année est sélectionnée */
export function filterProjectsForComparison(
  streamsEvolution: StreamsProject[],
  comparisonYearFilter: number | null
): StreamsProject[] {
  let projects = streamsEvolution;

  // Filtrer par année si une année est sélectionnée
  if (comparisonYearFilter !== null) {
    projects = projects.filter((project) => {
      if (!project.releaseDate) return false;
      const projectYear = new Date(project.releaseDate).getFullYear();
      return projectYear === comparisonYearFilter;
    });
  }

  return projects;
}

/** Mapping des projets pour le mode comparaison (AVANT les données) */
export function buildComparisonProjectMapping(
  filteredProjects: StreamsProject[],
  comparisonMode: ComparisonMode,
  selectedProjectsForComparison: string[]
): ProjectMapping[] {
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
    const project1 = filteredProjects.find((p) => p.projectId === selectedProjectsForComparison[0]);
    const project2 = filteredProjects.find((p) => p.projectId === selectedProjectsForComparison[1]);
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
}

/** Données du graphique en mode comparaison (un point par jalon ayant au moins une valeur) */
export function buildComparisonChartData(
  filteredProjects: StreamsProject[],
  comparisonMode: ComparisonMode,
  selectedProjectsForComparison: string[]
) {
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
    const project1 = filteredProjects.find((p) => p.projectId === selectedProjectsForComparison[0]);
    const project2 = filteredProjects.find((p) => p.projectId === selectedProjectsForComparison[1]);
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
}

/** Évolution annuelle des performances (streams max par projet, groupés par année de sortie) */
export function buildYearlyProgressionData(streamsEvolution: StreamsProject[]) {
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
  streamsEvolution.forEach((project) => {
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
}
