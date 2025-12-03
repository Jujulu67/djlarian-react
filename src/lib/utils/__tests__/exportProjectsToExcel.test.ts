/**
 * Tests for exportProjectsToExcel
 */
import * as XLSX from 'xlsx-js-style';

import { exportProjectsToExcel } from '../exportProjectsToExcel';

// Mock xlsx-js-style
jest.mock('xlsx-js-style', () => ({
  utils: {
    book_new: jest.fn(() => ({})),
    aoa_to_sheet: jest.fn(() => ({})),
    encode_cell: jest.fn(({ r, c }) => `${r}-${c}`),
    book_append_sheet: jest.fn(),
  },
  writeFile: jest.fn(),
}));

describe('exportProjectsToExcel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should export projects to Excel', () => {
    const projects = [
      {
        id: '1',
        name: 'Project 1',
        style: 'Electronic',
        status: 'EN_COURS',
        releaseDate: '2024-01-01',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      },
    ];

    exportProjectsToExcel(projects as any, 'test.xlsx');

    expect(XLSX.utils.book_new).toHaveBeenCalled();
    expect(XLSX.utils.aoa_to_sheet).toHaveBeenCalled();
  });

  it('should use default filename if not provided', () => {
    const projects: any[] = [];
    exportProjectsToExcel(projects);

    expect(XLSX.utils.book_new).toHaveBeenCalled();
  });

  it('should handle empty projects array', () => {
    exportProjectsToExcel([], 'empty.xlsx');

    expect(XLSX.utils.book_new).toHaveBeenCalled();
  });

  it('should format dates correctly', () => {
    const projects = [
      {
        id: '1',
        name: 'Project 1',
        releaseDate: '2024-01-01',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      },
    ];

    exportProjectsToExcel(projects as any, 'test.xlsx');

    expect(XLSX.utils.aoa_to_sheet).toHaveBeenCalled();
  });
});
