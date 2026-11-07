import type { ProjectStatus } from '@/lib/domain/projects';
import { PROJECT_STATUSES } from '@/lib/domain/projects';

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
    song: 'name', // CSV Spotify
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
    release_date: 'releaseDate', // CSV Spotify
    'release date': 'releaseDate', // CSV Spotify (avec espace)
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
 * Parse une ligne CSV en gérant les guillemets
 * @param line - Ligne à parser
 * @param separator - Séparateur utilisé
 * @returns Tableau de cellules
 */
function parseCsvLine(line: string, separator: string): string[] {
  const cells: string[] = [];
  let currentCell = '';
  let insideQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        // Guillemet échappé (double guillemet)
        currentCell += '"';
        i++; // Skip le prochain guillemet
      } else {
        // Toggle insideQuotes
        insideQuotes = !insideQuotes;
      }
    } else if (char === separator && !insideQuotes) {
      // Fin de cellule
      cells.push(currentCell.trim().replace(/^"|"$/g, '')); // Retirer les guillemets de début/fin
      currentCell = '';
    } else {
      currentCell += char;
    }
  }

  // Ajouter la dernière cellule
  cells.push(currentCell.trim().replace(/^"|"$/g, '')); // Retirer les guillemets de début/fin

  return cells;
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
    const frMatch = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/.exec(trimmed);
    if (frMatch) {
      const [, day, month, year] = frMatch;
      const date = new Date(
        Number.parseInt(year),
        Number.parseInt(month) - 1,
        Number.parseInt(day)
      );
      if (
        !Number.isNaN(date.getTime()) &&
        date.getDate() === Number.parseInt(day) &&
        date.getMonth() === Number.parseInt(month) - 1
      ) {
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      }
    }
  } else {
    // Format anglais : MM/DD/YYYY ou MM-DD-YYYY
    const enMatch = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/.exec(trimmed);
    if (enMatch) {
      const [, month, day, year] = enMatch;
      const date = new Date(
        Number.parseInt(year),
        Number.parseInt(month) - 1,
        Number.parseInt(day)
      );
      if (
        !Number.isNaN(date.getTime()) &&
        date.getDate() === Number.parseInt(day) &&
        date.getMonth() === Number.parseInt(month) - 1
      ) {
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      }
    }
  }

  // Essayer de parser avec Date (fallback)
  const date = new Date(trimmed);
  if (!Number.isNaN(date.getTime())) {
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
  const num = Number.parseFloat(cleaned);

  return Number.isNaN(num) ? null : Math.floor(num); // Arrondir à l'entier
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
    if (
      value !== undefined &&
      value !== null &&
      (typeof value !== 'number' || Number.isNaN(value))
    ) {
      errors.push(`${field} doit être un nombre valide`);
    }
  }

  return errors;
}

type ColumnMap = Map<number, keyof ParsedProjectRow>;

const TITLE_CASE_FIELDS = new Set<keyof ParsedProjectRow>([
  'name',
  'style',
  'collab',
  'label',
  'labelFinal',
]);
const NUMBER_FIELDS = new Set<keyof ParsedProjectRow>([
  'streamsJ7',
  'streamsJ14',
  'streamsJ21',
  'streamsJ28',
  'streamsJ56',
  'streamsJ84',
]);
/** Ordre des colonnes quand le texte n'a pas d'en-têtes. */
const DEFAULT_COLUMNS: ColumnMap = new Map(
  (
    [
      'name',
      'style',
      'status',
      'collab',
      'label',
      'labelFinal',
      'releaseDate',
      'externalLink',
      'streamsJ7',
      'streamsJ14',
      'streamsJ21',
      'streamsJ28',
      'streamsJ56',
      'streamsJ84',
    ] as (keyof ParsedProjectRow)[]
  ).map((field, index) => [index, field])
);

function splitLine(line: string, separator: string): string[] {
  return separator === ','
    ? parseCsvLine(line, separator)
    : line.split(separator).map((cell) => cell.trim());
}

function parseHeaderMap(headerLine: string, separator: string): ColumnMap {
  const columns: ColumnMap = new Map();
  splitLine(headerLine, separator).forEach((header, index) => {
    const field = findMappedField(header);
    if (field) columns.set(index, field);
  });
  return columns;
}

/** Convertit une cellule selon le type de son champ ; une cellule vide ne change rien. */
function assignCell(
  row: ParsedProjectRow,
  field: keyof ParsedProjectRow,
  value: string,
  dateFormat: 'fr' | 'en'
): void {
  if (!value) return;
  const target = row as unknown as Record<string, unknown>;
  if (TITLE_CASE_FIELDS.has(field)) target[field] = formatTitleCase(value);
  else if (NUMBER_FIELDS.has(field)) target[field] = parseNumber(value) ?? undefined;
  else if (field === 'status') target[field] = parseStatus(value) || undefined;
  else if (field === 'releaseDate') target[field] = parseDate(value, dateFormat) || undefined;
  else if (field === 'externalLink') target[field] = value;
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
  const headerMap = hasHeaders ? parseHeaderMap(lines[0], separator) : DEFAULT_COLUMNS;

  const rows: ParsedProjectRow[] = [];
  for (let i = hasHeaders ? 1 : 0; i < lines.length; i++) {
    const cells = splitLine(lines[i], separator);
    // Index 1-based pour l'affichage
    const row: ParsedProjectRow = { name: '', rowIndex: i + 1 };
    headerMap.forEach((field, columnIndex) => {
      assignCell(row, field, cells[columnIndex] || '', dateFormat);
    });

    const errors = validateRow(row, i);
    if (errors.length > 0) {
      row.errors = errors;
    }
    rows.push(row);
  }
  return rows;
}
