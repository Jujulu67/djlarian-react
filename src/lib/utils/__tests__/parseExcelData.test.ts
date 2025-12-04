/**
 * Tests for parseExcelData
 */
import { parseExcelData } from '../parseExcelData';

describe('parseExcelData', () => {
  it('should parse valid Excel data with headers', () => {
    const csvData = 'Nom Projet,Style,Statut\nProject 1,Electronic,EN_COURS';
    const result = parseExcelData(csvData);

    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(1);
    expect(result[0].name).toBe('Project 1');
    expect(result[0].style).toBe('Electronic');
    expect(result[0].status).toBe('EN_COURS');
  });

  it('should handle empty data', () => {
    const result = parseExcelData('');

    expect(result).toEqual([]);
  });

  it('should handle whitespace-only data', () => {
    const result = parseExcelData('   \n  \n  ');

    expect(result).toEqual([]);
  });

  it('should detect tab separator', () => {
    const tsvData = 'Nom Projet\tStyle\tStatut\nProject 1\tElectronic\tEN_COURS';
    const result = parseExcelData(tsvData);

    expect(result.length).toBe(1);
    expect(result[0].name).toBe('Project 1');
  });

  it('should detect comma separator', () => {
    const csvData = 'Nom Projet,Style,Statut\nProject 1,Electronic,EN_COURS';
    const result = parseExcelData(csvData);

    expect(result.length).toBe(1);
    expect(result[0].name).toBe('Project 1');
  });

  it('should parse date in French format', () => {
    const csvData = 'Nom Projet,Date Sortie\nProject 1,01/01/2024';
    const result = parseExcelData(csvData, true, 'fr');

    expect(result[0].releaseDate).toBe('2024-01-01');
  });

  it('should parse date in English format', () => {
    const csvData = 'Nom Projet,Date Sortie\nProject 1,01/15/2024';
    const result = parseExcelData(csvData, true, 'en');

    expect(result[0].releaseDate).toBe('2024-01-15');
  });

  it('should parse ISO date format', () => {
    const csvData = 'Nom Projet,Date Sortie\nProject 1,2024-01-01';
    const result = parseExcelData(csvData);

    expect(result[0].releaseDate).toBe('2024-01-01');
  });

  it('should parse streams columns', () => {
    const csvData = 'Nom Projet,Streams J7,Streams J14\nProject 1,1000,2000';
    const result = parseExcelData(csvData);

    expect(result[0].streamsJ7).toBe(1000);
    expect(result[0].streamsJ14).toBe(2000);
  });

  it('should parse all stream columns', () => {
    const csvData =
      'Nom Projet,Streams J7,Streams J14,Streams J21,Streams J28,Streams J56,Streams J84\nProject 1,1000,2000,3000,4000,5000,6000';
    const result = parseExcelData(csvData);

    expect(result[0].streamsJ7).toBe(1000);
    expect(result[0].streamsJ14).toBe(2000);
    expect(result[0].streamsJ21).toBe(3000);
    expect(result[0].streamsJ28).toBe(4000);
    expect(result[0].streamsJ56).toBe(5000);
    expect(result[0].streamsJ84).toBe(6000);
  });

  it('should parse data without headers', () => {
    const csvData = 'Project 1,Electronic,EN_COURS';
    const result = parseExcelData(csvData, false);

    expect(result.length).toBe(1);
    expect(result[0].name).toBe('Project 1');
  });

  it('should format title case for names', () => {
    const csvData = 'Nom Projet\nDONT GO';
    const result = parseExcelData(csvData);

    expect(result[0].name).toBe('Dont Go');
  });

  it('should parse status correctly', () => {
    const csvData = 'Nom Projet,Statut\nProject 1,TERMINÉ';
    const result = parseExcelData(csvData);

    expect(result[0].status).toBe('TERMINE');
  });

  it('should parse collab field', () => {
    const csvData = 'Nom Projet,Collab\nProject 1,Artist Name';
    const result = parseExcelData(csvData);

    expect(result[0].collab).toBe('Artist Name');
  });

  it('should parse label fields', () => {
    const csvData = 'Nom Projet,Label,Label Final\nProject 1,Label1,Label2';
    const result = parseExcelData(csvData);

    expect(result[0].label).toBe('Label1');
    expect(result[0].labelFinal).toBe('Label2');
  });

  it('should parse external link', () => {
    const csvData = 'Nom Projet,Lien\nProject 1,https://example.com';
    const result = parseExcelData(csvData);

    expect(result[0].externalLink).toBe('https://example.com');
  });

  it('should handle CSV with quotes', () => {
    const csvData = 'Nom Projet,Style\n"Project 1","Electronic Style"';
    const result = parseExcelData(csvData);

    expect(result[0].name).toBe('Project 1');
    expect(result[0].style).toBe('Electronic Style');
  });

  it('should validate rows and add errors', () => {
    const csvData = 'Nom Projet,Statut\n,INVALID_STATUS';
    const result = parseExcelData(csvData);

    expect(result[0].errors).toBeDefined();
    expect(result[0].errors?.length).toBeGreaterThan(0);
  });

  it('should handle multiple rows', () => {
    const csvData = 'Nom Projet\nProject 1\nProject 2\nProject 3';
    const result = parseExcelData(csvData);

    expect(result.length).toBe(3);
    expect(result[0].name).toBe('Project 1');
    expect(result[1].name).toBe('Project 2');
    expect(result[2].name).toBe('Project 3');
  });

  it('should include rowIndex in results', () => {
    const csvData = 'Nom Projet\nProject 1\nProject 2';
    const result = parseExcelData(csvData);

    expect(result[0].rowIndex).toBe(2); // 1-based, after header
    expect(result[1].rowIndex).toBe(3);
  });
});
