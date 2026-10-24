// Fonction pour formater en Title Case (même logique que dans parseExcelData)
export function formatTitleCase(text: string): string {
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

// Parser une ligne CSV en gérant les guillemets
export function parseCsvLine(line: string, separator: string): string[] {
  if (separator !== ',') {
    return line.split(separator).map((cell) => cell.trim());
  }

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
      cells.push(currentCell.trim()); // les guillemets d'encadrement sont déjà consommés ci-dessus
      currentCell = '';
    } else {
      currentCell += char;
    }
  }

  // Ajouter la dernière cellule
  cells.push(currentCell.trim()); // les guillemets d'encadrement sont déjà consommés ci-dessus

  return cells;
}

// Calculer les largeurs de colonnes pour l'alignement
export function calculateColumnWidths(text: string, separator: string): number[] {
  const lines = text.split('\n').filter((line) => line.trim());
  if (lines.length === 0) return [];

  const numColumns = Math.max(...lines.map((line) => parseCsvLine(line, separator).length));
  const widths: number[] = new Array(numColumns).fill(0);

  lines.forEach((line) => {
    const cells = parseCsvLine(line, separator);
    cells.forEach((cell, index) => {
      const trimmed = cell.trim();
      if (trimmed.length > widths[index]) {
        widths[index] = trimmed.length;
      }
    });
  });

  // Ajouter un peu de padding
  return widths.map((w) => Math.min(w + 3, 50)); // Max 50 caractères par colonne
}
