import type { Project } from '@/components/projects/types';

import { filterAndSortProjects, getFieldOptions, type ProjectFilters } from '../projectsFiltering';

const project = (overrides: Partial<Project>): Project =>
  ({
    id: 'p',
    name: 'Projet',
    status: 'EN_COURS',
    style: null,
    collab: null,
    label: null,
    labelFinal: null,
    releaseDate: null,
    ...overrides,
  }) as Project;

const projects = [
  project({
    id: 'a',
    name: 'Alpha',
    status: 'TERMINE',
    style: 'Techno',
    releaseDate: '2020-01-01',
  }),
  project({
    id: 'b',
    name: 'Bravo',
    status: 'EN_COURS',
    style: 'House',
    releaseDate: '2999-01-01',
  }),
  project({ id: 'c', name: 'charlie', status: 'EN_COURS', collab: 'Zed' }),
];

const noFilters: ProjectFilters = {
  statusFilter: 'ALL',
  searchTerm: '',
  fieldFilters: { name: '', style: '', collab: '', label: '', labelFinal: '', externalLink: '' },
  showReleasedProjects: true,
  highlightedFromNotification: null,
  sortField: null,
  sortDirection: 'asc',
};

const ids = (list: Project[]) => list.map((p) => p.id);

describe('filterAndSortProjects', () => {
  it('returns projects unchanged without filters', () => {
    expect(ids(filterAndSortProjects(projects, noFilters))).toEqual(['a', 'b', 'c']);
  });

  it('filters by status, search term and field filters', () => {
    expect(
      ids(filterAndSortProjects(projects, { ...noFilters, statusFilter: 'EN_COURS' }))
    ).toEqual(['b', 'c']);
    expect(ids(filterAndSortProjects(projects, { ...noFilters, searchTerm: ' zed ' }))).toEqual([
      'c',
    ]);
    expect(
      ids(
        filterAndSortProjects(projects, {
          ...noFilters,
          fieldFilters: { ...noFilters.fieldFilters, style: 'hou' },
        })
      )
    ).toEqual(['b']);
  });

  it('hides already released projects when asked', () => {
    expect(
      ids(filterAndSortProjects(projects, { ...noFilters, showReleasedProjects: false }))
    ).toEqual(['b', 'c']);
  });

  it('keeps the highlighted project first even when filtered out', () => {
    expect(
      ids(
        filterAndSortProjects(projects, {
          ...noFilters,
          statusFilter: 'EN_COURS',
          highlightedFromNotification: 'a',
        })
      )
    ).toEqual(['a', 'b', 'c']);
  });

  it('sorts strings and dates, nulls last', () => {
    expect(
      ids(
        filterAndSortProjects(projects, { ...noFilters, sortField: 'name', sortDirection: 'desc' })
      )
    ).toEqual(['c', 'b', 'a']);
    expect(
      ids(filterAndSortProjects(projects, { ...noFilters, sortField: 'releaseDate' }))
    ).toEqual(['a', 'b', 'c']);
  });
});

describe('getFieldOptions', () => {
  it('returns unique, trimmed, sorted non-empty values', () => {
    const list = [
      project({ style: ' House ' }),
      project({ style: 'Techno' }),
      project({ style: 'House' }),
      project({ style: '' }),
    ];
    expect(getFieldOptions(list, 'style')).toEqual(['House', 'Techno']);
  });
});
