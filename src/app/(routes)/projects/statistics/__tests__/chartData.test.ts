import {
  buildComparisonChartData,
  buildComparisonProjectMapping,
  buildYearlyProgressionData,
  filterProjectsForComparison,
  type StreamsProject,
} from '../chartData';
import { getColorForIndex, getStatusBarColors, getStatusColor } from '../statusColors';

const streamsProject = (
  projectId: string,
  releaseDate: string | null,
  values: Record<number, number>
): StreamsProject => ({
  projectId,
  projectName: `Projet ${projectId}`,
  style: null,
  releaseDate,
  streams: [7, 14, 21, 28, 56, 84, 180, 365].map((day) => ({ day, value: values[day] ?? 0 })),
});

const a = streamsProject('a', '2024-05-01T00:00:00.000Z', { 7: 100, 28: 400 });
const b = streamsProject('b', '2025-02-01T00:00:00.000Z', { 7: 50 });
const c = streamsProject('c', null, { 14: 10 });

describe('filterProjectsForComparison', () => {
  it('returns every project without a year filter', () => {
    expect(filterProjectsForComparison([a, b, c], null)).toEqual([a, b, c]);
  });

  it('keeps projects released in the filtered year only', () => {
    expect(filterProjectsForComparison([a, b, c], 2025)).toEqual([b]);
  });
});

describe('buildComparisonProjectMapping', () => {
  it('maps every project in "all" mode', () => {
    expect(buildComparisonProjectMapping([a, b], 'all', []).map((m) => m.dataKey)).toEqual([
      'project0',
      'project1',
    ]);
  });

  it('needs two selected projects found in the list in "two" mode', () => {
    expect(buildComparisonProjectMapping([a, b], 'two', ['a'])).toEqual([]);
    expect(buildComparisonProjectMapping([a, b], 'two', ['a', 'zzz'])).toEqual([]);
    expect(
      buildComparisonProjectMapping([a, b], 'two', ['b', 'a']).map((m) => m.projectId)
    ).toEqual(['b', 'a']);
  });
});

describe('buildComparisonChartData', () => {
  it('keeps only milestones with at least one value in "all" mode', () => {
    expect(buildComparisonChartData([a, b], 'all', [])).toEqual([
      { day: 'J7', project0: 100, project1: 50 },
      { day: 'J28', project0: 400, project1: null },
    ]);
  });

  it('compares the two selected projects in "two" mode', () => {
    expect(buildComparisonChartData([a, c], 'two', ['a', 'c'])).toEqual([
      { day: 'J7', project0: 100, project1: null },
      { day: 'J14', project0: null, project1: 10 },
      { day: 'J28', project0: 400, project1: null },
    ]);
  });
});

describe('buildYearlyProgressionData', () => {
  it('groups by release year using the best milestone of each project', () => {
    const a2 = streamsProject('a2', '2024-09-01T00:00:00.000Z', { 7: 200 });

    expect(buildYearlyProgressionData([b, a, c, a2])).toEqual([
      { year: '2024', totalStreams: 600, averageStreams: 300, projectCount: 2 },
      { year: '2025', totalStreams: 50, averageStreams: 50, projectCount: 1 },
    ]);
  });
});

describe('status colors', () => {
  it('uses the base palette up to 8 projects, then HSL colors', () => {
    expect(getColorForIndex(0, 3)).toBe('#a855f7');
    expect(getColorForIndex(9, 10)).toMatch(/^hsl\(/);
  });

  it('falls back for unknown statuses', () => {
    expect(getStatusColor('UNKNOWN')).toBe('gray');
    expect(getStatusBarColors('UNKNOWN').text).toBe('#9ca3af');
  });
});
