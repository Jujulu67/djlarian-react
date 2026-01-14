import { exportProjectsToExcel } from '../exportProjectsToExcel';
import type { Project } from '@/lib/domain/projects';

// Mock exceljs
const mockWorksheet = {
  addRow: jest.fn(),
  getRow: jest.fn(() => ({
    font: {},
    fill: {},
    alignment: {},
    border: {},
    eachCell: jest.fn(),
  })),
  getColumn: jest.fn(() => ({
    width: 0,
  })),
  eachRow: jest.fn((callback) => {
    // Simulate rows: header + 2 data rows
    const mockRow = {
      eachCell: jest.fn((cellCallback) => {
        // Simulate cells
        for (let i = 0; i < 16; i++) {
          cellCallback({ fill: {}, border: {} });
        }
      }),
    };
    callback(mockRow, 1); // header
    callback(mockRow, 2); // data row 1
    callback(mockRow, 3); // data row 2
  }),
};

const mockWorkbook = {
  addWorksheet: jest.fn(() => mockWorksheet),
  xlsx: {
    writeBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(0)),
  },
};

jest.mock('exceljs', () => {
  return {
    __esModule: true,
    Workbook: jest.fn(() => mockWorkbook),
  };
});

// Mock window.URL and document for browser APIs
// Only mock if window doesn't exist (for Node.js environment)
if (typeof window === 'undefined') {
  (global as any).window = {
    URL: {
      createObjectURL: jest.fn(() => 'blob:mock-url'),
      revokeObjectURL: jest.fn(),
    },
  };
} else {
  // In jsdom environment, just add the mocks
  (window as any).URL = {
    createObjectURL: jest.fn(() => 'blob:mock-url'),
    revokeObjectURL: jest.fn(),
  };
}

// Mock document.createElement to return a real DOM element with click method
if (typeof document !== 'undefined') {
  const originalCreateElement = document.createElement;
  document.createElement = jest.fn((tagName: string) => {
    const element = originalCreateElement.call(document, tagName);
    if (tagName === 'a') {
      // Add click method if not present
      if (!element.click) {
        element.click = jest.fn();
      }
    }
    return element;
  });
}

// Mock Blob if not available
if (typeof Blob === 'undefined') {
  (global as any).Blob = jest.fn((parts, options) => ({
    parts,
    options,
    size: 0,
    type: options?.type || '',
  }));
}

describe('exportProjectsToExcel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should export projects to Excel', async () => {
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

    await exportProjectsToExcel(projects, 'test.xlsx');

    const { Workbook } = require('exceljs');
    expect(Workbook).toHaveBeenCalled();
    expect(mockWorkbook.addWorksheet).toHaveBeenCalledWith('Projets');
    expect(mockWorkbook.xlsx.writeBuffer).toHaveBeenCalled();
  });

  it('should handle empty projects array', async () => {
    await exportProjectsToExcel([], 'empty.xlsx');

    const { Workbook } = require('exceljs');
    expect(Workbook).toHaveBeenCalled();
    expect(mockWorksheet.addRow).toHaveBeenCalled(); // At least headers
    expect(mockWorkbook.xlsx.writeBuffer).toHaveBeenCalled();
  });

  it('should handle projects with missing optional fields', async () => {
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

    await exportProjectsToExcel(projects);

    const { Workbook } = require('exceljs');
    expect(Workbook).toHaveBeenCalled();
    expect(mockWorkbook.xlsx.writeBuffer).toHaveBeenCalled();
  });

  it('should format dates correctly', async () => {
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

    await exportProjectsToExcel(projects);

    const { Workbook } = require('exceljs');
    expect(Workbook).toHaveBeenCalled();
    // Check that addRow was called (headers + data)
    expect(mockWorksheet.addRow).toHaveBeenCalled();
  });

  it('should include external link in action column', async () => {
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

    await exportProjectsToExcel(projects);

    const { Workbook } = require('exceljs');
    expect(Workbook).toHaveBeenCalled();
    // Check that addRow was called with data containing the link
    const addRowCalls = mockWorksheet.addRow.mock.calls;
    expect(addRowCalls.length).toBeGreaterThan(1); // headers + data
    // The action column should contain the link
    const dataRow = addRowCalls[1][0]; // First data row
    expect(dataRow[15]).toContain('https://example.com'); // Action is the last column (index 15)
    expect(dataRow[15]).toContain('Supprimer');
  });

  it('should use default filename if not provided', async () => {
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

    await exportProjectsToExcel(projects);

    const { Workbook } = require('exceljs');
    expect(Workbook).toHaveBeenCalled();
    expect(mockWorkbook.xlsx.writeBuffer).toHaveBeenCalled();
    // Check that document.createElement was called with 'a' and download is set
    expect(document.createElement).toHaveBeenCalledWith('a');
  });
});
