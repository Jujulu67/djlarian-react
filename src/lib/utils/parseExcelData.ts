import { ProjectStatus, PROJECT_STATUSES } from '@/components/projects/types';

export interface ParsedProjectRow {
  name: string;
  style?: string;
  status?: ProjectStatus;
  collab?: string;
  label?: string;
  labelFinal?: string;
  releaseDate?: string;
  externalLink?: string;
  streamsJ7?: number;
  streamsJ14?: number;
  streamsJ21?: number;
  streamsJ28?: number;
  streamsJ56?: number;
  streamsJ84?: number;
  errors?: string[]; // Erreurs de validation
  rowIndex?: number; // Index de la ligne originale
}

/**
 * Trouve le champ correspondant à une colonne en utilisant un matching flexible
 */
function findMappedField(columnName: string): keyof ParsedProjectRow | null {
  const normalized = normalizeColumnName(columnName);

  // Mapping exact
  const exactMapping: Record<string, keyof ParsedProjectRow> = {
    'nom projet': 'name',
    nom: 'name',
    name: 'name',
    style: 'style',
    statut: 'status',
    status: 'status',
    collab: 'collab',
    collaboration: 'collab',
    label: 'label',
    'label final': 'labelFinal',
    labelfinal: 'labelFinal',
    labelFinal: 'labelFinal',
    'date sortie': 'releaseDate',
    datesortie: 'releaseDate',
    releaseDate: 'releaseDate',
    date: 'releaseDate',
    lien: 'externalLink',
    link: 'externalLink',
    externalLink: 'externalLink',
  };

  // Vérifier le mapping exact d'abord
  if (exactMapping[normalized]) {
    return exactMapping[normalized];
  }

  // Matching flexible pour les dates
  if (
    normalized.includes('date') &&
    (normalized.includes('sortie') || normalized.includes('release'))
  ) {
    return 'releaseDate';
  }

  // Matching flexible pour les streams (détecte "J7", "J14", etc. dans le nom)
  const streamPatterns = [
    { pattern: /j7|streams?\s*j7/i, field: 'streamsJ7' as keyof ParsedProjectRow },
    { pattern: /j14|streams?\s*j14/i, field: 'streamsJ14' as keyof ParsedProjectRow },
    { pattern: /j21|streams?\s*j21/i, field: 'streamsJ21' as keyof ParsedProjectRow },
    { pattern: /j28|streams?\s*j28/i, field: 'streamsJ28' as keyof ParsedProjectRow },
    { pattern: /j56|streams?\s*j56/i, field: 'streamsJ56' as keyof ParsedProjectRow },
    { pattern: /j84|streams?\s*j84/i, field: 'streamsJ84' as keyof ParsedProjectRow },
  ];

  for (const { pattern, field } of streamPatterns) {
    if (pattern.test(columnName)) {
      return field;
    }
  }

  return null;
}

/**
 * Détecte le séparateur utilisé (tabulation ou virgule)
 */
function detectSeparator(text: string): string {
  const lines = text.split('\n').filter((line) => line.trim());
  if (lines.length === 0) return '\t';

  // Compter les occurrences de tabulations et virgules dans la première ligne
  const firstLine = lines[0];
  const tabCount = (firstLine.match(/\t/g) || []).length;
  const commaCount = (firstLine.match(/,/g) || []).length;

  // Si plus de tabulations, utiliser tabulation, sinon virgule
  return tabCount >= commaCount ? '\t' : ',';
}

/**
 * Normalise le nom de colonne pour le mapping
 */
function normalizeColumnName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Formate un texte en Title Case (première lettre de chaque mot en majuscule, reste en minuscule)
 * Exemples: "Dont Go", "Magnetized", "All I Want For Christmas"
 */
function formatTitleCase(text: string): string {
  if (!text || text.trim() === '') return text;

  return text
    .trim()
    .split(/\s+/)
    .map((word) => {
      if (word.length === 0) return word;
      // Première lettre en majuscule, reste en minuscule
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}

/**
 * Parse une valeur de date (supporte plusieurs formats)
 * @param value - Valeur à parser
 * @param dateFormat - Format de date: 'fr' (DD/MM/YYYY) ou 'en' (MM/DD/YYYY)
 */
function parseDate(value: string, dateFormat: 'fr' | 'en' = 'fr'): string | null {
  if (!value || value.trim() === '') return null;

  const trimmed = value.trim();

  // Si c'est déjà au format ISO (YYYY-MM-DD)
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  // Parser selon le format spécifié
  if (dateFormat === 'fr') {
    // Format français : DD/MM/YYYY ou DD-MM-YYYY
    const frMatch = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (frMatch) {
      const [, day, month, year] = frMatch;
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      if (
        !isNaN(date.getTime()) &&
        date.getDate() === parseInt(day) &&
        date.getMonth() === parseInt(month) - 1
      ) {
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      }
    }
  } else {
    // Format anglais : MM/DD/YYYY ou MM-DD-YYYY
    const enMatch = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (enMatch) {
      const [, month, day, year] = enMatch;
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      if (
        !isNaN(date.getTime()) &&
        date.getDate() === parseInt(day) &&
        date.getMonth() === parseInt(month) - 1
      ) {
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      }
    }
  }

  // Essayer de parser avec Date (fallback)
  const date = new Date(trimmed);
  if (!isNaN(date.getTime())) {
    // Formater en YYYY-MM-DD
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  return null;
}

/**
 * Parse une valeur numérique
 */
function parseNumber(value: string): number | null {
  if (!value || value.trim() === '') return null;

  // Retirer les espaces et caractères non numériques (sauf le signe moins et le point)
  const cleaned = value.trim().replace(/[^\d.-]/g, '');
  const num = parseFloat(cleaned);

  return isNaN(num) ? null : Math.floor(num); // Arrondir à l'entier
}

/**
 * Valide et transforme un statut
 */
function parseStatus(value: string): ProjectStatus | null {
  if (!value || value.trim() === '') return null;

  const normalized = value.trim().toUpperCase();

  // Mapping des valeurs courantes
  const statusMap: Record<string, ProjectStatus> = {
    EN_COURS: 'EN_COURS',
    'EN COURS': 'EN_COURS',
    ENCOURS: 'EN_COURS',
    TERMINE: 'TERMINE',
    TERMINÉ: 'TERMINE',
    ANNULE: 'ANNULE',
    ANNULÉ: 'ANNULE',
    ANNULÉE: 'ANNULE',
    A_REWORK: 'A_REWORK',
    'A REWORK': 'A_REWORK',
    REWORK: 'A_REWORK',
    GHOST_PRODUCTION: 'GHOST_PRODUCTION',
    'GHOST PRODUCTION': 'GHOST_PRODUCTION',
    GHOST: 'GHOST_PRODUCTION',
    'GHOST PROD': 'GHOST_PRODUCTION',
  };

  return statusMap[normalized] || null;
}

/**
 * Valide une ligne parsée
 */
function validateRow(row: ParsedProjectRow, _rowIndex: number): string[] {
  const errors: string[] = [];

  if (!row.name || row.name.trim() === '') {
    errors.push('Le nom du projet est requis');
  }

  if (row.status && !PROJECT_STATUSES.find((s) => s.value === row.status)) {
    errors.push(
      `Statut invalide: ${row.status}. Valeurs acceptées: ${PROJECT_STATUSES.map((s) => s.label).join(', ')}`
    );
  }

  // Note: La validation de date se fait avec le format par défaut 'fr'
  // car on ne connaît pas le format utilisé lors de la validation
  if (row.releaseDate) {
    const date = parseDate(row.releaseDate, 'fr') || parseDate(row.releaseDate, 'en');
    if (!date) {
      errors.push(`Date invalide: ${row.releaseDate}`);
    }
  }

  // Valider les nombres de streams
  const streamFields: (keyof ParsedProjectRow)[] = [
    'streamsJ7',
    'streamsJ14',
    'streamsJ21',
    'streamsJ28',
    'streamsJ56',
    'streamsJ84',
  ];

  for (const field of streamFields) {
    const value = row[field];
    if (value !== undefined && value !== null && (typeof value !== 'number' || isNaN(value))) {
      errors.push(`${field} doit être un nombre valide`);
    }
  }

  return errors;
}

/**
 * Parse les données collées depuis Excel
 * @param text - Texte collé depuis Excel
 * @param hasHeaders - Indique si la première ligne contient les en-têtes
 * @param dateFormat - Format de date: 'fr' (DD/MM/YYYY) ou 'en' (MM/DD/YYYY)
 * @returns Tableau de lignes parsées avec validation
 */
export function parseExcelData(
  text: string,
  hasHeaders: boolean = true,
  dateFormat: 'fr' | 'en' = 'fr'
): ParsedProjectRow[] {
  if (!text || text.trim() === '') {
    return [];
  }

  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length === 0) {
    return [];
  }

  const separator = detectSeparator(text);
  const rows: ParsedProjectRow[] = [];

  // Si on a des en-têtes, les parser pour déterminer l'ordre des colonnes
  let headerMap: Map<number, keyof ParsedProjectRow> | null = null;
  let startIndex = 0;

  if (hasHeaders && lines.length > 0) {
    const headerLine = lines[0];
    const headerCells = headerLine.split(separator).map((cell) => cell.trim());

    headerMap = new Map();
    headerCells.forEach((header, index) => {
      const field = findMappedField(header);
      if (field) {
        headerMap!.set(index, field);
      }
    });

    startIndex = 1; // Commencer après les en-têtes
  }

  // Parser les lignes de données
  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i];
    const cells = line.split(separator).map((cell) => cell.trim());

    const row: ParsedProjectRow = {
      name: '',
      rowIndex: i + 1, // Index 1-based pour l'affichage
    };

    // Si on a un mapping d'en-têtes, utiliser l'ordre des colonnes
    if (headerMap) {
      headerMap.forEach((field, columnIndex) => {
        const value = cells[columnIndex] || '';
        if (value) {
          switch (field) {
            case 'name':
              row.name = formatTitleCase(value);
              break;
            case 'style':
              row.style = value ? formatTitleCase(value) : undefined;
              break;
            case 'status':
              row.status = parseStatus(value) || undefined;
              break;
            case 'collab':
              row.collab = value ? formatTitleCase(value) : undefined;
              break;
            case 'label':
              row.label = value ? formatTitleCase(value) : undefined;
              break;
            case 'labelFinal':
              row.labelFinal = value ? formatTitleCase(value) : undefined;
              break;
            case 'releaseDate':
              row.releaseDate = parseDate(value, dateFormat) || undefined;
              break;
            case 'externalLink':
              row.externalLink = value || undefined;
              break;
            case 'streamsJ7':
              row.streamsJ7 = parseNumber(value) ?? undefined;
              break;
            case 'streamsJ14':
              row.streamsJ14 = parseNumber(value) ?? undefined;
              break;
            case 'streamsJ21':
              row.streamsJ21 = parseNumber(value) ?? undefined;
              break;
            case 'streamsJ28':
              row.streamsJ28 = parseNumber(value) ?? undefined;
              break;
            case 'streamsJ56':
              row.streamsJ56 = parseNumber(value) ?? undefined;
              break;
            case 'streamsJ84':
              row.streamsJ84 = parseNumber(value) ?? undefined;
              break;
          }
        }
      });
    } else {
      // Pas d'en-têtes : utiliser l'ordre par défaut des colonnes
      // Ordre attendu : Nom, Style, Statut, Collab, Label, Label Final, Date Sortie, Lien, J7, J14, J21, J28, J56, J84
      if (cells[0]) row.name = formatTitleCase(cells[0]);
      if (cells[1]) row.style = formatTitleCase(cells[1]);
      if (cells[2]) row.status = parseStatus(cells[2]) || undefined;
      if (cells[3]) row.collab = formatTitleCase(cells[3]);
      if (cells[4]) row.label = formatTitleCase(cells[4]);
      if (cells[5]) row.labelFinal = formatTitleCase(cells[5]);
      if (cells[6]) row.releaseDate = parseDate(cells[6], dateFormat) || undefined;
      if (cells[7]) row.externalLink = cells[7];
      if (cells[8]) row.streamsJ7 = parseNumber(cells[8]) ?? undefined;
      if (cells[9]) row.streamsJ14 = parseNumber(cells[9]) ?? undefined;
      if (cells[10]) row.streamsJ21 = parseNumber(cells[10]) ?? undefined;
      if (cells[11]) row.streamsJ28 = parseNumber(cells[11]) ?? undefined;
      if (cells[12]) row.streamsJ56 = parseNumber(cells[12]) ?? undefined;
      if (cells[13]) row.streamsJ84 = parseNumber(cells[13]) ?? undefined;
    }

    // Valider la ligne
    const errors = validateRow(row, i);
    if (errors.length > 0) {
      row.errors = errors;
    }

    rows.push(row);
  }

  return rows;
}
