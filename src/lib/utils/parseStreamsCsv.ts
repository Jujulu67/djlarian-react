/**
 * Parser pour les fichiers CSV de streams
 * Format attendu: date,streams
 */

export interface StreamsCsvData {
  fileName: string;
  projectName: string;
  streams: Array<{
    date: string; // Format YYYY-MM-DD
    streams: number;
  }>;
  errors?: string[];
}

/**
 * Extrait le nom du projet depuis le nom de fichier
 * Ex: "Magnetized-timeline.csv" -> "Magnetized"
 * Ex: "I Lied-timeline (1).csv" -> "I Lied"
 */
export function extractProjectNameFromFileName(fileName: string): string {
  // Retirer l'extension
  let nameWithoutExt = fileName.replace(/\.(csv|CSV)$/, '');

  // Retirer les numéros entre parenthèses à la fin (ex: " (1)", " (2)")
  nameWithoutExt = nameWithoutExt.replace(/\s*\(\d+\)\s*$/, '');

  // Retirer les suffixes communs (-timeline, -streams, etc.)
  const cleaned = nameWithoutExt
    .replace(/-timeline$/i, '')
    .replace(/-streams?$/i, '')
    .replace(/-data$/i, '')
    .trim();

  return cleaned || nameWithoutExt;
}

/**
 * Parse un fichier CSV de streams
 */
export function parseStreamsCsv(fileContent: string, fileName: string): StreamsCsvData {
  const errors: string[] = [];
  const streams: Array<{ date: string; streams: number }> = [];

  const lines = fileContent
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length === 0) {
    errors.push('Le fichier CSV est vide');
    return {
      fileName,
      projectName: extractProjectNameFromFileName(fileName),
      streams: [],
      errors,
    };
  }

  // Détecter si la première ligne est un en-tête
  const firstLine = lines[0].toLowerCase();
  const hasHeader = firstLine.includes('date') && firstLine.includes('stream');
  const startIndex = hasHeader ? 1 : 0;

  // Parser les lignes de données
  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i];
    const parts = line.split(',').map((part) => part.trim());

    if (parts.length < 2) {
      errors.push(`Ligne ${i + 1}: Format invalide (attendu: date,streams)`);
      continue;
    }

    const [dateStr, streamsStr] = parts;

    // Parser la date
    let date: string | null = null;

    // Format ISO (YYYY-MM-DD)
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      date = dateStr;
    } else {
      // Essayer de parser d'autres formats
      const parsedDate = new Date(dateStr);
      if (!isNaN(parsedDate.getTime())) {
        const year = parsedDate.getFullYear();
        const month = String(parsedDate.getMonth() + 1).padStart(2, '0');
        const day = String(parsedDate.getDate()).padStart(2, '0');
        date = `${year}-${month}-${day}`;
      }
    }

    if (!date) {
      errors.push(`Ligne ${i + 1}: Date invalide "${dateStr}"`);
      continue;
    }

    // Parser les streams
    const streamsValue = parseFloat(streamsStr.replace(/[^\d.-]/g, ''));
    if (isNaN(streamsValue)) {
      errors.push(`Ligne ${i + 1}: Nombre de streams invalide "${streamsStr}"`);
      continue;
    }

    streams.push({
      date,
      streams: Math.floor(streamsValue),
    });
  }

  // Trier par date
  streams.sort((a, b) => a.date.localeCompare(b.date));

  return {
    fileName,
    projectName: extractProjectNameFromFileName(fileName),
    streams,
    errors: errors.length > 0 ? errors : undefined,
  };
}
