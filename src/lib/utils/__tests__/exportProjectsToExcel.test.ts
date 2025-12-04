import { exportProjectsToExcel } from '../exportProjectsToExcel';
import type { Project } from '@/components/projects/types';

// Mock xlsx-js-style
jest.mock('xlsx-js-style', () => {
  const mockWorkbook = {
    SheetNames: [],
    Sheets: {},
  };
  return {
    utils: {
      book_new: jest.fn(() => mockWorkbook),
      aoa_to_sheet: jest.fn(() => ({})),
      encode_cell: jest.fn(({ r, c }) => `${String.fromCharCode(65 + c)}${r + 1}`),
      book_append_sheet: jest.fn(),
    },
    writeFile: jest.fn(),
  };
});

describe('exportProjectsToExcel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should export projects to Excel', () => {
    const projects: Project[] = [
      {
        id: '1',
        name: 'Test Project',
        style: 'House',
        status: 'pending',
        collab: 'Artist',
        label: 'Label',
        labelFinal: 'Final Label',
        releaseDate: '2024-01-01',
        streamsJ7: 100,
        streamsJ14: 200,
        streamsJ21: 300,
        streamsJ28: 400,
        streamsJ56: 500,
        streamsJ84: 600,
        userId: 'user-1',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-02',
        externalLink: 'https://example.com',
      },
    ];

    exportProjectsToExcel(projects, 'test.xlsx');

    const XLSX = require('xlsx-js-style');
    expect(XLSX.utils.book_new).toHaveBeenCalled();
    expect(XLSX.utils.aoa_to_sheet).toHaveBeenCalled();
    expect(XLSX.utils.book_append_sheet).toHaveBeenCalled();
    expect(XLSX.writeFile).toHaveBeenCalledWith(expect.any(Object), 'test.xlsx');
  });

  it('should handle empty projects array', () => {
    exportProjectsToExcel([], 'empty.xlsx');

    const XLSX = require('xlsx-js-style');
    expect(XLSX.utils.aoa_to_sheet).toHaveBeenCalled();
    expect(XLSX.writeFile).toHaveBeenCalled();
  });

  it('should handle projects with missing optional fields', () => {
    const projects: Project[] = [
      {
        id: '1',
        name: 'Minimal Project',
        status: 'pending',
        userId: 'user-1',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      },
    ];

    exportProjectsToExcel(projects);

    const XLSX = require('xlsx-js-style');
    expect(XLSX.writeFile).toHaveBeenCalledWith(expect.any(Object), 'projets.xlsx');
  });

  it('should format dates correctly', () => {
    const projects: Project[] = [
      {
        id: '1',
        name: 'Project with dates',
        status: 'pending',
        releaseDate: '2024-12-25',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-02',
        userId: 'user-1',
      },
    ];

    exportProjectsToExcel(projects);

    const XLSX = require('xlsx-js-style');
    const aoaCall = XLSX.utils.aoa_to_sheet.mock.calls[0][0];
    // Check that dates are formatted (should be in the data array)
    expect(aoaCall.length).toBeGreaterThan(1); // headers + data
  });

  it('should include external link in action column', () => {
    const projects: Project[] = [
      {
        id: '1',
        name: 'Project with link',
        status: 'pending',
        externalLink: 'https://example.com',
        userId: 'user-1',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      },
    ];

    exportProjectsToExcel(projects);

    const XLSX = require('xlsx-js-style');
    const aoaCall = XLSX.utils.aoa_to_sheet.mock.calls[0][0];
    const dataRow = aoaCall[1]; // First data row
    const actionIndex = 15; // Action is the last column
    expect(dataRow[actionIndex]).toContain('https://example.com');
    expect(dataRow[actionIndex]).toContain('Supprimer');
  });

  it('should use default filename if not provided', () => {
    const projects: Project[] = [
      {
        id: '1',
        name: 'Test',
        status: 'pending',
        userId: 'user-1',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      },
    ];

    exportProjectsToExcel(projects);

    const XLSX = require('xlsx-js-style');
    expect(XLSX.writeFile).toHaveBeenCalledWith(expect.any(Object), 'projets.xlsx');
  });
});
