import type { Project } from '@/components/projects/types';

import { computeYearStatistics } from '../computeYearStatistics';
import type { StatisticsData } from '../types';

const baseStatistics: StatisticsData = {
  totalProjects: 99,
  statusBreakdown: { TERMINE: 0, EN_COURS: 0, ANNULE: 0, A_REWORK: 0, GHOST_PRODUCTION: 0 },
  projectsByYear: [],
  projectsByYearDetails: { '2025': [] },
  streamsEvolution: [],
  globalStreamsEvolution: [],
  metrics: {
    averageStreams: { J7: 0, J14: 0, J21: 0, J28: 0, J56: 0, J84: 0 },
    totalStreams: 0,
    maxStreams: 4242,
    projectsWithStreams: 0,
  },
};

const project = (overrides: Partial<Project>): Project =>
  ({
    id: 'p',
    name: 'Projet',
    status: 'EN_COURS',
    style: null,
    releaseDate: null,
    createdAt: '2025-03-01T00:00:00.000Z',
    ...overrides,
  }) as Project;

describe('computeYearStatistics', () => {
  const projects = [
    project({ id: 'a', name: 'A', status: 'TERMINE', streamsJ7: 100, streamsJ28: 300 }),
    project({ id: 'b', name: 'B', status: 'TERMINE', streamsJ7: 200 }),
    project({ id: 'c', name: 'C', status: 'GHOST_PRODUCTION' }),
    project({ id: 'd', name: 'D', status: 'EN_COURS' }),
    project({
      id: 'old',
      status: 'TERMINE',
      streamsJ7: 9999,
      createdAt: '2024-06-01T00:00:00.000Z',
    }),
    project({ id: 'nodate', status: 'TERMINE', createdAt: undefined }),
  ];

  const result = computeYearStatistics(baseStatistics, projects, 2025);

  it('keeps only projects created in the selected year', () => {
    expect(result.totalProjects).toBe(4);
    expect(result.statusBreakdown).toEqual({
      TERMINE: 2,
      EN_COURS: 1,
      ANNULE: 0,
      A_REWORK: 0,
      GHOST_PRODUCTION: 1,
    });
  });

  it('computes stream metrics from projects with streams', () => {
    expect(result.metrics.projectsWithStreams).toBe(2);
    expect(result.metrics.averageStreams.J7).toBe(150);
    expect(result.metrics.averageStreams.J28).toBe(300);
    expect(result.metrics.averageStreams.J14).toBe(0);
    // Dernier jalon renseigné par projet : A=300 (J28), B=200 (J7)
    expect(result.metrics.totalStreams).toBe(500);
    // Valeurs globales non recalculées conservées
    expect(result.metrics.maxStreams).toBe(4242);
    expect(result.projectsByYearDetails).toBe(baseStatistics.projectsByYearDetails);
  });

  it('builds per-project and global stream evolutions', () => {
    expect(result.streamsEvolution.map((p) => p.projectId)).toEqual(['a', 'b']);
    expect(result.streamsEvolution[0].streams.find((s) => s.day === 28)?.value).toBe(300);
    expect(result.globalStreamsEvolution.find((s) => s.day === 7)?.value).toBe(300);
  });

  it('counts finished projects for the year', () => {
    expect(result.projectsByYear).toEqual([
      { year: '2025', TERMINE: 2, GHOST_PRODUCTION: 1, total: 3 },
    ]);
  });
});
