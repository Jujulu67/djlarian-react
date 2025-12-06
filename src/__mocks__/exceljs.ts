// Mock for exceljs module
// This avoids ESM/CommonJS issues in Jest tests

export class Workbook {
  worksheets: Worksheet[] = [];

  addWorksheet(name: string): Worksheet {
    const worksheet = new Worksheet(name);
    this.worksheets.push(worksheet);
    return worksheet;
  }

  getWorksheet(name: string): Worksheet | undefined {
    return this.worksheets.find((ws) => ws.name === name);
  }

  get xlsx() {
    return {
      writeBuffer: async (): Promise<Buffer> => {
        return Buffer.from('mock-excel-data');
      },
      writeFile: async (_filename: string): Promise<void> => {
        // Mock implementation
      },
    };
  }
}

class Worksheet {
  name: string;
  columns: Column[] = [];
  private rows: Row[] = [];
  private currentRow = 1;

  constructor(name: string) {
    this.name = name;
  }

  addRow(data: Record<string, unknown> | unknown[]): Row {
    const row = new Row(this.currentRow++);
    if (Array.isArray(data)) {
      row.values = data;
    } else {
      row.values = Object.values(data);
    }
    this.rows.push(row);
    return row;
  }

  getRow(rowNumber: number): Row {
    const existing = this.rows.find((r) => r.number === rowNumber);
    if (existing) return existing;
    const row = new Row(rowNumber);
    this.rows.push(row);
    return row;
  }

  eachRow(callback: (row: Row, rowNumber: number) => void): void {
    this.rows.forEach((row, index) => callback(row, index + 1));
  }
}

class Row {
  number: number;
  values: unknown[] = [];
  font?: { bold?: boolean; color?: { argb: string } };
  fill?: { type: string; pattern: string; fgColor?: { argb: string } };
  alignment?: { horizontal?: string };

  constructor(number: number) {
    this.number = number;
  }

  getCell(col: number): Cell {
    return new Cell(this.values[col - 1]);
  }

  eachCell(callback: (cell: Cell, colNumber: number) => void): void {
    this.values.forEach((value, index) => callback(new Cell(value), index + 1));
  }
}

class Cell {
  value: unknown;
  font?: { bold?: boolean; color?: { argb: string } };
  fill?: { type: string; pattern: string; fgColor?: { argb: string } };
  alignment?: { horizontal?: string };

  constructor(value: unknown) {
    this.value = value;
  }
}

interface Column {
  header: string;
  key: string;
  width: number;
}

export default { Workbook };
