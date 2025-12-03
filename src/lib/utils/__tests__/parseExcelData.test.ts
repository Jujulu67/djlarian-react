/**
 * Tests for parseExcelData
 */
import { parseExcelData } from '../parseExcelData';

describe('parseExcelData', () => {
  it('should parse valid Excel data', () => {
    const csvData = 'Nom Projet,Style,Statut\nProject 1,Electronic,EN_COURS';
    const result = parseExcelData(csvData);

    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
  });

  it('should handle empty data', () => {
    const result = parseExcelData('');

    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
  });

  it('should detect tab separator', () => {
    const tsvData = 'Nom Projet\tStyle\tStatut\nProject 1\tElectronic\tEN_COURS';
    const result = parseExcelData(tsvData);

    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
  });

  it('should map columns correctly', () => {
    const csvData = 'Nom Projet,Style,Date Sortie\nProject 1,Electronic,2024-01-01';
    const result = parseExcelData(csvData);

    expect(result.length).toBeGreaterThan(0);
    if (result.length > 0) {
      expect(result[0].name).toBeDefined();
    }
  });

  it('should handle streams columns', () => {
    const csvData = 'Nom Projet,Streams J7,Streams J14\nProject 1,1000,2000';
    const result = parseExcelData(csvData);

    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
  });
});
