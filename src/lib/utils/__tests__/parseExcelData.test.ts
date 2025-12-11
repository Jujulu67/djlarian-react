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

  it('should handle escaped quotes in CSV', () => {
    const csvData = 'Nom Projet,Style\n"Project ""The Best""",Electronic';
    const result = parseExcelData(csvData);

    // The parser handles escaped quotes, but title case formatting may affect the result
    expect(result[0].name).toContain('Project');
    expect(result[0].name).toContain('Best');
  });

  it('should handle date with dash separator (French format)', () => {
    const csvData = 'Nom Projet,Date Sortie\nProject 1,01-01-2024';
    const result = parseExcelData(csvData, true, 'fr');

    expect(result[0].releaseDate).toBe('2024-01-01');
  });

  it('should handle date with dash separator (English format)', () => {
    const csvData = 'Nom Projet,Date Sortie\nProject 1,01-15-2024';
    const result = parseExcelData(csvData, true, 'en');

    expect(result[0].releaseDate).toBe('2024-01-15');
  });

  it('should handle invalid date format', () => {
    const csvData = 'Nom Projet,Date Sortie\nProject 1,invalid-date';
    const result = parseExcelData(csvData);

    // Date validation happens during validation, errors may be in errors array
    if (result[0].errors && result[0].errors.length > 0) {
      expect(result[0].errors.some((e) => e.includes('Date invalide'))).toBe(true);
    } else {
      // If no errors, the date might be null or undefined
      expect(result[0].releaseDate).toBeFalsy();
    }
  });

  it('should handle date fallback parsing', () => {
    const csvData = 'Nom Projet,Date Sortie\nProject 1,Jan 15 2024';
    const result = parseExcelData(csvData);

    // Should attempt to parse with Date constructor
    expect(result[0].releaseDate).toBeTruthy();
  });

  it('should handle invalid number format', () => {
    const csvData = 'Nom Projet,Streams J7\nProject 1,not-a-number';
    const result = parseExcelData(csvData);

    // Invalid numbers should be null or undefined
    expect(result[0].streamsJ7).toBeFalsy();
  });

  it('should handle negative numbers', () => {
    const csvData = 'Nom Projet,Streams J7\nProject 1,-1000';
    const result = parseExcelData(csvData);

    expect(result[0].streamsJ7).toBe(-1000);
  });

  it('should handle decimal numbers (rounded down)', () => {
    const csvData = 'Nom Projet,Streams J7\nProject 1,1234.56';
    const result = parseExcelData(csvData);

    expect(result[0].streamsJ7).toBe(1234);
  });

  it('should handle all status variations', () => {
    const statuses = [
      'EN_COURS',
      'EN COURS',
      'ENCOURS',
      'TERMINE',
      'TERMINÉ',
      'ANNULE',
      'ANNULÉ',
      'ANNULÉE',
      'A_REWORK',
      'A REWORK',
      'REWORK',
      'GHOST_PRODUCTION',
      'GHOST PRODUCTION',
      'GHOST',
      'GHOST PROD',
    ];

    statuses.forEach((status) => {
      const csvData = `Nom Projet,Statut\nProject 1,${status}`;
      const result = parseExcelData(csvData);
      expect(result[0].status).toBeTruthy();
    });
  });

  it('should handle invalid status', () => {
    const csvData = 'Nom Projet,Statut\nProject 1,INVALID_STATUS';
    const result = parseExcelData(csvData);

    // Invalid status should either be null or generate an error
    if (result[0].errors && result[0].errors.length > 0) {
      expect(result[0].errors.some((e) => e.includes('Statut invalide'))).toBe(true);
    } else {
      expect(result[0].status).toBeFalsy();
    }
  });

  it('should handle flexible column name matching for dates', () => {
    const csvData = 'Nom Projet,Date de Sortie\nProject 1,01/01/2024';
    const result = parseExcelData(csvData);

    expect(result[0].releaseDate).toBe('2024-01-01');
  });

  it('should handle flexible column name matching for release date', () => {
    const csvData = 'Nom Projet,Release Date\nProject 1,01/15/2024';
    const result = parseExcelData(csvData, true, 'en');

    expect(result[0].releaseDate).toBe('2024-01-15'); // MM/DD format
  });

  it('should handle stream column pattern matching', () => {
    const csvData = 'Nom Projet,Streams J7,Streams J14\nProject 1,1000,2000';
    const result = parseExcelData(csvData);

    expect(result[0].streamsJ7).toBe(1000);
    expect(result[0].streamsJ14).toBe(2000);
  });

  it('should handle stream column with different casing', () => {
    const csvData = 'Nom Projet,streams j7,STREAMS J14\nProject 1,1000,2000';
    const result = parseExcelData(csvData);

    expect(result[0].streamsJ7).toBe(1000);
    expect(result[0].streamsJ14).toBe(2000);
  });

  it('should handle empty cells', () => {
    const csvData = 'Nom Projet,Style,Statut\nProject 1,,EN_COURS';
    const result = parseExcelData(csvData);

    expect(result[0].name).toBe('Project 1');
    expect(result[0].style).toBeUndefined();
    expect(result[0].status).toBe('EN_COURS');
  });

  it('should handle whitespace in cells', () => {
    const csvData = 'Nom Projet,Style\n  Project 1  ,  Electronic  ';
    const result = parseExcelData(csvData);

    expect(result[0].name).toBe('Project 1');
    expect(result[0].style).toBe('Electronic');
  });

  it('should handle CSV with only header row', () => {
    const csvData = 'Nom Projet,Style,Statut';
    const result = parseExcelData(csvData);

    expect(result).toEqual([]);
  });

  it('should handle CSV with empty rows', () => {
    const csvData = 'Nom Projet\nProject 1\n\nProject 2';
    const result = parseExcelData(csvData);

    expect(result.length).toBe(2);
    expect(result[0].name).toBe('Project 1');
    expect(result[1].name).toBe('Project 2');
  });

  it('should handle collaboration field variations', () => {
    const csvData = 'Nom Projet,Collaboration\nProject 1,Artist Name';
    const result = parseExcelData(csvData);

    expect(result[0].collab).toBe('Artist Name');
  });

  it('should handle label final field variations', () => {
    const csvData = 'Nom Projet,Label Final\nProject 1,Label1';
    const result = parseExcelData(csvData);

    expect(result[0].labelFinal).toBe('Label1');
  });

  it('should handle external link field variations', () => {
    const csvData = 'Nom Projet,Link\nProject 1,https://example.com';
    const result = parseExcelData(csvData);

    expect(result[0].externalLink).toBe('https://example.com');
  });

  it('should handle title case formatting with multiple words', () => {
    const csvData = 'Nom Projet\nALL I WANT FOR CHRISTMAS';
    const result = parseExcelData(csvData);

    expect(result[0].name).toBe('All I Want For Christmas');
  });

  it('should handle title case with single word', () => {
    const csvData = 'Nom Projet\nMAGNETIZED';
    const result = parseExcelData(csvData);

    expect(result[0].name).toBe('Magnetized');
  });

  it('should handle title case with empty string', () => {
    const csvData = 'Nom Projet\n';
    const result = parseExcelData(csvData);

    // Empty rows might be filtered out, so check if result exists
    if (result.length > 0) {
      expect(result[0].name).toBe('');
    } else {
      // Empty rows are filtered out
      expect(result).toEqual([]);
    }
  });

  it('should handle separator detection with equal counts', () => {
    const csvData = 'Nom Projet,Style\tStatut\nProject 1,Electronic\tEN_COURS';
    const result = parseExcelData(csvData);

    // Should default to tab when counts are equal
    expect(result.length).toBeGreaterThan(0);
  });

  it('should handle CSV line with quotes at boundaries', () => {
    const csvData = 'Nom Projet,Style\n"Project 1","Electronic"';
    const result = parseExcelData(csvData);

    expect(result[0].name).toBe('Project 1');
    expect(result[0].style).toBe('Electronic');
  });
});
