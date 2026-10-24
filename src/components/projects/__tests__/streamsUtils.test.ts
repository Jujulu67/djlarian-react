import {
  analyzeStreamsFile,
  getFileStatus,
  getValidatedFiles,
  NO_RELEASE_DATE_ERROR,
  toIsoDateOnly,
} from '../import-streams/streamsUtils';
import type { FileImportData } from '../import-streams/types';
import type { Project } from '@/lib/domain/projects';
import { formatDateFrench } from '@/lib/utils/format';

function makeProject(overrides: Partial<Project>): Project {
  return {
    id: 'p1',
    userId: 'u1',
    order: 0,
    name: 'Magnetized',
    style: null,
    status: 'EN_COURS',
    collab: null,
    label: null,
    labelFinal: null,
    deadline: null,
    releaseDate: '2024-01-01',
    externalLink: null,
    streamsJ7: null,
    streamsJ14: null,
    streamsJ21: null,
    streamsJ28: null,
    streamsJ56: null,
    streamsJ84: null,
    streamsJ180: null,
    streamsJ365: null,
    progress: null,
    note: null,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  } as Project;
}

const CSV = 'date,streams\n2023-12-31,100\n2024-01-01,150\n2024-01-02,200\n';

function makeFileData(overrides: Partial<FileImportData>): FileImportData {
  return {
    file: new File([''], 'Magnetized-timeline.csv', { type: 'text/csv' }),
    csvData: { fileName: 'Magnetized-timeline.csv', projectName: 'Magnetized', streams: [] },
    candidates: [],
    selectedProjectId: null,
    milestones: null,
    ...overrides,
  };
}

const MILESTONES = {
  streamsJ7: 1,
  streamsJ14: null,
  streamsJ21: null,
  streamsJ28: null,
  streamsJ56: null,
  streamsJ84: null,
  streamsJ180: null,
  streamsJ365: null,
};

describe('formatDateFrench', () => {
  it('returns an empty string for null or empty input', () => {
    expect(formatDateFrench(null)).toBe('');
    expect(formatDateFrench('')).toBe('');
  });

  it('formats a date as DD/MM/YYYY', () => {
    const iso = new Date(2024, 2, 5, 12).toISOString();
    expect(formatDateFrench(iso)).toBe('05/03/2024');
  });
});

describe('toIsoDateOnly', () => {
  it('returns the local calendar date as YYYY-MM-DD', () => {
    const iso = new Date(2024, 10, 9, 12).toISOString();
    expect(toIsoDateOnly(iso)).toBe('2024-11-09');
  });
});

describe('analyzeStreamsFile', () => {
  const file = new File([CSV], 'Magnetized-timeline.csv', { type: 'text/csv' });

  it('auto-selects an exact match and computes milestones from its release date', () => {
    const projects = [makeProject({ id: 'p1', name: 'Magnetized', releaseDate: '2024-01-01' })];

    const result = analyzeStreamsFile(file, CSV, projects);

    expect(result.error).toBeUndefined();
    expect(result.selectedProjectId).toBe('p1');
    expect(result.csvData.projectName).toBe('Magnetized');
    expect(result.csvData.streams).toHaveLength(3);
    expect(result.milestones).not.toBeNull();
    expect(result.candidates[0].project.id).toBe('p1');
  });

  it('reports the missing release date when the auto-selected project has none', () => {
    const projects = [makeProject({ id: 'p1', name: 'Magnetized', releaseDate: null })];

    const result = analyzeStreamsFile(file, CSV, projects);

    expect(result.error).toBe(NO_RELEASE_DATE_ERROR);
    expect(result.selectedProjectId).toBeNull();
    expect(result.milestones).toBeNull();
    expect(result.candidates).toHaveLength(1);
  });

  it('returns the CSV parsing errors without looking for candidates', () => {
    const badCsv = 'date,streams\n2024-01-01\n';

    const result = analyzeStreamsFile(file, badCsv, [makeProject({})]);

    expect(result.error).toBe('Ligne 2: Format invalide (attendu: date,streams)');
    expect(result.candidates).toEqual([]);
    expect(result.selectedProjectId).toBeNull();
    expect(result.milestones).toBeNull();
  });

  it('does not select anything when no project matches the file name', () => {
    const projects = [makeProject({ id: 'p9', name: 'Completely Unrelated Title' })];

    const result = analyzeStreamsFile(file, CSV, projects);

    expect(result.error).toBeUndefined();
    expect(result.selectedProjectId).toBeNull();
    expect(result.milestones).toBeNull();
  });
});

describe('getFileStatus', () => {
  it('returns error when the file has an error', () => {
    expect(getFileStatus(makeFileData({ error: 'boom', isValidated: true }))).toBe('error');
  });

  it('returns validated only when validated, selected and with milestones', () => {
    expect(
      getFileStatus(
        makeFileData({ isValidated: true, selectedProjectId: 'p1', milestones: MILESTONES })
      )
    ).toBe('validated');
    expect(
      getFileStatus(makeFileData({ isValidated: true, selectedProjectId: 'p1', milestones: null }))
    ).toBe('pending');
  });

  it('returns pending otherwise', () => {
    expect(getFileStatus(makeFileData({}))).toBe('pending');
  });
});

describe('getValidatedFiles', () => {
  it('keeps only files that are validated, selected, with milestones and no error', () => {
    const ok = makeFileData({
      isValidated: true,
      selectedProjectId: 'p1',
      milestones: MILESTONES,
    });
    const notValidated = makeFileData({ selectedProjectId: 'p1', milestones: MILESTONES });
    const withError = makeFileData({
      isValidated: true,
      selectedProjectId: 'p1',
      milestones: MILESTONES,
      error: 'boom',
    });

    expect(getValidatedFiles([ok, notValidated, withError])).toEqual([ok]);
  });
});
